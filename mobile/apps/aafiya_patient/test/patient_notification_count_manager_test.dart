// ignore_for_file: depend_on_referenced_packages

import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_patient/state/patient_notification_count_manager.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testPatientUserA = User(
    id: 'patient-user-A',
    name: 'أحمد محمود',
    email: 'ahmed@aafiya.test',
    phone: '+213555112233',
    roles: [UserRole.patientRegistered],
  );

  const testPatientUserB = User(
    id: 'patient-user-B',
    name: 'سمير خليل',
    email: 'samir@aafiya.test',
    phone: '+213555445566',
    roles: [UserRole.patientRegistered],
  );

  group('PatientNotificationCountManager Tests', () {
    test(
        '1. In-flight refresh race: stale in-flight refresh completing after markAcknowledged does NOT resurrect notification',
        () async {
      final refreshCompleter =
          Completer<http.Response>();

      final client = MockClient((request) async {
        if (request.method == 'GET' &&
            request.url.path.contains('/patient/notifications')) {
          return refreshCompleter.future;
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token-A'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        user: testPatientUserA,
        token: 'valid-patient-token-A',
      );

      final service = PatientNotificationService(apiClient: apiClient);
      final manager = PatientNotificationCountManager(
        sessionManager: sessionManager,
        service: service,
      );

      // Start in-flight refresh (requestGen = 1)
      final refreshFuture = manager.refresh();
      expect(manager.isLoading, isTrue);

      // User acknowledges notif-101 while refresh is in flight
      manager.markAcknowledged('notif-101');
      expect(manager.unreadCount, 0);
      expect(manager.unacknowledgedIds, isEmpty);
      expect(manager.locallyAcknowledgedIds.contains('notif-101'), isTrue);

      // Now complete the stale refresh response where notif-101 was still unacknowledged
      refreshCompleter.complete(
        http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'notif-101',
                'created_at': '2026-10-23T08:00:00Z',
                'acknowledged_at': null,
                'template': 'vacation_reschedule_success',
                'payload': {'message': 'تمت إعادة جدولة موعدكم'},
              }
            ],
            'current_page': 1,
            'last_page': 1,
            'per_page': 20,
            'total': 1,
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );

      await refreshFuture;

      // Invalidation & tombstone guarantee: notif-101 was NOT resurrected
      expect(manager.unreadCount, 0);
      expect(manager.unacknowledgedIds, isEmpty);
      expect(manager.locallyAcknowledgedIds.contains('notif-101'), isTrue);

      manager.dispose();
      sessionManager.dispose();
    });

    test(
        '2. Tombstone defense: subsequent request returning stale unread data does NOT resurrect locally acknowledged item',
        () async {
      int requestCount = 0;
      final client = MockClient((request) async {
        requestCount++;
        // Always returns stale data where notif-101 is unacknowledged
        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'notif-101',
                'created_at': '2026-10-23T08:00:00Z',
                'acknowledged_at': null,
                'template': 'vacation_reschedule_success',
                'payload': {'message': 'تمت إعادة جدولة موعدكم'},
              }
            ],
            'current_page': 1,
            'last_page': 1,
            'per_page': 20,
            'total': 1,
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token-A'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        user: testPatientUserA,
        token: 'valid-patient-token-A',
      );

      final service = PatientNotificationService(apiClient: apiClient);
      final manager = PatientNotificationCountManager(
        sessionManager: sessionManager,
        service: service,
      );

      // Initial refresh loads notif-101 as unread
      await manager.refresh();
      expect(manager.unreadCount, 1);
      expect(manager.unacknowledgedIds.contains('notif-101'), isTrue);

      // User marks notif-101 acknowledged
      manager.markAcknowledged('notif-101');
      expect(manager.unreadCount, 0);
      expect(manager.unacknowledgedIds, isEmpty);

      // A NEW refresh starts and completes with stale data
      await manager.refresh();
      // 2 refreshes x 2 requests each (fetchUnreadCount attempt + fetchNotifications fallback) = 4
      expect(requestCount, 4);

      // Local tombstone prevents resurrecting notif-101
      expect(manager.unreadCount, 0);
      expect(manager.unacknowledgedIds, isEmpty);
      expect(manager.locallyAcknowledgedIds.contains('notif-101'), isTrue);

      manager.dispose();
      sessionManager.dispose();
    });

    test(
        '3. Server reconciliation: server confirmation of acknowledgment purges local tombstone',
        () async {
      bool serverAcknowledged = false;

      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'notif-101',
                'created_at': '2026-10-23T08:00:00Z',
                'acknowledged_at': serverAcknowledged
                    ? '2026-10-23T09:30:00Z'
                    : null,
                'template': 'vacation_reschedule_success',
                'payload': {'message': 'تمت إعادة جدولة موعدكم'},
              }
            ],
            'current_page': 1,
            'last_page': 1,
            'per_page': 20,
            'total': 1,
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token-A'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        user: testPatientUserA,
        token: 'valid-patient-token-A',
      );

      final service = PatientNotificationService(apiClient: apiClient);
      final manager = PatientNotificationCountManager(
        sessionManager: sessionManager,
        service: service,
      );

      // Initial load: 1 unread notification
      await manager.refresh();
      expect(manager.unreadCount, 1);

      // Mark acknowledged locally
      manager.markAcknowledged('notif-101');
      expect(manager.unreadCount, 0);
      expect(manager.locallyAcknowledgedIds.contains('notif-101'), isTrue);

      // Now server confirms acknowledgment
      serverAcknowledged = true;
      await manager.refresh();

      // Tombstone is purged because server confirmed acknowledgment
      expect(manager.unreadCount, 0);
      expect(manager.locallyAcknowledgedIds.contains('notif-101'), isFalse);

      manager.dispose();
      sessionManager.dispose();
    });

    test(
        '4. Account switch with same clinic ID: stale response from account A drops silently without mutating account B',
        () async {
      final userACompleter = Completer<http.Response>();

      final client = MockClient((request) async {
        final authHeader = request.headers['authorization'] ?? '';
        if (authHeader.contains('token-A')) {
          return userACompleter.future;
        } else if (authHeader.contains('token-B')) {
          // Account B has 0 unread notifications
          return http.Response(
            jsonEncode({
              'data': [],
              'current_page': 1,
              'last_page': 1,
              'per_page': 20,
              'total': 0,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Unauthorized', 401);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-A'),
        apiClient: apiClient,
      );

      // Account A logs in with active clinic 'clinic-alpha'
      await sessionManager.setAuthenticatedUser(
        user: testPatientUserA,
        token: 'token-A',
      );
      apiClient.setActiveClinicId('clinic-alpha');

      final service = PatientNotificationService(apiClient: apiClient);
      final manager = PatientNotificationCountManager(
        sessionManager: sessionManager,
        service: service,
      );

      // Account A triggers refresh (pending)
      final userAFuture = manager.refresh();
      expect(manager.isLoading, isTrue);

      // Account A logs out
      await sessionManager.logout();
      expect(manager.unreadCount, 0);
      expect(manager.unacknowledgedIds, isEmpty);

      // Account B logs in with the EXACT SAME clinic ID 'clinic-alpha'
      await sessionManager.setAuthenticatedUser(
        user: testPatientUserB,
        token: 'token-B',
      );
      apiClient.setActiveClinicId('clinic-alpha');

      // Now Account A's delayed response completes with 5 unread notifications
      userACompleter.complete(
        http.Response(
          jsonEncode({
            'data': List.generate(
              5,
              (i) => {
                'id': 'notif-user-A-$i',
                'created_at': '2026-10-23T08:00:00Z',
                'acknowledged_at': null,
                'template': 'appointment_cancelled',
                'payload': {'message': 'إشعار خاص بالمريض أ'},
              },
            ),
            'current_page': 1,
            'last_page': 1,
            'per_page': 20,
            'total': 5,
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );

      await userAFuture;

      // Stale response from A MUST NOT mutate B's state
      expect(manager.unreadCount, 0);
      expect(manager.unacknowledgedIds, isEmpty);

      // When Account B refreshes, B's true state (0) is maintained
      await manager.refresh();
      expect(manager.unreadCount, 0);
      expect(manager.unacknowledgedIds, isEmpty);

      manager.dispose();
      sessionManager.dispose();
    });

    test(
        '5. Queries /patient/notifications/unread-count directly in a single request and handles counts > 20 without truncation',
        () async {
      int endpointCalls = 0;
      String? requestedPath;

      final client = MockClient((request) async {
        endpointCalls++;
        requestedPath = request.url.path;
        if (request.url.path.contains('/patient/notifications/unread-count')) {
          return http.Response(
            jsonEncode({'unread_count': 45}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-patient'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        user: testPatientUserA,
        token: 'token-patient',
      );

      final service = PatientNotificationService(apiClient: apiClient);
      final manager = PatientNotificationCountManager(
        sessionManager: sessionManager,
        service: service,
      );

      // Refresh queries the dedicated unread count endpoint
      await manager.refresh();

      expect(endpointCalls, equals(1));
      expect(requestedPath, contains('/patient/notifications/unread-count'));
      // Verifies that count > 20 is fully preserved without truncation
      expect(manager.unreadCount, equals(45));

      // Local acknowledgment decrements count
      manager.markAcknowledged('notif-999');
      expect(manager.unreadCount, equals(44));
      expect(manager.locallyAcknowledgedIds.contains('notif-999'), isTrue);

      manager.dispose();
      sessionManager.dispose();
    });

    test(
        '6. Server reconciliation with authoritative count: server count reduction clears tombstones',
        () async {
      int currentServerCount = 5;

      final client = MockClient((request) async {
        if (request.url.path.contains('/patient/notifications/unread-count')) {
          return http.Response(
            jsonEncode({'unread_count': currentServerCount}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-patient'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        user: testPatientUserA,
        token: 'token-patient',
      );

      final service = PatientNotificationService(apiClient: apiClient);
      final manager = PatientNotificationCountManager(
        sessionManager: sessionManager,
        service: service,
      );

      // 1. Initial count is 5
      await manager.refresh();
      expect(manager.unreadCount, equals(5));

      // 2. User acknowledges 2 items locally
      manager.markAcknowledged('item-1');
      manager.markAcknowledged('item-2');
      expect(manager.unreadCount, equals(3));
      expect(manager.locallyAcknowledgedIds.length, equals(2));

      // 3. Server now reflects acknowledgment (count decreases to 3)
      currentServerCount = 3;
      await manager.refresh();

      // Local tombstones cleared because server count decreased to reflect acknowledgments
      expect(manager.unreadCount, equals(3));
      expect(manager.locallyAcknowledgedIds, isEmpty);

      // 4. Server returns 0: all cleared
      currentServerCount = 0;
      await manager.refresh();
      expect(manager.unreadCount, equals(0));
      expect(manager.locallyAcknowledgedIds, isEmpty);

      manager.dispose();
      sessionManager.dispose();
    });
  });
}

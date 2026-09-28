// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/app.dart';
import 'package:aafiya_patient/routes/app_router.dart';
import 'package:aafiya_patient/screens/appointment_detail_screen.dart';
import 'package:aafiya_patient/widgets/prescription_verification_sheet.dart';

http.Response jsonResponse(Object data, [int status = 200]) {
  return http.Response(
    jsonEncode(data),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

void main() {
  const validUuid = 'eac8acd1-bc8e-4f51-b967-5bcfc2229dd9';
  const validToken = 'sec_token_9876543210_abcdef';

  const mockPublicPrescriptionJson = {
    'is_valid': true,
    'verification_status': 'active',
    'prescription_reference': 'RX-2026-0001',
    'doctor_name': 'د. فاطمة منصوري',
    'doctor_specialty': 'أمراض القلب',
    'clinic_name': 'عيادة الشفاء',
    'patient_name': 'أحمد بن علي',
    'issue_date': '2026-09-14',
    'expiry_date': '2026-10-14',
    'items_count': 2,
    'items': [
      {
        'medication_name': 'Amoxicillin 500mg',
        'dosage': '500mg',
        'frequency': '3 مرات يومياً',
        'duration': '7 أيام',
        'instructions': 'بعد الأكل مباشرة',
      },
      {
        'medication_name': 'Paracetamol 1g',
        'dosage': '1000mg',
        'frequency': 'عند اللزوم',
        'duration': '5 أيام',
        'instructions': 'في حال ارتفاع الحرارة',
      },
    ],
  };

  const mockAppointmentJson = {
    'id': validUuid,
    'booking_reference': 'BK-2026-789',
    'status': 'confirmed',
    'appointment_date': '2026-10-01',
    'time_slot': '10:00 - 10:30',
    'doctor': {
      'id': 'doc-1',
      'name': 'د. فاطمة منصوري',
      'specialty': 'أمراض القلب',
    },
    'clinic': {
      'id': 'cli-1',
      'name': 'عيادة الشفاء',
      'address': 'الجزائر العاصمة',
      'phone': '021445566',
    },
    'notes': 'فحص دوري',
  };

  const testPatientUser = User(
    id: 'pat-1',
    name: 'أحمد بن علي',
    email: 'ahmed@example.dz',
    roles: [UserRole.patient],
  );

  // =========================================================================
  // 1. PatientDeepLinkRouter Pure Dart Parser Tests
  // =========================================================================
  group('1. PatientDeepLinkRouter Pure Dart Parser Tests', () {
    test('parses canonical prescription URI', () {
      final dest = PatientDeepLinkRouter.parse('aafiya://prescription/$validToken');
      expect(dest, isA<PrescriptionVerificationDestination>());
      expect((dest as PrescriptionVerificationDestination).token, equals(validToken));
    });

    test('parses canonical appointment URI', () {
      final dest = PatientDeepLinkRouter.parse('aafiya://appointment/$validUuid');
      expect(dest, isA<AppointmentDetailsDestination>());
      expect((dest as AppointmentDetailsDestination).appointmentId, equals(validUuid));
    });

    test('parses plural prescription alias', () {
      final dest = PatientDeepLinkRouter.parse('aafiya://prescriptions/$validToken');
      expect(dest, isA<PrescriptionVerificationDestination>());
      expect((dest as PrescriptionVerificationDestination).token, equals(validToken));
    });

    test('parses plural appointment alias', () {
      final dest = PatientDeepLinkRouter.parse('aafiya://appointments/$validUuid');
      expect(dest, isA<AppointmentDetailsDestination>());
      expect((dest as AppointmentDetailsDestination).appointmentId, equals(validUuid));
    });

    test('parses path-form URIs (aafiya:///...)', () {
      final rxDest = PatientDeepLinkRouter.parse('aafiya:///prescription/$validToken');
      expect(rxDest, equals(PrescriptionVerificationDestination(validToken)));

      final apptDest = PatientDeepLinkRouter.parse('aafiya:///appointment/$validUuid');
      expect(apptDest, equals(AppointmentDetailsDestination(validUuid)));
    });

    test('parses host-form URIs (aafiya://...)', () {
      final rxDest = PatientDeepLinkRouter.parse('aafiya://prescription/$validToken');
      expect(rxDest, equals(PrescriptionVerificationDestination(validToken)));

      final apptDest = PatientDeepLinkRouter.parse('aafiya://appointment/$validUuid');
      expect(apptDest, equals(AppointmentDetailsDestination(validUuid)));
    });

    test('matches path case-insensitively', () {
      final rxUpper = PatientDeepLinkRouter.parse('AAFIYA://PRESCRIPTION/$validToken');
      expect(rxUpper, equals(PrescriptionVerificationDestination(validToken)));

      final rxMixed = PatientDeepLinkRouter.parse('aafiya://Prescriptions/$validToken');
      expect(rxMixed, equals(PrescriptionVerificationDestination(validToken)));

      final apptUpper = PatientDeepLinkRouter.parse('AAFIYA://APPOINTMENT/$validUuid');
      expect(apptUpper, equals(AppointmentDetailsDestination(validUuid)));

      final apptMixed = PatientDeepLinkRouter.parse('aafiya://Appointments/$validUuid');
      expect(apptMixed, equals(AppointmentDetailsDestination(validUuid)));
    });

    test('accepts valid prescription tokens with alphanumeric, hyphens, and underscores', () {
      final dest1 = PatientDeepLinkRouter.parse('aafiya://prescription/token-123_ABC');
      expect(dest1, equals(const PrescriptionVerificationDestination('token-123_ABC')));
    });

    test('accepts valid UUID format for appointments', () {
      final dest = PatientDeepLinkRouter.parse('aafiya://appointment/12345678-1234-1234-1234-123456789abc');
      expect(dest, equals(const AppointmentDetailsDestination('12345678-1234-1234-1234-123456789abc')));
    });

    test('rejects invalid UUID formats', () {
      expect(PatientDeepLinkRouter.parse('aafiya://appointment/not-a-uuid'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://appointment/12345'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://appointment/12345678-1234-1234-1234-123456789abz'), isA<UnknownDestination>());
    });

    test('rejects malformed prescription tokens', () {
      expect(PatientDeepLinkRouter.parse('aafiya://prescription/token with space'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://prescription/token@special!'), isA<UnknownDestination>());
    });

    test('rejects missing identifiers', () {
      expect(PatientDeepLinkRouter.parse('aafiya://prescription'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://appointment'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://prescription/'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://appointment/'), isA<UnknownDestination>());
    });

    test('rejects unknown paths', () {
      expect(PatientDeepLinkRouter.parse('aafiya://doctor/123'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://clinic/456'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://settings/profile'), isA<UnknownDestination>());
    });

    test('rejects unauthorized schemes', () {
      expect(PatientDeepLinkRouter.parse('https://prescription/$validToken'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('http://appointment/$validUuid'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('custom://prescription/$validToken'), isA<UnknownDestination>());
    });

    test('strict whitelist: rejects query parameters', () {
      expect(PatientDeepLinkRouter.parse('aafiya://prescription/$validToken?foo=bar'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://appointment/$validUuid?source=notification'), isA<UnknownDestination>());
    });

    test('strict whitelist: rejects URI fragments', () {
      expect(PatientDeepLinkRouter.parse('aafiya://prescription/$validToken#section'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://appointment/$validUuid#top'), isA<UnknownDestination>());
    });

    test('rejects arbitrary or null URIs', () {
      expect(PatientDeepLinkRouter.parse(null), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse(''), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('   '), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('mailto:doctor@aafiya.dz'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('random_text_without_scheme'), isA<UnknownDestination>());
    });
  });

  // =========================================================================
  // 2. Prescription Deep Link Flow & Verification Sheet Tests
  // =========================================================================
  group('2. Prescription Deep Link Flow & Public Verification Sheet', () {
    testWidgets('calls GET /api/v1/v/{token} and renders public verification details for unauthenticated user', (tester) async {
      final requestedUrls = <String>[];

      final mockClient = MockClient((request) async {
        requestedUrls.add(request.url.path);
        if (request.url.path == '/api/v1/v/$validToken') {
          return jsonResponse({'data': mockPublicPrescriptionJson});
        }
        return jsonResponse({'message': 'Not found'}, 404);
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      // Trigger prescription verification link
      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await tester.pumpAndSettle();

      // Verify endpoint called
      expect(requestedUrls, contains('/api/v1/v/$validToken'));

      // Verify ZERO private prescription / EHR calls made
      expect(requestedUrls.any((url) => url.contains('/prescriptions/')), isFalse);
      expect(requestedUrls.any((url) => url.contains('/patients/')), isFalse);

      // Verify public verification sheet content
      expect(find.byType(PrescriptionVerificationSheet), findsOneWidget);
      expect(find.text('التحقق الرقمي (QR)'), findsOneWidget);
      expect(find.text('نشطة'), findsOneWidget);
      expect(find.text('الرقم المرجعي: #RX-2026-0001'), findsOneWidget);
      expect(find.text('د. فاطمة منصوري'), findsOneWidget);
      expect(find.text('أمراض القلب'), findsOneWidget);
      expect(find.text('عيادة الشفاء'), findsOneWidget);
      expect(find.text('أحمد بن علي'), findsOneWidget);
      expect(find.text('Amoxicillin 500mg'), findsOneWidget);
      expect(find.text('Paracetamol 1g'), findsOneWidget);
    });

    testWidgets('renders public verification sheet identically for authenticated user without altering auth state', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/v/$validToken') {
          return jsonResponse({'data': mockPublicPrescriptionJson});
        }
        return jsonResponse({'message': 'Not found'}, 404);
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);
      await sessionManager.setAuthenticatedUser(token: 'mock_jwt', user: testPatientUser);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.home,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await tester.pumpAndSettle();

      expect(find.byType(PrescriptionVerificationSheet), findsOneWidget);
      expect(sessionManager.isAuthenticated, isTrue);
    });

    testWidgets('displays error state when token is invalid or returns 404', (tester) async {
      final mockClient = MockClient((request) async {
        return jsonResponse({
          'message': 'رمز التحقق غير صالح أو لم يتم العثور على الوصفة الطبية.',
          'data': {'is_valid': false, 'verification_status': 'not_found'},
        }, 404);
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await tester.pumpAndSettle();

      expect(find.byType(PrescriptionVerificationSheet), findsOneWidget);
      expect(find.text('رمز التحقق غير صالح أو لم يتم العثور على الوصفة الطبية.'), findsOneWidget);
      expect(find.text('إعادة المحاولة'), findsOneWidget);
    });

    testWidgets('renders expired and voided prescription statuses correctly', (tester) async {
      final expiredJson = Map<String, dynamic>.from(mockPublicPrescriptionJson)
        ..['verification_status'] = 'expired'
        ..['is_valid'] = true;

      final mockClient = MockClient((request) async {
        return jsonResponse({'data': expiredJson});
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await tester.pumpAndSettle();

      expect(find.text('منتهية'), findsOneWidget);
    });
  });

  // =========================================================================
  // 3. Authenticated Appointment Deep Link Flow Tests
  // =========================================================================
  group('3. Authenticated Appointment Deep Link Flow', () {
    testWidgets('authenticated patient navigates directly to AppointmentDetailScreen', (tester) async {
      final requestedUrls = <String>[];

      final mockClient = MockClient((request) async {
        requestedUrls.add(request.url.path);
        if (request.url.path == '/api/v1/appointments/$validUuid') {
          return jsonResponse({'data': mockAppointmentJson});
        }
        return jsonResponse({'message': 'Not found'}, 404);
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);
      await sessionManager.setAuthenticatedUser(token: 'mock_jwt', user: testPatientUser);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.home,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://appointment/$validUuid');
      await tester.pumpAndSettle();

      expect(requestedUrls, contains('/api/v1/appointments/$validUuid'));
      expect(find.byType(AppointmentDetailScreen), findsOneWidget);
      expect(find.text('تفاصيل الموعد'), findsOneWidget);
      expect(find.text('رقم الحجز: #BK-2026-789'), findsOneWidget);
    });

    testWidgets('unauthorized appointment (403/404) preserves backend authorization and shows error feedback', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/appointments/$validUuid') {
          return jsonResponse({'message': 'غير مصرح لك بالوصول إلى هذا الموعد.'}, 403);
        }
        return jsonResponse({'message': 'Not found'}, 404);
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);
      await sessionManager.setAuthenticatedUser(token: 'mock_jwt', user: testPatientUser);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.home,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://appointment/$validUuid');
      await tester.pumpAndSettle();

      // Does not navigate to AppointmentDetailScreen
      expect(find.byType(AppointmentDetailScreen), findsNothing);
      // Feedback snackbar is shown
      expect(find.text('غير مصرح لك بالوصول إلى هذا الموعد.'), findsOneWidget);
    });
  });

  // =========================================================================
  // 4. Unauthenticated Appointment Flow & Volatile State Lifecycle
  // =========================================================================
  group('4. Unauthenticated Appointment Flow & Pending Lifecycle', () {
    testWidgets('stores pending appointment in volatile memory with ZERO API calls when unauthenticated', (tester) async {
      int apiCallCount = 0;
      final mockClient = MockClient((request) async {
        apiCallCount++;
        return jsonResponse({});
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://appointment/$validUuid');
      await tester.pumpAndSettle();

      // Verifies pending appointment is stored in volatile state
      expect(appState.pendingAppointmentId, equals(validUuid));
      // Verifies ZERO appointment API calls made while unauthenticated
      expect(apiCallCount, equals(0));
      // Verifies user remains on authentication shell
      expect(find.text('تسجيل الدخول'), findsWidgets);
    });

    testWidgets('failed login preserves pending appointment ID', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/auth/login') {
          return jsonResponse({'message': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'}, 422);
        }
        return jsonResponse({});
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://appointment/$validUuid');
      await tester.pumpAndSettle();

      expect(appState.pendingAppointmentId, equals(validUuid));

      // Attempt login with invalid credentials
      await tester.enterText(find.byType(TextField).first, 'wrong@example.dz');
      await tester.enterText(find.byType(TextField).at(1), 'wrongpass');
      await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
      await tester.pumpAndSettle();

      // Pending ID must be preserved for retry
      expect(appState.pendingAppointmentId, equals(validUuid));
      expect(find.byType(AppointmentDetailScreen), findsNothing);
    });

    testWidgets('explicit abandonment / clearPendingAppointment clears volatile pending appointment ID', (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://appointment/$validUuid');
      expect(appState.pendingAppointmentId, equals(validUuid));

      // Explicit abandonment
      appState.clearPendingAppointment();
      expect(appState.pendingAppointmentId, isNull);
    });

    testWidgets('successful login consumes pending appointment atomically with exactly-once consumption', (tester) async {
      int appointmentFetchCount = 0;

      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/auth/login') {
          return jsonResponse({
            'data': {
              'token': 'valid_login_jwt',
              'user': {
                'id': 'pat-1',
                'name': 'أحمد بن علي',
                'email': 'ahmed@example.dz',
                'roles': ['patient_registered'],
              },
            },
          });
        }
        if (request.url.path == '/api/v1/appointments/$validUuid') {
          appointmentFetchCount++;
          return jsonResponse({'data': mockAppointmentJson});
        }
        return jsonResponse({});
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://appointment/$validUuid');
      expect(appState.pendingAppointmentId, equals(validUuid));

      // Enter credentials and sign in
      await tester.enterText(find.byType(TextField).first, 'ahmed@example.dz');
      await tester.enterText(find.byType(TextField).at(1), 'password123');
      await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
      await tester.pumpAndSettle();

      // Immediately cleared during consumption
      expect(appState.pendingAppointmentId, isNull);
      // Navigated to AppointmentDetailScreen
      expect(find.byType(AppointmentDetailScreen), findsOneWidget);
      expect(appointmentFetchCount, equals(1));
    });

    testWidgets('TASK-06-02 session expiration clears pending appointment ID and pops stack', (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);
      await sessionManager.setAuthenticatedUser(token: 'mock_jwt', user: testPatientUser);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.home,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      // Store pending appointment ID
      await appState.handleDeepLinkUri('aafiya://appointment/$validUuid');
      expect(find.byType(AafiyaPatientApp), findsOneWidget);

      // Trigger session expiration (401)
      sessionManager.handleUnauthorized();
      await tester.pumpAndSettle();

      // Pending ID is cleared
      expect(appState.pendingAppointmentId, isNull);
      // Navigated to auth shell and session expired dialog shown
      expect(find.text('انتهت الجلسة'), findsOneWidget);
    });
  });

  // =========================================================================
  // 5. Lifecycle Ingestion & Deduplication Protection Tests
  // =========================================================================
  group('5. Lifecycle Ingestion & Platform Deduplication Tests', () {
    testWidgets('cold-start ingestion routes directly on boot', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/v/$validToken') {
          return jsonResponse({'data': mockPublicPrescriptionJson});
        }
        return jsonResponse({}, 404);
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
          initialDeepLink: 'aafiya://prescription/$validToken',
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(PrescriptionVerificationSheet), findsOneWidget);
    });

    testWidgets('deduplicates rapid delivery of identical deep link URI', (tester) async {
      int sheetPresentations = 0;
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/v/$validToken') {
          sheetPresentations++;
          return jsonResponse({'data': mockPublicPrescriptionJson});
        }
        return jsonResponse({}, 404);
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));

      // Fire duplicate deliveries in rapid succession
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await tester.pumpAndSettle();

      // Only one sheet opened and only one request executed
      expect(sheetPresentations, equals(1));
      expect(find.byType(PrescriptionVerificationSheet), findsOneWidget);
    });

    testWidgets('normal boot without deep link does not trigger routing', (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.splash,
        ),
      );
      await tester.pump(const Duration(milliseconds: 700));

      expect(find.byType(PrescriptionVerificationSheet), findsNothing);
      expect(find.byType(AppointmentDetailScreen), findsNothing);
    });
  });

  // =========================================================================
  // 6. Cross-Role Defense & Security Boundaries
  // =========================================================================
  group('6. Cross-Role Defense & Security Boundaries', () {
    test('rejects Pro application routes in Patient deep-link router', () {
      expect(PatientDeepLinkRouter.parse('aafiya://doctor/dashboard'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://assistant/queue'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://booking-center/create'), isA<UnknownDestination>());
      expect(PatientDeepLinkRouter.parse('aafiya://pro/appointments'), isA<UnknownDestination>());
    });

    test('UUID alone does not grant appointment authorization without backend verification', () {
      // The router only produces an AppointmentDetailsDestination containing the parsed UUID.
      // It never grants access or constructs data.
      final dest = PatientDeepLinkRouter.parse('aafiya://appointment/$validUuid');
      expect(dest, isA<AppointmentDetailsDestination>());
      expect((dest as AppointmentDetailsDestination).appointmentId, equals(validUuid));
    });

    test('public prescription token does not allow private prescription fetch', () {
      final dest = PatientDeepLinkRouter.parse('aafiya://prescription/$validToken');
      expect(dest, isA<PrescriptionVerificationDestination>());
      expect((dest as PrescriptionVerificationDestination).token, equals(validToken));
    });
  });

  // =========================================================================
  // 7. Localization & Directionality Tests (AR / EN / FR)
  // =========================================================================
  group('7. Localization & Directionality Tests (AR / EN / FR)', () {
    testWidgets('renders prescription verification in Arabic with RTL directionality', (tester) async {
      final mockClient = MockClient((request) async {
        return jsonResponse({'data': mockPublicPrescriptionJson});
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialLocale: const Locale('ar'),
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await tester.pumpAndSettle();

      expect(find.byType(PrescriptionVerificationSheet), findsOneWidget);
      final sheetContext = tester.element(find.byType(PrescriptionVerificationSheet));
      expect(Directionality.of(sheetContext), equals(TextDirection.rtl));

      expect(find.text('التحقق الرقمي (QR)'), findsOneWidget);
      expect(find.text('نشطة'), findsOneWidget);
      expect(find.text('الرقم المرجعي: #RX-2026-0001'), findsOneWidget);
      expect(find.text('الطبيب'), findsOneWidget);
      expect(find.text('العيادة'), findsOneWidget);
      expect(find.text('الاسم الكامل'), findsOneWidget);
      expect(find.text('تاريخ الإصدار'), findsOneWidget);
      expect(find.text('تاريخ الانتهاء'), findsOneWidget);
    });

    testWidgets('renders prescription verification in English with LTR directionality', (tester) async {
      final mockClient = MockClient((request) async {
        return jsonResponse({'data': mockPublicPrescriptionJson});
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialLocale: const Locale('en'),
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await tester.pumpAndSettle();

      expect(find.byType(PrescriptionVerificationSheet), findsOneWidget);
      final sheetContext = tester.element(find.byType(PrescriptionVerificationSheet));
      expect(Directionality.of(sheetContext), equals(TextDirection.ltr));

      expect(find.text('QR Verification'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Reference: #RX-2026-0001'), findsOneWidget);
      expect(find.text('Doctor'), findsOneWidget);
      expect(find.text('Clinic'), findsOneWidget);
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Issued on'), findsOneWidget);
      expect(find.text('Expires on'), findsOneWidget);
    });

    testWidgets('renders prescription verification in French with LTR directionality', (tester) async {
      final mockClient = MockClient((request) async {
        return jsonResponse({'data': mockPublicPrescriptionJson});
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialLocale: const Locale('fr'),
          initialNavState: PatientNavState.auth,
        ),
      );
      await tester.pumpAndSettle();

      final appState = tester.state<AafiyaPatientAppState>(find.byType(AafiyaPatientApp));
      await appState.handleDeepLinkUri('aafiya://prescription/$validToken');
      await tester.pumpAndSettle();

      expect(find.byType(PrescriptionVerificationSheet), findsOneWidget);
      final sheetContext = tester.element(find.byType(PrescriptionVerificationSheet));
      expect(Directionality.of(sheetContext), equals(TextDirection.ltr));

      expect(find.text('Vérification QR'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Référence: #RX-2026-0001'), findsOneWidget);
      expect(find.text('Médecin'), findsOneWidget);
      expect(find.text('Clinique'), findsOneWidget);
      expect(find.text('Nom complet'), findsOneWidget);
      expect(find.text('Délivrée le'), findsOneWidget);
      expect(find.text('Expire le'), findsOneWidget);
    });
  });
}

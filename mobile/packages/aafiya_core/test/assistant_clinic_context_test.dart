import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  const testClinicId = '01a084d2-021f-71eb-b09c-39d9ddce3458';
  const testClinicName = 'عيادة شفاء الاختبارية 01';

  group('User Model Clinic Parsing', () {
    test('User.fromJson correctly parses clinic and clinics from backend UserResource', () {
      final json = {
        'id': '01a084d5-adcd-7045-84c6-881865f4bce9',
        'name': 'مساعد طبيب اختباري 001',
        'email': 'ast001@aafiya.test',
        'phone': '+213552000011',
        'is_active': true,
        'roles': ['doctor_assistant'],
        'permissions': ['booking.create', 'booking.manage_queue'],
        'clinic': {
          'id': testClinicId,
          'name': testClinicName,
          'position': 'assistant',
          'is_director': false,
        },
        'clinics': [
          {
            'id': testClinicId,
            'name': testClinicName,
            'wilaya': 'Alger',
            'address': 'شارع المستشفى 01، الجزائر',
            'phone': '+213551000001',
            'position': 'assistant',
            'is_director': false,
            'is_active': true,
            'is_primary': true,
          }
        ],
      };

      final user = User.fromJson(json);

      expect(user.id, equals('01a084d5-adcd-7045-84c6-881865f4bce9'));
      expect(user.name, equals('مساعد طبيب اختباري 001'));
      expect(user.roles, contains(UserRole.doctorAssistant));
      expect(user.clinic, isNotNull);
      expect(user.clinic!.id, equals(testClinicId));
      expect(user.clinic!.name, equals(testClinicName));
      expect(user.clinic!.position, equals('assistant'));
      expect(user.clinics, hasLength(1));
      expect(user.clinics.first.id, equals(testClinicId));
      expect(user.clinics.first.isPrimary, isTrue);
      expect(user.clinics.first.isActive, isTrue);
    });

    test('User.fromJson safely handles null/missing clinic and clinics', () {
      final json = {
        'id': 'user-100',
        'name': 'مستخدم عادي',
        'email': 'user@example.com',
        'roles': ['patient_registered'],
        'clinic': null,
        'clinics': null,
      };

      final user = User.fromJson(json);

      expect(user.clinic, isNull);
      expect(user.clinics, isEmpty);
    });
  });

  group('AuthSessionManager Assistant Clinic Context', () {
    test('setAuthenticatedUser auto-establishes single active clinic for doctor_assistant', () async {
      final storage = InMemoryTokenStorage();
      final client = ApiClient(tokenStorage: storage);
      final sessionManager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const clinic = DoctorClinic(
        id: testClinicId,
        name: testClinicName,
        position: 'assistant',
        isActive: true,
        isPrimary: true,
      );

      const assistantUser = User(
        id: 'ast-001',
        name: 'مساعد طبيب',
        email: 'assistant@aafiya.test',
        roles: [UserRole.doctorAssistant],
        clinic: clinic,
        clinics: [clinic],
      );

      await sessionManager.setAuthenticatedUser(token: 'test-token', user: assistantUser);

      expect(sessionManager.isAuthenticated, isTrue);
      expect(sessionManager.activeClinic, isNotNull);
      expect(sessionManager.activeClinicId, equals(testClinicId));
      expect(client.activeClinicId, equals(testClinicId));
      expect(sessionManager.authorizedClinics, hasLength(1));
      expect(sessionManager.authorizedClinics.first.id, equals(testClinicId));
    });

    test('restoreSession auto-establishes clinic context from /auth/me profile', () async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith('/auth/me')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {
                'id': 'ast-001',
                'name': 'مساعد طبيب',
                'email': 'ast001@aafiya.test',
                'roles': ['doctor_assistant'],
                'is_active': true,
                'clinic': {
                  'id': testClinicId,
                  'name': testClinicName,
                  'position': 'assistant',
                },
                'clinics': [
                  {
                    'id': testClinicId,
                    'name': testClinicName,
                    'position': 'assistant',
                    'is_active': true,
                    'is_primary': true,
                  }
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final storage = InMemoryTokenStorage('persisted-token');
      final client = ApiClient(tokenStorage: storage, httpClient: mockHttp);
      final sessionManager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      await sessionManager.restoreSession();

      expect(sessionManager.isAuthenticated, isTrue);
      expect(sessionManager.currentUser?.primaryRole, equals(UserRole.doctorAssistant));
      expect(sessionManager.activeClinicId, equals(testClinicId));
      expect(client.activeClinicId, equals(testClinicId));
      expect(sessionManager.authorizedClinics, hasLength(1));
    });

    test('assistant without clinic context fails closed (activeClinicId remains null)', () async {
      final storage = InMemoryTokenStorage();
      final client = ApiClient(tokenStorage: storage);
      final sessionManager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const assistantWithoutClinic = User(
        id: 'ast-orphan',
        name: 'مساعد بدون عيادة',
        email: 'orphan@aafiya.test',
        roles: [UserRole.doctorAssistant],
        clinic: null,
        clinics: [],
      );

      await sessionManager.setAuthenticatedUser(token: 'test-token', user: assistantWithoutClinic);

      expect(sessionManager.isAuthenticated, isTrue);
      expect(sessionManager.activeClinic, isNull);
      expect(sessionManager.activeClinicId, isNull);
      expect(client.activeClinicId, isNull);
      expect(sessionManager.authorizedClinics, isEmpty);
    });

    test('doctor role is NOT auto-bound on login, preserving Doctor Multi-Clinic workflow', () async {
      final storage = InMemoryTokenStorage();
      final client = ApiClient(tokenStorage: storage);
      final sessionManager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const doctorUser = User(
        id: 'doc-001',
        name: 'د. كريم بن زكري',
        email: 'doctor@aafiya.test',
        roles: [UserRole.doctor],
      );

      await sessionManager.setAuthenticatedUser(token: 'doc-token', user: doctorUser);

      expect(sessionManager.isAuthenticated, isTrue);
      // Doctor clinics are loaded independently by DoctorShell via fetchDoctorClinics()
      expect(sessionManager.activeClinic, isNull);
      expect(sessionManager.activeClinicId, isNull);
      expect(client.activeClinicId, isNull);
      expect(sessionManager.authorizedClinics, isEmpty);
    });
  });
}

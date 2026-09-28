import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('DoctorClinic Model Tests', () {
    test('deserializes complete JSON payload correctly', () {
      final json = {
        'id': 'clinic-uuid-101',
        'name': 'عيادة النور المركزية',
        'wilaya': 'Alger',
        'address': 'شارع ديدوش مراد 15',
        'phone': '+21321000001',
        'position': 'director',
        'is_director': true,
        'is_active': true,
        'is_primary': true,
        'joined_at': '2026-08-24T19:00:11.000000Z',
      };

      final clinic = DoctorClinic.fromJson(json);

      expect(clinic.id, 'clinic-uuid-101');
      expect(clinic.name, 'عيادة النور المركزية');
      expect(clinic.wilaya, 'Alger');
      expect(clinic.address, 'شارع ديدوش مراد 15');
      expect(clinic.phone, '+21321000001');
      expect(clinic.position, 'director');
      expect(clinic.isDirector, isTrue);
      expect(clinic.isMedicalDirector, isTrue);
      expect(clinic.isActive, isTrue);
      expect(clinic.isPrimary, isTrue);
      expect(clinic.joinedAt, '2026-08-24T19:00:11.000000Z');
    });

    test('isMedicalDirector helper recognizes director position string', () {
      const docClinic = DoctorClinic(
        id: 'c1',
        name: 'Clinic 1',
        position: 'DIRECTOR',
        isDirector: false,
      );
      expect(docClinic.isMedicalDirector, isTrue);

      const regularClinic = DoctorClinic(
        id: 'c2',
        name: 'Clinic 2',
        position: 'doctor',
        isDirector: false,
      );
      expect(regularClinic.isMedicalDirector, isFalse);
    });

    test('equality is based on clinic ID', () {
      const c1 = DoctorClinic(id: 'c1', name: 'Clinic A');
      const c2 = DoctorClinic(id: 'c1', name: 'Clinic B');
      const c3 = DoctorClinic(id: 'c3', name: 'Clinic A');

      expect(c1, equals(c2));
      expect(c1, isNot(equals(c3)));
    });
  });

  group('ApiClient Active Clinic Header Injection Tests', () {
    test('does not inject clinic headers when activeClinicId is null', () async {
      late Map<String, String> capturedHeaders;

      final mockClient = MockClient((request) async {
        capturedHeaders = request.headers;
        return http.Response(jsonEncode({'status': 'success', 'data': <dynamic>[]}), 200);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      await apiClient.get('/test-endpoint');

      expect(capturedHeaders.containsKey('X-Clinic-ID'), isFalse);
      expect(capturedHeaders.containsKey('X-Active-Clinic-ID'), isFalse);
    });

    test('injects both X-Clinic-ID and X-Active-Clinic-ID when activeClinicId is set', () async {
      late Map<String, String> capturedHeaders;

      final mockClient = MockClient((request) async {
        capturedHeaders = request.headers;
        return http.Response(jsonEncode({'status': 'success', 'data': <dynamic>[]}), 200);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId('01a0355b-clinic-uuid');

      await apiClient.get('/test-endpoint');

      expect(capturedHeaders['X-Clinic-ID'], '01a0355b-clinic-uuid');
      expect(capturedHeaders['X-Active-Clinic-ID'], '01a0355b-clinic-uuid');

      // Clear header and test again
      apiClient.setActiveClinicId(null);
      await apiClient.get('/test-endpoint');

      expect(capturedHeaders.containsKey('X-Clinic-ID'), isFalse);
      expect(capturedHeaders.containsKey('X-Active-Clinic-ID'), isFalse);
    });
  });

  group('AuthSessionManager Clinic Context Management Tests', () {
    late InMemoryTokenStorage tokenStorage;
    late ApiClient apiClient;
    late AuthSessionManager sessionManager;

    const clinic1 = DoctorClinic(
      id: 'clinic-1',
      name: 'عيادة الأمل',
      wilaya: 'Alger',
      isPrimary: true,
      isActive: true,
    );

    const clinic2 = DoctorClinic(
      id: 'clinic-2',
      name: 'عيادة الشفاء',
      wilaya: 'Oran',
      isPrimary: false,
      isActive: true,
    );

    const suspendedClinic = DoctorClinic(
      id: 'clinic-suspended',
      name: 'عيادة معلقة',
      wilaya: 'Blida',
      isPrimary: false,
      isActive: false,
    );

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
      apiClient = ApiClient(tokenStorage: tokenStorage);
      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
    });

    test('empty clinics list clears active clinic and header', () {
      sessionManager.setAuthorizedClinics([]);

      expect(sessionManager.activeClinic, isNull);
      expect(sessionManager.activeClinicId, isNull);
      expect(apiClient.activeClinicId, isNull);
      expect(sessionManager.authorizedClinics, isEmpty);
    });

    test('single active clinic is automatically established as active context', () {
      sessionManager.setAuthorizedClinics([clinic2]);

      expect(sessionManager.activeClinic, equals(clinic2));
      expect(sessionManager.activeClinicId, 'clinic-2');
      expect(apiClient.activeClinicId, 'clinic-2');
    });

    test('multiple clinics automatically select the primary active clinic', () {
      sessionManager.setAuthorizedClinics([clinic2, clinic1]);

      expect(sessionManager.activeClinic, equals(clinic1));
      expect(sessionManager.activeClinicId, 'clinic-1');
      expect(apiClient.activeClinicId, 'clinic-1');
    });

    test('preferredClinicId takes precedence if active and authorized', () {
      sessionManager.setAuthorizedClinics([clinic1, clinic2], preferredClinicId: 'clinic-2');

      expect(sessionManager.activeClinic, equals(clinic2));
      expect(sessionManager.activeClinicId, 'clinic-2');
      expect(apiClient.activeClinicId, 'clinic-2');
    });

    test('switchActiveClinic succeeds for authorized active clinic', () {
      sessionManager.setAuthorizedClinics([clinic1, clinic2]);
      expect(sessionManager.activeClinicId, 'clinic-1');

      final switched = sessionManager.switchActiveClinic('clinic-2');

      expect(switched, isTrue);
      expect(sessionManager.activeClinic, equals(clinic2));
      expect(sessionManager.activeClinicId, 'clinic-2');
      expect(apiClient.activeClinicId, 'clinic-2');
    });

    test('switchActiveClinic fails closed and preserves context for unauthorized clinic', () {
      sessionManager.setAuthorizedClinics([clinic1, clinic2]);
      expect(sessionManager.activeClinicId, 'clinic-1');

      final switched = sessionManager.switchActiveClinic('unauthorized-clinic-99');

      expect(switched, isFalse);
      expect(sessionManager.activeClinic, equals(clinic1));
      expect(sessionManager.activeClinicId, 'clinic-1');
      expect(apiClient.activeClinicId, 'clinic-1');
    });

    test('switchActiveClinic fails closed and preserves context for suspended clinic', () {
      sessionManager.setAuthorizedClinics([clinic1, suspendedClinic]);
      expect(sessionManager.activeClinicId, 'clinic-1');

      final switched = sessionManager.switchActiveClinic('clinic-suspended');

      expect(switched, isFalse);
      expect(sessionManager.activeClinic, equals(clinic1));
      expect(sessionManager.activeClinicId, 'clinic-1');
      expect(apiClient.activeClinicId, 'clinic-1');
    });

    test('logout resets active clinic and clears ApiClient header', () async {
      sessionManager.setAuthorizedClinics([clinic1]);
      expect(sessionManager.activeClinicId, 'clinic-1');

      await sessionManager.logout();

      expect(sessionManager.activeClinic, isNull);
      expect(sessionManager.activeClinicId, isNull);
      expect(sessionManager.authorizedClinics, isEmpty);
      expect(apiClient.activeClinicId, isNull);
    });
  });

  group('DoctorClinicService Tests', () {
    test('successfully fetches and deserializes doctor clinics', () async {
      final mockResponse = {
        'status': 'success',
        'data': [
          {
            'id': 'c1',
            'name': 'عيادة الوفاء',
            'wilaya': 'Alger',
            'is_director': true,
            'is_active': true,
            'is_primary': true,
          },
          {
            'id': 'c2',
            'name': 'عيادة السلام',
            'wilaya': 'Oran',
            'is_director': false,
            'is_active': true,
            'is_primary': false,
          }
        ]
      };

      final mockClient = MockClient((request) async {
        try {
          if (request.url.path.endsWith('/doctor/clinics')) {
            return http.Response(
              jsonEncode(mockResponse),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response('Not Found', 404);
        } catch (err, stack) {
          // ignore: avoid_print
          print('MOCK ERROR: $err\n$stack');
          rethrow;
        }
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = DoctorClinicService(apiClient: apiClient);

      final result = await service.fetchDoctorClinics();
      expect(result, isA<ApiSuccess<List<DoctorClinic>>>());
      final clinics = (result as ApiSuccess<List<DoctorClinic>>).data;
      expect(clinics.length, 2);
      expect(clinics[0].name, 'عيادة الوفاء');
      expect(clinics[0].isDirector, isTrue);
      expect(clinics[1].name, 'عيادة السلام');
      expect(clinics[1].isDirector, isFalse);
    });
  });
}

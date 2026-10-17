import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_core/services/shared_record_service.dart';

void main() {
  group('ApiClient Clinic Header Isolation & Regression Tests', () {
    test('suppresses X-Clinic-ID and X-Active-Clinic-ID when includeClinicContext is false', () async {
      late Map<String, String> capturedHeaders;

      final mockClient = MockClient((request) async {
        capturedHeaders = request.headers;
        return http.Response(jsonEncode({'status': 'ok'}), 200);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        config: AppConfig.devLocal,
      );
      apiClient.setActiveClinicId('clinic-uuid-999');

      await apiClient.post(
        '/test-endpoint',
        requiresAuth: false,
        includeClinicContext: false,
      );

      expect(capturedHeaders.containsKey('X-Clinic-ID'), isFalse);
      expect(capturedHeaders.containsKey('X-Active-Clinic-ID'), isFalse);
      expect(capturedHeaders.containsKey('Authorization'), isFalse);
    });

    test('preserves X-Clinic-ID and X-Active-Clinic-ID by default when active clinic is configured', () async {
      late Map<String, String> capturedHeaders;

      final mockClient = MockClient((request) async {
        capturedHeaders = request.headers;
        return http.Response(jsonEncode({'status': 'ok'}), 200);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        config: AppConfig.devLocal,
      );
      apiClient.setActiveClinicId('clinic-uuid-999');

      await apiClient.post(
        '/test-endpoint',
        requiresAuth: false,
        // includeClinicContext defaults to true
      );

      expect(capturedHeaders['X-Clinic-ID'], equals('clinic-uuid-999'));
      expect(capturedHeaders['X-Active-Clinic-ID'], equals('clinic-uuid-999'));
    });
  });

  group('SharedRecordService Tests', () {
    const validToken = '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b';
    const validPin = '1234';

    final validResponseJson = {
      'data': {
        'scope': 'all_emr',
        'patient': {
          'id': 'pat-uuid-001',
          'mrn': 'MRN-2026-001',
          'first_name': 'Fatima',
          'last_name': 'Benali',
          'full_name': 'Fatima Benali',
          'gender': 'female',
          'date_of_birth': '1988-06-15',
          'blood_group': 'O+',
          'allergies': [
            {
              'id': 'all-001',
              'patient_id': 'pat-uuid-001',
              'allergen': 'Penicillin',
              'severity': 'severe',
              'reaction': 'Anaphylaxis',
              'diagnosed_at': '2020-01-10',
              'notes': 'Carry EpiPen',
              'created_at': '2020-01-10T12:00:00.000Z',
            }
          ],
          'chronic_conditions': [
            {
              'id': 'chr-001',
              'patient_id': 'pat-uuid-001',
              'condition_name': 'Type 2 Diabetes',
              'icd10_code': 'E11',
              'diagnosed_date': '2019-05-20',
              'status': 'active',
              'notes': 'Monitored HbA1c',
              'created_at': '2019-05-20T10:00:00.000Z',
            }
          ],
          'current_medications': [
            {
              'id': 'med-001',
              'patient_id': 'pat-uuid-001',
              'medication_name': 'Metformin',
              'dosage': '500mg',
              'frequency': 'Twice daily',
              'start_date': '2019-06-01',
              'prescribed_by': 'Dr. Mansouri',
              'is_active': true,
              'notes': 'Take with meals',
              'created_at': '2019-06-01T08:00:00.000Z',
            }
          ],
        },
        'share_metadata': {
          'scope': 'all_emr',
          'access_granted_at': '2026-10-16T08:00:00.000Z',
          'expires_at': '2026-10-16T12:00:00.000Z',
          'authorized_clinical_scope': 'ملف طبي موحد معتمد (خالٍ من بيانات الاتصال والهوية الشخصية)',
        },
      }
    };

    const jsonHeaders = {'content-type': 'application/json; charset=utf-8'};

    test('successfully resolves record with complete privacy minimization', () async {
      late http.Request capturedRequest;

      final mockClient = MockClient((request) async {
        capturedRequest = request;
        return http.Response(jsonEncode(validResponseJson), 200, headers: jsonHeaders);
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      apiClient.setActiveClinicId('ambient-clinic-123');

      final service = SharedRecordService(apiClient, config: AppConfig.devLocal);
      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordSuccess>());
      final record = (result as SharedRecordSuccess).record;

      // Assert payload mapping
      expect(record.scope, equals('all_emr'));
      expect(record.patient.fullName, equals('Fatima Benali'));
      expect(record.patient.mrn, equals('MRN-2026-001'));
      expect(record.patient.bloodGroup, equals('O+'));
      expect(record.patient.allergies.length, equals(1));
      expect(record.patient.allergies.first.allergen, equals('Penicillin'));
      expect(record.patient.chronicConditions.length, equals(1));
      expect(record.patient.chronicConditions.first.conditionName, equals('Type 2 Diabetes'));
      expect(record.patient.currentMedications.length, equals(1));
      expect(record.patient.currentMedications.first.medicationName, equals('Metformin'));

      // Assert security headers on request
      expect(capturedRequest.headers.containsKey('Authorization'), isFalse);
      expect(capturedRequest.headers.containsKey('X-Clinic-ID'), isFalse);
      expect(capturedRequest.headers.containsKey('X-Active-Clinic-ID'), isFalse);

      // Assert body
      final body = jsonDecode(capturedRequest.body) as Map<String, dynamic>;
      expect(body['token'], equals(validToken));
      expect(body['pin'], equals(validPin));
    });

    test('maps 403 Forbidden with remaining_attempts preserved', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'error',
            'code': 403,
            'message': 'رمز الحماية PIN غير صحيح.',
            'remaining_attempts': 2,
          }),
          403,
          headers: jsonHeaders,
        );
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = SharedRecordService(apiClient, config: AppConfig.devLocal);

      final result = await service.resolveSharedRecord(token: validToken, pin: '9999');

      expect(result, isA<SharedRecordWrongPinFailure>());
      final failure = result as SharedRecordWrongPinFailure;
      expect(failure.remainingAttempts, equals(2));
      expect(failure.message, contains('غير صحيح'));
    });

    test('maps 404 Not Found to SharedRecordNotFoundFailure', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'error',
            'code': 404,
            'message': 'رابط المشاركة غير صالح أو غير موجود.',
          }),
          404,
          headers: jsonHeaders,
        );
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = SharedRecordService(apiClient, config: AppConfig.devLocal);

      final result = await service.resolveSharedRecord(token: 'invalid_token', pin: validPin);

      expect(result, isA<SharedRecordNotFoundFailure>());
    });

    test('maps 410 Gone to SharedRecordExpiredOrRevokedFailure', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'error',
            'code': 410,
            'message': 'تم إلغاء رابط المشاركة من قِبل المريض، ولم يعد صالحاً للاستخدام.',
          }),
          410,
          headers: jsonHeaders,
        );
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = SharedRecordService(apiClient, config: AppConfig.devLocal);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordExpiredOrRevokedFailure>());
    });

    test('maps 422 Unprocessable Content to SharedRecordValidationFailure', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'رمز الحماية PIN مطلوب للتحقق من الصلاحية.',
            'errors': {
              'pin': ['رمز الحماية PIN مطلوب للتحقق من الصلاحية.']
            }
          }),
          422,
          headers: jsonHeaders,
        );
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = SharedRecordService(apiClient, config: AppConfig.devLocal);

      final result = await service.resolveSharedRecord(token: validToken, pin: '12');

      expect(result, isA<SharedRecordValidationFailure>());
    });

    test('maps 423 Locked to SharedRecordLockedFailure without exposing locked_until', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'error',
            'code': 423,
            'message': 'تم قفل الرابط مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى الانتظار والمحاولة لاحقاً.',
          }),
          423,
          headers: jsonHeaders,
        );
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = SharedRecordService(apiClient, config: AppConfig.devLocal);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordLockedFailure>());
    });

    test('maps 429 Too Many Requests to SharedRecordRateLimitFailure', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'error',
            'code': 429,
            'message': 'تم تجاوز معدل محاولات التحقق من رمز المشاركة.',
          }),
          429,
          headers: jsonHeaders,
        );
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = SharedRecordService(apiClient, config: AppConfig.devLocal);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordRateLimitFailure>());
    });

    test('rejects plain HTTP in production environment before network call', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validResponseJson), 200, headers: jsonHeaders);
      });

      const insecureProdConfig = AppConfig(
        apiBaseUrl: 'http://api.aafiya.site/api/v1',
        environment: 'production',
      );

      final apiClient = ApiClient(httpClient: mockClient, config: insecureProdConfig);
      final service = SharedRecordService(apiClient, config: insecureProdConfig);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordInsecureSchemeFailure>());
      expect(networkCalled, isFalse);
    });

    test('rejects plain HTTP in production even if host is localhost', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validResponseJson), 200, headers: jsonHeaders);
      });

      const config = AppConfig(
        apiBaseUrl: 'http://localhost:8000/api/v1',
        environment: 'production',
      );

      final apiClient = ApiClient(httpClient: mockClient, config: config);
      final service = SharedRecordService(apiClient, config: config);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordInsecureSchemeFailure>());
      expect(networkCalled, isFalse);
    });

    test('rejects plain HTTP in production even if host is 127.0.0.1', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validResponseJson), 200, headers: jsonHeaders);
      });

      const config = AppConfig(
        apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
        environment: 'production',
      );

      final apiClient = ApiClient(httpClient: mockClient, config: config);
      final service = SharedRecordService(apiClient, config: config);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordInsecureSchemeFailure>());
      expect(networkCalled, isFalse);
    });

    test('rejects plain HTTP in production even if host is 10.0.2.2', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validResponseJson), 200, headers: jsonHeaders);
      });

      const config = AppConfig(
        apiBaseUrl: 'http://10.0.2.2:8000/api/v1',
        environment: 'production',
      );

      final apiClient = ApiClient(httpClient: mockClient, config: config);
      final service = SharedRecordService(apiClient, config: config);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordInsecureSchemeFailure>());
      expect(networkCalled, isFalse);
    });

    test('rejects plain HTTP in staging environment', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validResponseJson), 200, headers: jsonHeaders);
      });

      const config = AppConfig(
        apiBaseUrl: 'http://staging.aafiya.site/api/v1',
        environment: 'staging',
      );

      final apiClient = ApiClient(httpClient: mockClient, config: config);
      final service = SharedRecordService(apiClient, config: config);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordInsecureSchemeFailure>());
      expect(networkCalled, isFalse);
    });

    test('rejects invalid or scheme-less base URI in non-development environment', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validResponseJson), 200, headers: jsonHeaders);
      });

      const config = AppConfig(
        apiBaseUrl: 'api.aafiya.site/api/v1',
        environment: 'production',
      );

      final apiClient = ApiClient(httpClient: mockClient, config: config);
      final service = SharedRecordService(apiClient, config: config);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordInsecureSchemeFailure>());
      expect(networkCalled, isFalse);
    });

    test('allows HTTP in development environment (localhost)', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validResponseJson), 200, headers: jsonHeaders);
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = SharedRecordService(apiClient, config: AppConfig.devLocal);

      final result = await service.resolveSharedRecord(token: validToken, pin: validPin);

      expect(result, isA<SharedRecordSuccess>());
      expect(networkCalled, isTrue);
    });
  });
}

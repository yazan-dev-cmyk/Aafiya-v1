import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_core/models/patient_share_token.dart';
import 'package:aafiya_core/services/patient_share_service.dart';

void main() {
  group('PatientShareService Tests', () {
    const validPin = '4821';
    const validDuration = '24h';
    const jsonHeaders = {'content-type': 'application/json; charset=utf-8'};

    final validCreateResponseJson = {
      'message': 'تم إنشاء رابط المشاركة الآمن والمشفر بنجاح.',
      'data': {
        'id': 'share-uuid-001',
        'token': 'pst_mockSecretToken1234567890abcdefghijklmnopqrstuvwxyz',
        'scope': 'all_emr',
        'duration': '24h',
        'expires_at': '2026-10-17T10:00:00.000Z',
        'share_url': 'http://localhost:3000/records/view#token=pst_mockSecretToken1234567890abcdefghijklmnopqrstuvwxyz',
        'has_pin': true,
        'status': 'active',
      }
    };

    final validListResponseJson = {
      'data': [
        {
          'id': 'share-uuid-001',
          'scope': 'all_emr',
          'status': 'active',
          'failed_attempts': 0,
          'access_count': 2,
          'last_accessed_at': '2026-10-16T12:00:00.000Z',
          'expires_at': '2026-10-17T10:00:00.000Z',
          'revoked_at': null,
          'created_at': '2026-10-16T10:00:00.000Z',
        },
        {
          'id': 'share-uuid-002',
          'scope': 'all_emr',
          'status': 'revoked',
          'failed_attempts': 1,
          'access_count': 0,
          'last_accessed_at': null,
          'expires_at': '2026-10-17T10:00:00.000Z',
          'revoked_at': '2026-10-16T11:00:00.000Z',
          'created_at': '2026-10-16T09:00:00.000Z',
        },
      ]
    };

    final validRevokeResponseJson = {
      'message': 'تم إلغاء رابط المشاركة بنجاح وإيقاف صلاحية الوصول فورياً.',
      'data': {
        'id': 'share-uuid-001',
        'status': 'revoked',
        'revoked_at': '2026-10-16T12:30:00.000Z',
      }
    };

    test('successfully creates share token with required fields and authentication', () async {
      late http.Request capturedRequest;

      final mockClient = MockClient((request) async {
        capturedRequest = request;
        return http.Response(jsonEncode(validCreateResponseJson), 201, headers: jsonHeaders);
      });

      final tokenStorage = InMemoryTokenStorage('patient-sanctum-token');
      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
        config: AppConfig.devLocal,
      );

      final service = PatientShareService(apiClient, config: AppConfig.devLocal);
      final result = await service.createShare(pin: validPin, duration: validDuration);

      expect(result, isA<ApiSuccess<PatientShareToken>>());
      final share = (result as ApiSuccess<PatientShareToken>).data;

      expect(share.id, equals('share-uuid-001'));
      expect(share.token, equals('pst_mockSecretToken1234567890abcdefghijklmnopqrstuvwxyz'));
      expect(share.scope, equals('all_emr'));
      expect(share.duration, equals('24h'));
      expect(share.status, equals('active'));
      expect(share.hasPin, isTrue);
      expect(share.isActive, isTrue);

      // Verify request payload & headers
      expect(capturedRequest.headers['authorization'], contains('Bearer patient-sanctum-token'));
      final body = jsonDecode(capturedRequest.body) as Map<String, dynamic>;
      expect(body['scope'], equals('all_emr'));
      expect(body['duration'], equals('24h'));
      expect(body['pin'], equals('4821'));
    });

    test('validates PIN length locally before network call (too short < 4)', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = PatientShareService(apiClient, config: AppConfig.devLocal);

      final result = await service.createShare(pin: '123', duration: '24h');

      expect(result, isA<ApiFailure<PatientShareToken>>());
      final exception = (result as ApiFailure<PatientShareToken>).exception;
      expect(exception, isA<ValidationException>());
      expect(networkCalled, isFalse);
    });

    test('validates PIN length locally before network call (too long > 8)', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = PatientShareService(apiClient, config: AppConfig.devLocal);

      final result = await service.createShare(pin: '123456789', duration: '24h');

      expect(result, isA<ApiFailure<PatientShareToken>>());
      final exception = (result as ApiFailure<PatientShareToken>).exception;
      expect(exception, isA<ValidationException>());
      expect(networkCalled, isFalse);
    });

    test('validates PIN numeric characters locally before network call', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = PatientShareService(apiClient, config: AppConfig.devLocal);

      final result = await service.createShare(pin: 'abcd', duration: '24h');

      expect(result, isA<ApiFailure<PatientShareToken>>());
      final exception = (result as ApiFailure<PatientShareToken>).exception;
      expect(exception, isA<ValidationException>());
      expect(networkCalled, isFalse);
    });

    test('validates duration locally before network call (rejects unsupported)', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = PatientShareService(apiClient, config: AppConfig.devLocal);

      final result = await service.createShare(pin: '1234', duration: '90d');

      expect(result, isA<ApiFailure<PatientShareToken>>());
      final exception = (result as ApiFailure<PatientShareToken>).exception;
      expect(exception, isA<ValidationException>());
      expect(networkCalled, isFalse);
    });

    test('enforces HTTPS preflight in non-development environments', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validCreateResponseJson), 201, headers: jsonHeaders);
      });

      const prodConfig = AppConfig(
        apiBaseUrl: 'http://api.aafiya.site/api/v1',
        environment: 'production',
      );

      final apiClient = ApiClient(httpClient: mockClient, config: prodConfig);
      final service = PatientShareService(apiClient, config: prodConfig);

      final result = await service.createShare(pin: validPin, duration: validDuration);

      expect(result, isA<ApiFailure<PatientShareToken>>());
      final exception = (result as ApiFailure<PatientShareToken>).exception;
      expect(exception, isA<GenericApiException>());
      expect(networkCalled, isFalse);
    });

    test('enforces HTTPS preflight in production even if host is localhost', () async {
      bool networkCalled = false;
      final mockClient = MockClient((request) async {
        networkCalled = true;
        return http.Response(jsonEncode(validCreateResponseJson), 201, headers: jsonHeaders);
      });

      const prodConfig = AppConfig(
        apiBaseUrl: 'http://localhost:8000/api/v1',
        environment: 'production',
      );

      final apiClient = ApiClient(httpClient: mockClient, config: prodConfig);
      final service = PatientShareService(apiClient, config: prodConfig);

      final result = await service.createShare(pin: validPin, duration: validDuration);

      expect(result, isA<ApiFailure<PatientShareToken>>());
      expect(networkCalled, isFalse);
    });

    test('handles 422 server validation error', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'رمز الحماية PIN إلزامي لإنشاء رابط المشاركة وفق القرار DEC-P05-03.',
            'errors': {
              'pin': ['رمز الحماية PIN إلزامي لإنشاء رابط المشاركة وفق القرار DEC-P05-03.']
            }
          }),
          422,
          headers: jsonHeaders,
        );
      });

      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);
      final service = PatientShareService(apiClient, config: AppConfig.devLocal);

      final result = await service.createShare(pin: validPin, duration: validDuration);

      expect(result, isA<ApiFailure<PatientShareToken>>());
      final exception = (result as ApiFailure<PatientShareToken>).exception;
      expect(exception, isA<ValidationException>());
    });

    test('successfully retrieves list of patient shares and maps statuses', () async {
      late http.Request capturedRequest;

      final mockClient = MockClient((request) async {
        capturedRequest = request;
        return http.Response(jsonEncode(validListResponseJson), 200, headers: jsonHeaders);
      });

      final tokenStorage = InMemoryTokenStorage('patient-sanctum-token');
      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
        config: AppConfig.devLocal,
      );

      final service = PatientShareService(apiClient, config: AppConfig.devLocal);
      final result = await service.getMyShares();

      expect(result, isA<ApiSuccess<List<PatientShareToken>>>());
      final shares = (result as ApiSuccess<List<PatientShareToken>>).data;

      expect(shares.length, equals(2));
      expect(shares[0].id, equals('share-uuid-001'));
      expect(shares[0].status, equals('active'));
      expect(shares[0].isActive, isTrue);
      expect(shares[0].token, isNull); // Listing must NOT expose token
      expect(shares[0].accessCount, equals(2));

      expect(shares[1].id, equals('share-uuid-002'));
      expect(shares[1].status, equals('revoked'));
      expect(shares[1].isRevoked, isTrue);
      expect(shares[1].isActive, isFalse);

      expect(capturedRequest.headers['authorization'], contains('Bearer patient-sanctum-token'));
    });

    test('successfully revokes an active share token by ID', () async {
      late http.Request capturedRequest;

      final mockClient = MockClient((request) async {
        capturedRequest = request;
        return http.Response(jsonEncode(validRevokeResponseJson), 200, headers: jsonHeaders);
      });

      final tokenStorage = InMemoryTokenStorage('patient-sanctum-token');
      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
        config: AppConfig.devLocal,
      );

      final service = PatientShareService(apiClient, config: AppConfig.devLocal);
      final result = await service.revokeShare('share-uuid-001');

      expect(result, isA<ApiSuccess<PatientShareToken>>());
      final revokedShare = (result as ApiSuccess<PatientShareToken>).data;

      expect(revokedShare.id, equals('share-uuid-001'));
      expect(revokedShare.status, equals('revoked'));
      expect(revokedShare.isRevoked, isTrue);

      expect(capturedRequest.method, equals('DELETE'));
      expect(capturedRequest.url.path, endsWith('/patients/share-tokens/share-uuid-001'));
      expect(capturedRequest.headers['authorization'], contains('Bearer patient-sanctum-token'));
    });

    test('PatientShareToken toString() omits plaintext token to prevent credential logging', () {
      final share = PatientShareToken(
        id: 'share-uuid-999',
        token: 'pst_highlySensitiveBearerSecretToken12345',
        shareUrl: 'http://localhost:3000/records/view#token=pst_highlySensitiveBearerSecretToken12345',
        scope: 'all_emr',
        status: 'active',
        expiresAt: DateTime(2026, 10, 17),
      );

      final debugString = share.toString();
      expect(debugString.contains('pst_highlySensitiveBearerSecretToken12345'), isFalse);
    });
  });
}

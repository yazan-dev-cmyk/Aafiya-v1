import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('RetryPolicy Unit Tests (D-06-01-R1, R2, R3)', () {
    test('Method eligibility: only GET and HEAD are eligible for auto-retry', () {
      const policy = RetryPolicy();
      expect(policy.shouldRetryMethod('GET'), isTrue);
      expect(policy.shouldRetryMethod('get'), isTrue);
      expect(policy.shouldRetryMethod('HEAD'), isTrue);
      expect(policy.shouldRetryMethod('head'), isTrue);

      // Mutating operations strictly prohibited
      expect(policy.shouldRetryMethod('POST'), isFalse);
      expect(policy.shouldRetryMethod('post'), isFalse);
      expect(policy.shouldRetryMethod('PUT'), isFalse);
      expect(policy.shouldRetryMethod('put'), isFalse);
      expect(policy.shouldRetryMethod('PATCH'), isFalse);
      expect(policy.shouldRetryMethod('patch'), isFalse);
      expect(policy.shouldRetryMethod('DELETE'), isFalse);
      expect(policy.shouldRetryMethod('delete'), isFalse);
    });

    test('Status code eligibility: only 502, 503, 504 are retryable', () {
      const policy = RetryPolicy();
      expect(policy.isRetryableStatusCode(502), isTrue);
      expect(policy.isRetryableStatusCode(503), isTrue);
      expect(policy.isRetryableStatusCode(504), isTrue);

      // 500 Internal Server Error is NOT transient
      expect(policy.isRetryableStatusCode(500), isFalse);

      // All 4xx client errors are NOT retryable
      expect(policy.isRetryableStatusCode(400), isFalse);
      expect(policy.isRetryableStatusCode(401), isFalse);
      expect(policy.isRetryableStatusCode(403), isFalse);
      expect(policy.isRetryableStatusCode(404), isFalse);
      expect(policy.isRetryableStatusCode(409), isFalse);
      expect(policy.isRetryableStatusCode(422), isFalse);
      expect(policy.isRetryableStatusCode(429), isFalse);

      // Success codes are NOT retryable
      expect(policy.isRetryableStatusCode(200), isFalse);
      expect(policy.isRetryableStatusCode(201), isFalse);
    });

    test('Exception eligibility: SocketException, ClientException, TimeoutException are retryable', () {
      const policy = RetryPolicy();
      expect(policy.isRetryableException(const SocketException('abort')), isTrue);
      expect(policy.isRetryableException(http.ClientException('abort')), isTrue);
      expect(policy.isRetryableException(TimeoutException('timeout')), isTrue);
      expect(policy.isRetryableException(FormatException('invalid json')), isFalse);
      expect(policy.isRetryableException(StateError('bad state')), isFalse);
    });

    test('Deterministic test mode produces Duration.zero delays', () {
      const policy = RetryPolicy(useDelays: false);
      expect(policy.delayForAttempt(1), equals(Duration.zero));
      expect(policy.delayForAttempt(2), equals(Duration.zero));
      expect(policy.delayForAttempt(3), equals(Duration.zero));
    });

    test('Production delay math scales exponentially with jitter', () {
      const policy = RetryPolicy(
        initialDelay: Duration(milliseconds: 350),
        useDelays: true,
      );
      final d1 = policy.delayForAttempt(1);
      final d2 = policy.delayForAttempt(2);

      // Attempt 1: ~350ms +/- 15% -> [297ms, 403ms]
      expect(d1.inMilliseconds, greaterThanOrEqualTo(290));
      expect(d1.inMilliseconds, lessThanOrEqualTo(410));

      // Attempt 2: ~700ms +/- 15% -> [595ms, 805ms]
      expect(d2.inMilliseconds, greaterThanOrEqualTo(580));
      expect(d2.inMilliseconds, lessThanOrEqualTo(820));
    });
  });

  group('ApiClient Retry Integration with RetryPolicy', () {
    const testPolicy = RetryPolicy(useDelays: false);

    test('GET retries on 503 Service Unavailable and succeeds on attempt 2', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        if (attempts == 1) {
          return http.Response(
            jsonEncode({'message': 'Service temporarily overloaded'}),
            503,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode({'data': {'items': [1, 2, 3]}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient(httpClient: mockClient, retryPolicy: testPolicy);
      final result = await client.get('/doctors');

      expect(attempts, equals(2));
      expect(result.isSuccess, isTrue);
      expect(result.dataOrNull?['data']['items'], equals([1, 2, 3]));
    });

    test('GET retries on 502 and 504 status codes up to 3 total attempts', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        if (attempts == 1) {
          return http.Response('Bad Gateway', 502);
        }
        if (attempts == 2) {
          return http.Response('Gateway Timeout', 504);
        }
        return http.Response(jsonEncode({'status': 'recovered'}), 200, headers: {'content-type': 'application/json'});
      });

      final client = ApiClient(httpClient: mockClient, retryPolicy: testPolicy);
      final result = await client.get('/clinics');

      expect(attempts, equals(3));
      expect(result.isSuccess, isTrue);
      expect(result.dataOrNull?['status'], equals('recovered'));
    });

    test('GET terminates and returns ServerException after exhausting all 3 attempts on 503', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        return http.Response(jsonEncode({'message': 'Unavailable'}), 503, headers: {'content-type': 'application/json'});
      });

      final client = ApiClient(httpClient: mockClient, retryPolicy: testPolicy);
      final result = await client.get('/clinics');

      expect(attempts, equals(3), reason: 'Must cap at 3 attempts (1 initial + 2 retries)');
      expect(result.isFailure, isTrue);
      expect(result.exceptionOrNull, isA<ServerException>());
      expect((result.exceptionOrNull as ServerException).statusCode, equals(503));
    });

    test('GET does NOT retry on 500 Internal Server Error (executes exactly once)', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        return http.Response(
          jsonEncode({'message': 'SQL Query Exception: syntax error'}),
          500,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient(httpClient: mockClient, retryPolicy: testPolicy);
      final result = await client.get('/appointments');

      expect(attempts, equals(1), reason: '500 Internal Server Error must not be retried');
      expect(result.isFailure, isTrue);
      expect(result.exceptionOrNull, isA<ServerException>());
      expect((result.exceptionOrNull as ServerException).statusCode, equals(500));
    });

    test('GET does NOT retry on 4xx Client Errors (401, 403, 404, 409, 422, 429)', () async {
      for (final code in [400, 401, 403, 404, 409, 422, 429]) {
        int attempts = 0;
        final mockClient = MockClient((request) async {
          attempts++;
          return http.Response(
            jsonEncode({'message': 'Client error $code'}),
            code,
            headers: {'content-type': 'application/json'},
          );
        });

        final client = ApiClient(httpClient: mockClient, retryPolicy: testPolicy);
        final result = await client.get('/test-$code');

        expect(attempts, equals(1), reason: 'Status code $code must not be retried');
        expect(result.isFailure, isTrue);
      }
    });

    test('POST requests are NEVER retried automatically on 503 or SocketException (Idempotency Safe)', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        throw const SocketException('Connection abort');
      });

      final client = ApiClient(httpClient: mockClient, retryPolicy: testPolicy);
      final result = await client.post('/appointments', body: {'slot_id': '101'});

      expect(attempts, equals(1), reason: 'POST must never retry automatically to prevent duplicate mutations');
      expect(result.isFailure, isTrue);
      expect(result.exceptionOrNull, isA<NetworkConnectionException>());
    });

    test('PUT and DELETE requests are NEVER retried automatically on 503', () async {
      int putAttempts = 0;
      int deleteAttempts = 0;

      final mockClient = MockClient((request) async {
        if (request.method == 'PUT') {
          putAttempts++;
          return http.Response('Service Unavailable', 503);
        }
        if (request.method == 'DELETE') {
          deleteAttempts++;
          return http.Response('Service Unavailable', 503);
        }
        return http.Response('OK', 200);
      });

      final client = ApiClient(httpClient: mockClient, retryPolicy: testPolicy);

      final putResult = await client.put('/clinic-staff/1/status', body: {'status': 'active'});
      expect(putAttempts, equals(1));
      expect(putResult.isFailure, isTrue);

      final delResult = await client.delete('/clinic-staff/1');
      expect(deleteAttempts, equals(1));
      expect(delResult.isFailure, isTrue);
    });
  });

  group('ConnectivityService Abstraction Unit Tests (D-06-01-C1)', () {
    test('MockConnectivityService emits online and offline state changes', () async {
      final service = MockConnectivityService(initialOnline: true);
      expect(await service.checkConnectivity(), isTrue);

      final states = <bool>[];
      final sub = service.onConnectivityChanged.listen(states.add);

      service.setOnline(false);
      service.setOnline(true);

      await Future.delayed(Duration.zero);
      expect(states, equals([false, true]));
      expect(await service.checkConnectivity(), isTrue);

      await sub.cancel();
      service.dispose();
    });
  });
}

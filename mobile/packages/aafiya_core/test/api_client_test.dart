import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('ApiClient Resilience & Hardening', () {
    test('GET request retries once on transient SocketException and succeeds', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        if (attempts == 1) {
          throw const SocketException('Software caused connection abort, errno = 103');
        }
        return http.Response(
          jsonEncode({'status': 'ok', 'data': {'test': true}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        retryPolicy: const RetryPolicy(useDelays: false),
      );
      final result = await apiClient.get('/test-endpoint');

      expect(attempts, equals(2));
      expect(result.isSuccess, isTrue);
      expect(result.dataOrNull?['status'], equals('ok'));
    });

    test('GET request retries once on transient ClientException and succeeds', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        if (attempts == 1) {
          throw http.ClientException('Software caused connection abort');
        }
        return http.Response(
          jsonEncode({'status': 'ok'}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        retryPolicy: const RetryPolicy(useDelays: false),
      );
      final result = await apiClient.get('/test-endpoint');

      expect(attempts, equals(2));
      expect(result.isSuccess, isTrue);
    });

    test('GET request fails after exhausting retries if SocketException persists, sanitizing error message', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        throw const SocketException('Software caused connection abort, errno = 103');
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        retryPolicy: const RetryPolicy(useDelays: false),
      );
      final result = await apiClient.get('/test-endpoint');

      expect(attempts, equals(3), reason: 'Must cap at 3 attempts (1 initial + 2 retries per D-06-01-R3)');
      expect(result.isFailure, isTrue);
      expect(result.exceptionOrNull, isA<NetworkConnectionException>());

      final ex = result.exceptionOrNull!;
      // User-facing message must NEVER contain raw OS errno or socket abort strings
      expect(
        ex.message,
        equals('Unable to connect to server. Please check your internet connection.'),
      );
      expect(ex.message.contains('Software caused connection abort'), isFalse);
      expect(ex.message.contains('103'), isFalse);

      // Raw cause is preserved internally for debugging
      expect(ex.cause, isA<SocketException>());
    });

    test('POST request by default does NOT retry on SocketException (safe idempotency)', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        throw const SocketException('Software caused connection abort, errno = 103');
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        retryPolicy: const RetryPolicy(useDelays: false),
      );
      final result = await apiClient.post('/appointments', body: {'doctor_id': '1'});

      expect(attempts, equals(1), reason: 'POST must not retry by default to prevent duplicate mutation');
      expect(result.isFailure, isTrue);
      expect(result.exceptionOrNull, isA<NetworkConnectionException>());
      expect(
        result.exceptionOrNull?.message,
        equals('Unable to connect to server. Please check your internet connection.'),
      );
    });

    test('POST requests are strictly non-retryable even if allowRetry is requested (D-06-01-R1)', () async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        throw const SocketException('Software caused connection abort, errno = 103');
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        retryPolicy: const RetryPolicy(useDelays: false),
      );
      final result = await apiClient.post(
        '/auth/login',
        body: {'email': 'test@aafiya.dz', 'password': 'password'},
        allowRetry: true,
      );

      expect(attempts, equals(1), reason: 'State mutations must never automatically retry per D-06-01-R1');
      expect(result.isFailure, isTrue);
      expect(result.exceptionOrNull, isA<NetworkConnectionException>());
    });

    test('TimeoutException returns clean timeout message without leaking internal details', () async {
      final mockClient = MockClient((request) async {
        throw TimeoutException('Client timeout exceeded');
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final result = await apiClient.get('/timeout-endpoint');

      expect(result.isFailure, isTrue);
      expect(result.exceptionOrNull, isA<NetworkTimeoutException>());
      expect(
        result.exceptionOrNull?.message,
        equals('The server took too long to respond. Please try again.'),
      );
    });

    group('Session Expiration 401 Notification Hook Tests (TASK-06-02)', () {
      test('401 on authenticated request invokes onUnauthorized hook', () async {
        int unauthorizedCallCount = 0;
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({'status': 'error', 'message': 'Unauthenticated.'}),
            401,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          onUnauthorized: () => unauthorizedCallCount++,
        );

        final result = await apiClient.get('/protected-endpoint');

        expect(unauthorizedCallCount, equals(1));
        expect(result.isFailure, isTrue);
        expect(result.exceptionOrNull, isA<UnauthorizedException>());
      });

      test('callback receives notification without altering the original ApiFailure response', () async {
        bool hookFired = false;
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({'status': 'error', 'message': 'Token expired.'}),
            401,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          onUnauthorized: () {
            hookFired = true;
          },
        );

        final result = await apiClient.get('/profile');

        expect(hookFired, isTrue);
        expect(result.isFailure, isTrue);
        final ex = result.exceptionOrNull as UnauthorizedException;
        expect(ex.statusCode, equals(401));
        expect(ex.message, equals('Token expired.'));
      });

      test('callback exception does not alter or suppress the original ApiFailure', () async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({'status': 'error', 'message': 'Session expired.'}),
            401,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          onUnauthorized: () {
            throw Exception('Error thrown inside unauthorized callback');
          },
        );

        final result = await apiClient.get('/agenda');

        expect(result.isFailure, isTrue);
        expect(result.exceptionOrNull, isA<UnauthorizedException>());
        expect(result.exceptionOrNull?.message, equals('Session expired.'));
      });

      test('notifyUnauthorized: false prevents invoking onUnauthorized callback', () async {
        int unauthorizedCallCount = 0;
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({'status': 'error', 'message': 'Session invalid.'}),
            401,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          onUnauthorized: () => unauthorizedCallCount++,
        );

        final result = await apiClient.get(
          '/auth/me',
          notifyUnauthorized: false,
        );

        expect(unauthorizedCallCount, equals(0), reason: 'restoreSession must exclude runtime unauthorized hook');
        expect(result.isFailure, isTrue);
        expect(result.exceptionOrNull, isA<UnauthorizedException>());
      });

      test('non-401 responses do not invoke onUnauthorized hook', () async {
        int unauthorizedCallCount = 0;
        final mockClient = MockClient((request) async {
          final path = request.url.path;
          if (path.contains('200')) {
            return http.Response(jsonEncode({'status': 'ok'}), 200);
          } else if (path.contains('403')) {
            return http.Response(jsonEncode({'status': 'forbidden'}), 403);
          } else if (path.contains('500')) {
            return http.Response(jsonEncode({'status': 'server_error'}), 500);
          }
          return http.Response(jsonEncode({'status': 'not_found'}), 404);
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          onUnauthorized: () => unauthorizedCallCount++,
          retryPolicy: const RetryPolicy(useDelays: false),
        );

        await apiClient.get('/200');
        await apiClient.get('/403');
        await apiClient.get('/404');
        await apiClient.get('/500');

        expect(unauthorizedCallCount, equals(0));
      });

      test('unauthenticated requests (requiresAuth == false) do not invoke onUnauthorized even on 401', () async {
        int unauthorizedCallCount = 0;
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({'status': 'error', 'message': 'Deactivated.'}),
            401,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          onUnauthorized: () => unauthorizedCallCount++,
        );

        final result = await apiClient.post(
          '/auth/login',
          body: {'email': 'deactivated@aafiya.dz', 'password': 'pass'},
          requiresAuth: false,
        );

        expect(unauthorizedCallCount, equals(0), reason: 'Login endpoint must not trigger session expiration hook');
        expect(result.isFailure, isTrue);
      });

      test('401 is never automatically retried (executes exactly 1 attempt per ADR-06-01-01)', () async {
        int attempts = 0;
        final mockClient = MockClient((request) async {
          attempts++;
          return http.Response(
            jsonEncode({'status': 'error', 'message': 'Unauthenticated.'}),
            401,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          retryPolicy: const RetryPolicy(useDelays: false),
        );

        final result = await apiClient.get('/protected', allowRetry: true);

        expect(attempts, equals(1));
        expect(result.isFailure, isTrue);
        expect(result.exceptionOrNull, isA<UnauthorizedException>());
      });

      test('setOnUnauthorized updates callback dynamically', () async {
        int count1 = 0;
        int count2 = 0;
        final mockClient = MockClient((request) async {
          return http.Response(jsonEncode({'status': 'error'}), 401);
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          onUnauthorized: () => count1++,
        );

        await apiClient.get('/test1');
        expect(count1, equals(1));
        expect(count2, equals(0));

        apiClient.setOnUnauthorized(() => count2++);
        await apiClient.get('/test2');
        expect(count1, equals(1));
        expect(count2, equals(1));
      });
    });
  });
}

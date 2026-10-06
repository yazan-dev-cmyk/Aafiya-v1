// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

class _ThrowingReadFlutterSecureStorage extends FlutterSecureStorage {
  @override
  Future<String?> read({
    required String key,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    throw PlatformException(code: 'test-read', message: 'simulated read failure');
  }
}

class _ThrowingWriteFlutterSecureStorage extends FlutterSecureStorage {
  @override
  Future<void> write({
    required String key,
    required String? value,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    throw PlatformException(code: 'test-write', message: 'simulated write failure');
  }
}

class _ThrowingDeleteFlutterSecureStorage extends FlutterSecureStorage {
  @override
  Future<void> delete({
    required String key,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    throw PlatformException(code: 'test-delete', message: 'simulated delete failure');
  }
}

void main() {
  group('SecureTokenStorage', () {
    setUp(() {
      FlutterSecureStorage.setMockInitialValues({});
    });

    test('save then get returns the stored token', () async {
      final storage = SecureTokenStorage();
      await storage.saveToken('test_sanctum_token_123');

      expect(await storage.getToken(), equals('test_sanctum_token_123'));
      expect(await storage.hasToken(), isTrue);
    });

    test('get with no stored token returns null', () async {
      final storage = SecureTokenStorage();

      expect(await storage.getToken(), isNull);
      expect(await storage.hasToken(), isFalse);
    });

    test('clear removes the stored token', () async {
      final storage = SecureTokenStorage();
      await storage.saveToken('test_sanctum_token_123');
      expect(await storage.hasToken(), isTrue);

      await storage.clearToken();

      expect(await storage.hasToken(), isFalse);
      expect(await storage.getToken(), isNull);
    });

    test('a new SecureTokenStorage instance retrieves previously stored data', () async {
      final first = SecureTokenStorage();
      await first.saveToken('persisted_across_instances');

      final second = SecureTokenStorage();

      expect(await second.getToken(), equals('persisted_across_instances'));
    });

    test('failure-soft: read failure behaves as no token', () async {
      final storage = SecureTokenStorage(
        secureStorage: _ThrowingReadFlutterSecureStorage(),
      );

      expect(await storage.getToken(), isNull);
      expect(await storage.hasToken(), isFalse);
    });

    test('failure-soft: write failure does not throw', () async {
      final storage = SecureTokenStorage(
        secureStorage: _ThrowingWriteFlutterSecureStorage(),
      );

      await expectLater(storage.saveToken('secret'), completes);
    });

    test('failure-soft: delete failure does not throw', () async {
      final storage = SecureTokenStorage(
        secureStorage: _ThrowingDeleteFlutterSecureStorage(),
      );

      await expectLater(storage.clearToken(), completes);
    });
  });

  group('SecureTokenStorage with AuthSessionManager', () {
    setUp(() {
      FlutterSecureStorage.setMockInitialValues({});
    });

    test('logout clears the persisted token', () async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith(ApiEndpoints.logout)) {
          return http.Response(jsonEncode({'status': 'success'}), 200,
              headers: {'content-type': 'application/json'});
        }
        return http.Response('Not Found', 404);
      });

      final storage = SecureTokenStorage();
      final client = ApiClient(tokenStorage: storage, httpClient: mockHttp);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const user = User(
        id: 'p1',
        name: 'Patient Aafiya',
        email: 'patient@aafiya.dz',
        roles: [UserRole.patient],
      );

      await manager.setAuthenticatedUser(token: 'token_abc', user: user);
      expect(await storage.getToken(), equals('token_abc'));

      await manager.logout();

      expect(manager.isAuthenticated, isFalse);
      expect(await storage.getToken(), isNull);
    });

    test('restoreSession consumes the persisted token via /auth/me', () async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith(ApiEndpoints.me)) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {
                'id': 'p2',
                'name': 'Patient Aafiya',
                'email': 'patient2@aafiya.dz',
                'roles': ['patient'],
                'is_active': true,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final storage = SecureTokenStorage();
      await storage.saveToken('persisted_token_42');

      final client = ApiClient(tokenStorage: storage, httpClient: mockHttp);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      await manager.restoreSession();

      expect(manager.isAuthenticated, isTrue);
      expect(manager.currentUser?.email, equals('patient2@aafiya.dz'));
      expect(await storage.getToken(), equals('persisted_token_42'));
    });

    test('401 invalidation clears the persisted token', () async {
      final storage = SecureTokenStorage();
      final client = ApiClient(tokenStorage: storage);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const user = User(
        id: 'p3',
        name: 'Patient Aafiya',
        email: 'patient3@aafiya.dz',
        roles: [UserRole.patient],
      );

      await manager.setAuthenticatedUser(token: 'active_token', user: user);
      expect(await storage.getToken(), equals('active_token'));

      manager.handleUnauthorized();
      await Future<void>.delayed(Duration.zero);

      expect(manager.isAuthenticated, isFalse);
      expect((manager.state as Unauthenticated).message, equals('Session expired.'));
      expect(await storage.getToken(), isNull);
    });
  });
}
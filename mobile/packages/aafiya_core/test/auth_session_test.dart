import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('AuthSessionManager & TokenStorage', () {
    test('in-memory token storage stores and clears token', () async {
      final storage = InMemoryTokenStorage();
      expect(await storage.hasToken(), isFalse);
      expect(await storage.getToken(), isNull);

      await storage.saveToken('test_sanctum_token_123');
      expect(await storage.hasToken(), isTrue);
      expect(await storage.getToken(), equals('test_sanctum_token_123'));

      await storage.clearToken();
      expect(await storage.hasToken(), isFalse);
      expect(await storage.getToken(), isNull);
    });

    test('AuthSessionManager sets authenticated user correctly', () async {
      final storage = InMemoryTokenStorage();
      final client = ApiClient(tokenStorage: storage);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      expect(manager.isAuthenticated, isFalse);
      expect(manager.state, isA<AuthInitial>());

      const user = User(
        id: '10',
        name: 'Doctor Aafiya',
        email: 'doctor@aafiya.dz',
        roles: [UserRole.doctor],
      );

      await manager.setAuthenticatedUser(token: 'token_abc', user: user);

      expect(manager.isAuthenticated, isTrue);
      expect(manager.currentUser?.email, equals('doctor@aafiya.dz'));
      expect(await storage.getToken(), equals('token_abc'));

      await manager.logout();
      expect(manager.isAuthenticated, isFalse);
      expect(manager.currentUser, isNull);
      expect(await storage.getToken(), isNull);
    });

    test('AuthSessionManager expireSession invalidates token and updates state', () async {
      final storage = InMemoryTokenStorage('initial_token');
      final client = ApiClient(tokenStorage: storage);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const user = User(
        id: '11',
        name: 'Patient Test',
        email: 'patient@aafiya.dz',
        roles: [UserRole.patient],
      );

      await manager.setAuthenticatedUser(token: 'initial_token', user: user);
      expect(manager.isAuthenticated, isTrue);

      await manager.expireSession('Token expired after 1440 minutes');
      expect(manager.isAuthenticated, isFalse);
      expect(await storage.getToken(), isNull);
      expect(manager.state, isA<Unauthenticated>());
      final unauth = manager.state as Unauthenticated;
      expect(unauth.message, contains('1440 minutes'));
    });

    test('handleUnauthorized invalidates session, clears token, resets clinic context, and notifies listeners', () async {
      final storage = InMemoryTokenStorage('active_token');
      final client = ApiClient(tokenStorage: storage);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const user = User(
        id: '20',
        name: 'Dr. Sarah',
        email: 'sarah@aafiya.dz',
        roles: [UserRole.doctor],
      );

      await manager.setAuthenticatedUser(token: 'active_token', user: user);
      manager.setAuthorizedClinics([
        const DoctorClinic(id: 'c1', name: 'Algiers Clinic', isActive: true),
      ]);
      expect(manager.activeClinicId, equals('c1'));
      expect(manager.isAuthenticated, isTrue);

      int listenerNotificationCount = 0;
      manager.addListener(() => listenerNotificationCount++);

      manager.handleUnauthorized();
      await Future<void>.delayed(Duration.zero);

      expect(manager.isAuthenticated, isFalse);
      expect(manager.state, isA<Unauthenticated>());
      expect((manager.state as Unauthenticated).message, equals('Session expired.'));
      expect(await storage.getToken(), isNull);
      expect(manager.activeClinic, isNull);
      expect(manager.authorizedClinics.isEmpty, isTrue);
      expect(client.activeClinicId, isNull);
      expect(listenerNotificationCount, equals(1));
      expect(manager.isSessionExpiring, isTrue);
    });

    test('concurrent calls to handleUnauthorized coalesce (single-flight serialized invalidation)', () async {
      final storage = InMemoryTokenStorage('token_concurrent');
      final client = ApiClient(tokenStorage: storage);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const user = User(
        id: '21',
        name: 'Assistant Ali',
        email: 'ali@aafiya.dz',
        roles: [UserRole.assistant],
      );

      await manager.setAuthenticatedUser(token: 'token_concurrent', user: user);

      int notifications = 0;
      manager.addListener(() => notifications++);

      // Simulate 5 simultaneous requests receiving 401
      for (int i = 0; i < 5; i++) {
        manager.handleUnauthorized();
      }
      await Future<void>.delayed(Duration.zero);

      expect(notifications, equals(1), reason: 'Concurrent 401s must coalesce into exactly one invalidation flow');
      expect(manager.isAuthenticated, isFalse);
      expect(manager.isSessionExpiring, isTrue);
    });

    test('handleUnauthorized is a no-op when not in Authenticated state', () async {
      final storage = InMemoryTokenStorage();
      final client = ApiClient(tokenStorage: storage);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      expect(manager.state, isA<AuthInitial>());

      int notifications = 0;
      manager.addListener(() => notifications++);

      manager.handleUnauthorized();
      await Future<void>.delayed(Duration.zero);

      expect(notifications, equals(0));
      expect(manager.isSessionExpiring, isFalse);
    });

    test('failure in TokenStorage.clearToken does not prevent state invalidation and context purge (failure-resilience)', () async {
      final faultyStorage = _FailingTokenStorage('valid_token');
      final client = ApiClient(tokenStorage: faultyStorage);
      final manager = AuthSessionManager(tokenStorage: faultyStorage, apiClient: client);

      const user = User(
        id: '22',
        name: 'Booking Center Op',
        email: 'bc@aafiya.dz',
        roles: [UserRole.bookingCenter],
      );

      await manager.setAuthenticatedUser(token: 'valid_token', user: user);
      manager.setAuthorizedClinics([
        const DoctorClinic(id: 'c2', name: 'Oran Clinic', isActive: true),
      ]);
      expect(manager.activeClinicId, equals('c2'));

      // Configure storage to throw on clearToken
      faultyStorage.shouldThrowOnClear = true;

      manager.handleUnauthorized();
      await Future<void>.delayed(Duration.zero);

      // Must still transition to Unauthenticated and clear clinic context
      expect(manager.isAuthenticated, isFalse);
      expect(manager.state, isA<Unauthenticated>());
      expect((manager.state as Unauthenticated).message, equals('Session expired.'));
      expect(manager.activeClinic, isNull);
      expect(manager.authorizedClinics.isEmpty, isTrue);
      expect(client.activeClinicId, isNull);
    });

    test('setAuthenticatedUser resets _isSessionExpiring so future independent 401s work', () async {
      final storage = InMemoryTokenStorage('token_1');
      final client = ApiClient(tokenStorage: storage);
      final manager = AuthSessionManager(tokenStorage: storage, apiClient: client);

      const user = User(id: '23', name: 'User 1', email: 'u1@aafiya.dz', roles: [UserRole.patient]);
      await manager.setAuthenticatedUser(token: 'token_1', user: user);

      // First expiration
      manager.handleUnauthorized();
      await Future<void>.delayed(Duration.zero);
      expect(manager.isSessionExpiring, isTrue);
      expect(manager.isAuthenticated, isFalse);

      // User logs in again
      const user2 = User(id: '24', name: 'User 2', email: 'u2@aafiya.dz', roles: [UserRole.patient]);
      await manager.setAuthenticatedUser(token: 'token_2', user: user2);
      expect(manager.isSessionExpiring, isFalse, reason: 'Guard must be reset upon re-authentication');
      expect(manager.isAuthenticated, isTrue);

      // Second independent expiration must work
      int notifications = 0;
      manager.addListener(() => notifications++);
      manager.handleUnauthorized();
      await Future<void>.delayed(Duration.zero);
      expect(notifications, equals(1));
      expect(manager.isAuthenticated, isFalse);
    });
  });
}

class _FailingTokenStorage implements TokenStorage {
  _FailingTokenStorage(this._token);
  String? _token;
  bool shouldThrowOnClear = false;

  @override
  Future<String?> getToken() async => _token;

  @override
  Future<void> saveToken(String token) async {
    _token = token;
  }

  @override
  Future<void> clearToken() async {
    if (shouldThrowOnClear) {
      throw Exception('Hardware keystore unavailable');
    }
    _token = null;
  }

  @override
  Future<bool> hasToken() async => _token != null && _token!.isNotEmpty;
}

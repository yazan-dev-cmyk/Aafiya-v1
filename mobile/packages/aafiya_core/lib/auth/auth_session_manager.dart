import 'dart:async';
import 'package:flutter/foundation.dart';

import '../errors/app_exception.dart';
import '../models/doctor_clinic.dart';
import '../models/user.dart';
import '../models/user_role.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';
import 'token_storage.dart';

/// Authentication session states.
sealed class AuthSessionState {
  const AuthSessionState();
}

class AuthInitial extends AuthSessionState {
  const AuthInitial();
}

class AuthLoading extends AuthSessionState {
  const AuthLoading();
}

class Authenticated extends AuthSessionState {
  const Authenticated(this.user);
  final User user;
}

class Unauthenticated extends AuthSessionState {
  const Unauthenticated([this.message]);
  final String? message;
}

class AuthError extends AuthSessionState {
  const AuthError(this.exception);
  final AppException exception;
}

/// Central manager for session state, token persistence, and authentication events.
class AuthSessionManager extends ChangeNotifier {
  AuthSessionManager({
    required TokenStorage tokenStorage,
    required ApiClient apiClient,
  })  : _tokenStorage = tokenStorage,
        _apiClient = apiClient {
    _apiClient.setOnUnauthorized(handleUnauthorized);
  }

  final TokenStorage _tokenStorage;
  final ApiClient _apiClient;
  ApiClient get apiClient => _apiClient;

  bool _isSessionExpiring = false;
  bool get isSessionExpiring => _isSessionExpiring;

  AuthSessionState _state = const AuthInitial();
  AuthSessionState get state => _state;

  DoctorClinic? _activeClinic;
  DoctorClinic? get activeClinic => _activeClinic;
  String? get activeClinicId => _activeClinic?.id ?? _apiClient.activeClinicId;

  List<DoctorClinic> _authorizedClinics = const [];
  List<DoctorClinic> get authorizedClinics => _authorizedClinics;

  User? get currentUser => switch (_state) {
        Authenticated(:final user) => user,
        _ => null,
      };

  bool get isAuthenticated => _state is Authenticated;

  void _syncAssistantClinicContext(User user) {
    if (!user.roles.contains(UserRole.doctorAssistant)) {
      return;
    }
    if (user.clinics.isNotEmpty) {
      setAuthorizedClinics(user.clinics);
    } else if (user.clinic != null) {
      setAuthorizedClinics([user.clinic!]);
    } else {
      setAuthorizedClinics([]);
    }
  }

  /// Restores session on application launch by checking persisted token and verifying with `/auth/me`.
  Future<void> restoreSession() async {
    _state = const AuthLoading();
    notifyListeners();

    final token = await _tokenStorage.getToken();
    if (token == null || token.isEmpty) {
      _state = const Unauthenticated();
      notifyListeners();
      return;
    }

    final result = await _apiClient.get(
      ApiEndpoints.me,
      notifyUnauthorized: false,
    );
    switch (result) {
      case ApiSuccess(:final data):
        final userData = data['data'];
        if (userData is Map<String, dynamic>) {
          final user = User.fromJson(userData);
          _state = Authenticated(user);
          _syncAssistantClinicContext(user);
        } else {
          await _tokenStorage.clearToken();
          _state = const Unauthenticated('Invalid user profile response.');
        }
      case ApiFailure(:final exception):
        if (exception is UnauthorizedException) {
          await _tokenStorage.clearToken();
          _state = const Unauthenticated('Session expired. Please sign in again.');
        } else {
          _state = AuthError(exception);
        }
    }

    notifyListeners();
  }

  /// Establishes authenticated state after successful login response.
  Future<void> setAuthenticatedUser({
    required String token,
    required User user,
  }) async {
    _isSessionExpiring = false;
    await _tokenStorage.saveToken(token);
    _state = Authenticated(user);
    _syncAssistantClinicContext(user);
    notifyListeners();
  }

  /// Sets the list of authorized clinics and resolves the active clinic context.
  ///
  /// Priority for resolving the active clinic:
  /// 1. [preferredClinicId] if present and active in [clinics].
  /// 2. Currently selected active clinic if still active and present in [clinics].
  /// 3. Primary active clinic (`isPrimary == true && isActive == true`).
  /// 4. First active clinic in [clinics].
  /// 5. If zero active clinics, active clinic is cleared (`null`).
  void setAuthorizedClinics(List<DoctorClinic> clinics, {String? preferredClinicId}) {
    _authorizedClinics = List.unmodifiable(clinics);
    final activeClinics = _authorizedClinics.where((c) => c.isActive).toList();

    if (activeClinics.isEmpty) {
      _activeClinic = null;
      _apiClient.setActiveClinicId(null);
      notifyListeners();
      return;
    }

    DoctorClinic? resolved;
    if (preferredClinicId != null) {
      resolved = activeClinics.where((c) => c.id == preferredClinicId).firstOrNull;
    }

    if (resolved == null && _activeClinic != null) {
      resolved = activeClinics.where((c) => c.id == _activeClinic!.id).firstOrNull;
    }

    resolved ??= activeClinics.where((c) => c.isPrimary).firstOrNull;

    resolved ??= activeClinics.first;

    _activeClinic = resolved;
    _apiClient.setActiveClinicId(resolved.id);
    notifyListeners();
  }

  /// Switches active clinic context to [clinicId].
  ///
  /// Returns `true` if switch succeeded.
  /// Returns `false` if [clinicId] is not authorized or is inactive (fails closed).
  bool switchActiveClinic(String clinicId) {
    final candidate = _authorizedClinics.where((c) => c.id == clinicId && c.isActive).firstOrNull;
    if (candidate == null) {
      return false;
    }

    _activeClinic = candidate;
    _apiClient.setActiveClinicId(candidate.id);
    notifyListeners();
    return true;
  }

  /// Clears active clinic context without invalidating entire session.
  void clearActiveClinic() {
    _activeClinic = null;
    _apiClient.setActiveClinicId(null);
    notifyListeners();
  }

  /// Invalidates session locally and notifies backend via `/auth/logout`.
  Future<void> logout() async {
    try {
      await _apiClient.post(ApiEndpoints.logout, allowRetry: true);
    } catch (_) {
      // Best-effort remote invalidation; local token is cleared regardless.
    } finally {
      _isSessionExpiring = false;
      try {
        await _tokenStorage.clearToken();
      } catch (_) {}
      _activeClinic = null;
      _authorizedClinics = const [];
      _apiClient.setActiveClinicId(null);
      _state = const Unauthenticated();
      notifyListeners();
    }
  }

  /// Handles runtime HTTP 401 unauthorized notifications from [ApiClient].
  ///
  /// Enforces single-flight serialized invalidation per ADR-06-02-01:
  /// Synchronously checks and claims [_isSessionExpiring] before the first await,
  /// guaranteeing that concurrent 401 responses cannot spawn duplicate invalidations.
  void handleUnauthorized() {
    if (_isSessionExpiring || _state is! Authenticated) {
      return;
    }
    _isSessionExpiring = true;
    _performSessionInvalidation();
  }

  /// Executes failure-resilient session invalidation.
  Future<void> _performSessionInvalidation() async {
    try {
      await _tokenStorage.clearToken();
    } catch (_) {
      // Failure in storage driver must not prevent state invalidation.
    }

    _activeClinic = null;
    _authorizedClinics = const [];
    _apiClient.setActiveClinicId(null);
    _state = const Unauthenticated('Session expired.');
    notifyListeners();
  }

  /// Manually force session expiry / unauthenticated state.
  Future<void> expireSession([String? reason]) async {
    _isSessionExpiring = true;
    await _performSessionInvalidation();
    if (reason != null && reason != 'Session expired.') {
      _state = Unauthenticated(reason);
      notifyListeners();
    }
  }
}

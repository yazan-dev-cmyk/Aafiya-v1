import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:aafiya_core/aafiya_core.dart';

/// Manages unread notification counting for the authenticated patient.
///
/// Features:
/// - Authoritative count derived from unacknowledged items within the latest 20 notifications.
/// - Idempotent acknowledgment tracking via `Set<String>` of unacknowledged and locally acknowledged IDs.
/// - Dual protection against refresh-vs-acknowledgment races:
///   1. In-flight request generation invalidation on acknowledgment (`_requestGeneration++`).
///   2. Local tombstone set (`_locallyAcknowledgedIds`) preventing stale responses from resurrecting acknowledged items.
/// - Strict session isolation and stale cross-account response rejection (`sessionGeneration`).
class PatientNotificationCountManager extends ChangeNotifier {
  PatientNotificationCountManager({
    required AuthSessionManager sessionManager,
    required PatientNotificationService service,
  })  : _sessionManager = sessionManager,
        _service = service {
    _lastSessionGeneration = _sessionManager.sessionGeneration;
    _sessionManager.addListener(_onSessionChanged);
  }

  final AuthSessionManager _sessionManager;
  final PatientNotificationService _service;

  int _unreadCount = 0;
  bool _isLoading = false;
  String? _errorMessage;

  Set<String> _unacknowledgedIds = <String>{};
  final Set<String> _locallyAcknowledgedIds = <String>{};

  int _requestGeneration = 0;
  int? _lastSessionGeneration;

  /// Number of unread notifications in the active window.
  int get unreadCount => _unreadCount;

  /// Whether a count refresh is currently in flight.
  bool get isLoading => _isLoading;

  /// Last error message, if any.
  String? get errorMessage => _errorMessage;

  /// Set of currently unacknowledged notification IDs.
  @visibleForTesting
  Set<String> get unacknowledgedIds => Set.unmodifiable(_unacknowledgedIds);

  /// Set of locally acknowledged notification IDs (tombstones).
  @visibleForTesting
  Set<String> get locallyAcknowledgedIds =>
      Set.unmodifiable(_locallyAcknowledgedIds);

  /// Current request generation counter.
  @visibleForTesting
  int get requestGeneration => _requestGeneration;

  void _onSessionChanged() {
    final currentGen = _sessionManager.sessionGeneration;
    if (!_sessionManager.isAuthenticated) {
      reset();
      _lastSessionGeneration = currentGen;
      return;
    }

    if (currentGen != _lastSessionGeneration) {
      _lastSessionGeneration = currentGen;
      reset();
      refresh();
    }
  }

  int? _lastServerCount;

  /// Refreshes the unread count by querying the server-authoritative unread count endpoint.
  Future<void> refresh() async {
    if (!_sessionManager.isAuthenticated) {
      reset();
      return;
    }

    final sessionGen = _sessionManager.sessionGeneration;
    final requestGen = ++_requestGeneration;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _service.fetchUnreadCount();

    // Session isolation and in-flight invalidation check
    if (_sessionManager.sessionGeneration != sessionGen ||
        _requestGeneration != requestGen ||
        !_sessionManager.isAuthenticated) {
      return;
    }

    switch (result) {
      case ApiSuccess(:final data):
        _isLoading = false;
        _errorMessage = null;
        final serverCount = data;

        // If server count decreased or reached 0, server has confirmed local acknowledgments
        if ((_lastServerCount != null && serverCount < _lastServerCount!) ||
            serverCount == 0) {
          _locallyAcknowledgedIds.clear();
        }

        _lastServerCount = serverCount;
        _unreadCount = (serverCount - _locallyAcknowledgedIds.length)
            .clamp(0, serverCount);
        if (_unreadCount == 0) {
          _unacknowledgedIds.clear();
        }
        notifyListeners();

      case ApiFailure(:final exception):
        // Fallback to paginated fetch for backwards compatibility or offline mocking
        final fallbackResult = await _service.fetchNotifications(page: 1);
        if (_sessionManager.sessionGeneration != sessionGen ||
            _requestGeneration != requestGen ||
            !_sessionManager.isAuthenticated) {
          return;
        }

        _isLoading = false;

        switch (fallbackResult) {
          case ApiSuccess(data: final pageData):
            _errorMessage = null;

            // Purge locally acknowledged tombstones that server has confirmed as acknowledged
            for (final item in pageData.items) {
              if (item.isAcknowledged) {
                _locallyAcknowledgedIds.remove(item.id);
              }
            }

            // Rebuild unacknowledged set, strictly excluding anything still in local tombstones
            _unacknowledgedIds = pageData.items
                .where((n) =>
                    !n.isAcknowledged &&
                    !_locallyAcknowledgedIds.contains(n.id))
                .map((n) => n.id)
                .toSet();

            _unreadCount = _unacknowledgedIds.length;
            _lastServerCount = _unreadCount;
            notifyListeners();

          case ApiFailure():
            _errorMessage = exception.message;
            notifyListeners();
        }
    }
  }

  /// Marks an individual notification as acknowledged idempotently.
  ///
  /// Increments `_requestGeneration` to invalidate in-flight refreshes,
  /// adds `id` to `_locallyAcknowledgedIds`, and removes it from `_unacknowledgedIds`.
  void markAcknowledged(String id) {
    if (id.isEmpty) return;

    // Record tombstone so older/stale responses cannot resurrect it
    _locallyAcknowledgedIds.add(id);

    // Invalidate any in-flight refresh requests that were dispatched before this acknowledgment
    _requestGeneration++;

    _unacknowledgedIds.remove(id);
    if (_unreadCount > 0) {
      _unreadCount--;
    }
    notifyListeners();
  }

  /// Resets state and clears in-memory tracking.
  void reset() {
    _unreadCount = 0;
    _isLoading = false;
    _errorMessage = null;
    _lastServerCount = null;
    _unacknowledgedIds.clear();
    _locallyAcknowledgedIds.clear();
    _requestGeneration++;
    notifyListeners();
  }

  @override
  void dispose() {
    _sessionManager.removeListener(_onSessionChanged);
    super.dispose();
  }
}

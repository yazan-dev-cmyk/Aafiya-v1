import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Abstract service defining mobile connectivity monitoring contract.
///
/// Enforces Decision D-06-01-C1:
/// - Decouples UI and presentation layers from platform channel specifics.
/// - Distinguishes local network interface availability from end-to-end server reachability.
abstract class ConnectivityService {
  /// Stream emitting boolean connection status: true when connected, false when offline.
  Stream<bool> get onConnectivityChanged;

  /// Performs an on-demand check of current device network interface state.
  Future<bool> checkConnectivity();
}

/// Production implementation of [ConnectivityService] using [connectivity_plus].
class PlatformConnectivityService implements ConnectivityService {
  PlatformConnectivityService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  static bool _evaluateResults(List<ConnectivityResult> results) {
    return results.any((result) => result != ConnectivityResult.none);
  }

  @override
  Stream<bool> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged.map(_evaluateResults).distinct();
  }

  @override
  Future<bool> checkConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    return _evaluateResults(results);
  }
}

/// Controllable in-memory implementation of [ConnectivityService] for deterministic testing.
class MockConnectivityService implements ConnectivityService {
  MockConnectivityService({bool initialOnline = true})
      : _isOnline = initialOnline {
    _controller = StreamController<bool>.broadcast();
  }

  bool _isOnline;
  late final StreamController<bool> _controller;

  @override
  Stream<bool> get onConnectivityChanged => _controller.stream;

  @override
  Future<bool> checkConnectivity() async => _isOnline;

  /// Updates connection state and notifies active stream listeners.
  void setOnline(bool online) {
    _isOnline = online;
    _controller.add(online);
  }

  void dispose() {
    _controller.close();
  }
}

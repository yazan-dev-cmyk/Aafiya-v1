import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:http/http.dart' as http;

/// Authoritative retry policy for AAFIYA API client.
///
/// Enforces Decisions D-06-01-R1, D-06-01-R2, and D-06-01-R3:
/// - Strictly restricts automatic retries to safe, idempotent read operations (GET, HEAD).
/// - Automatically retries only on transient network failures and 502, 503, 504 status codes.
/// - Caps total attempts at 3 (1 initial + up to 2 retries) with exponential backoff and jitter.
/// - Supports deterministic zero-delay test mode.
class RetryPolicy {
  const RetryPolicy({
    this.maxAttempts = 3,
    this.initialDelay = const Duration(milliseconds: 350),
    this.maxDelay = const Duration(milliseconds: 1500),
    this.useDelays = true,
    this.random,
  });

  /// Maximum total attempts (initial + retries). Hard bounded to 3 by default.
  final int maxAttempts;

  /// Base backoff duration before the first retry.
  final Duration initialDelay;

  /// Maximum backoff duration cap.
  final Duration maxDelay;

  /// When false, [delayForAttempt] returns [Duration.zero] for deterministic testing.
  final bool useDelays;

  /// Random generator for jitter injection.
  final Random? random;

  /// Safe read HTTP methods permitted for automatic retry.
  static const Set<String> safeMethods = {'GET', 'HEAD'};

  /// Transient server status codes eligible for automatic retry.
  static const Set<int> transientStatusCodes = {502, 503, 504};

  /// Evaluates whether an HTTP method is eligible for automatic retry.
  bool shouldRetryMethod(String method) {
    return safeMethods.contains(method.toUpperCase());
  }

  /// Evaluates whether an HTTP status code is transient and eligible for retry.
  bool isRetryableStatusCode(int statusCode) {
    return transientStatusCodes.contains(statusCode);
  }

  /// Evaluates whether an exception represents a transient network I/O failure.
  bool isRetryableException(Object exception) {
    return exception is SocketException ||
        exception is http.ClientException ||
        exception is TimeoutException;
  }

  /// Calculates the backoff delay for a given retry attempt index (1-based: 1 for 1st retry, 2 for 2nd retry).
  Duration delayForAttempt(int retryCount) {
    if (!useDelays || retryCount < 1) {
      return Duration.zero;
    }

    final int factor = 1 << (retryCount - 1); // 1, 2, 4...
    final int baseMs = initialDelay.inMilliseconds * factor;

    // Apply bounded jitter: +/- 15%
    final rng = random ?? Random();
    final double jitterMultiplier = 0.85 + (rng.nextDouble() * 0.30); // [0.85, 1.15]
    final int jitteredMs = (baseMs * jitterMultiplier).round();

    final clampedMs = min(jitteredMs, maxDelay.inMilliseconds);
    return Duration(milliseconds: clampedMs);
  }
}

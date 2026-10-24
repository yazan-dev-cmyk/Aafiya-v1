import 'dart:async';
import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../errors/app_exception.dart';
import '../models/shared_patient_record.dart';
import '../network/api_client.dart';
import '../network/api_result.dart';

/// Sealed result container for shared medical record resolution operations.
@immutable
sealed class SharedRecordResult {
  const SharedRecordResult();
}

/// Successful resolution returning the privacy-minimized shared record.
@immutable
final class SharedRecordSuccess extends SharedRecordResult {
  const SharedRecordSuccess(this.record);
  final SharedPatientRecord record;
}

/// Base class for all typed failures in shared record resolution.
@immutable
sealed class SharedRecordFailure extends SharedRecordResult {
  const SharedRecordFailure(this.message);
  final String message;
}

/// HTTP 403: Incorrect PIN entered, preserving remaining attempt count if provided.
@immutable
final class SharedRecordWrongPinFailure extends SharedRecordFailure {
  const SharedRecordWrongPinFailure(super.message, {this.remainingAttempts});
  final int? remainingAttempts;
}

/// HTTP 404: Shared record token not found or invalid.
@immutable
final class SharedRecordNotFoundFailure extends SharedRecordFailure {
  const SharedRecordNotFoundFailure(super.message);
}

/// HTTP 410: Shared record link has expired or been revoked by the patient.
@immutable
final class SharedRecordExpiredOrRevokedFailure extends SharedRecordFailure {
  const SharedRecordExpiredOrRevokedFailure(super.message);
}

/// HTTP 422: Validation error (e.g., missing token or invalid PIN format).
@immutable
final class SharedRecordValidationFailure extends SharedRecordFailure {
  const SharedRecordValidationFailure(super.message);
}

/// HTTP 423: Temporarily locked due to repeated incorrect attempts.
@immutable
final class SharedRecordLockedFailure extends SharedRecordFailure {
  const SharedRecordLockedFailure(super.message);
}

/// HTTP 429: Rate limit exceeded (IP throttle).
@immutable
final class SharedRecordRateLimitFailure extends SharedRecordFailure {
  const SharedRecordRateLimitFailure(super.message);
}

/// Pre-flight security failure: Insecure plain HTTP detected in non-development environment.
@immutable
final class SharedRecordInsecureSchemeFailure extends SharedRecordFailure {
  const SharedRecordInsecureSchemeFailure(super.message);
}

/// Network connectivity, socket, or timeout failure.
@immutable
final class SharedRecordNetworkFailure extends SharedRecordFailure {
  const SharedRecordNetworkFailure(super.message);
}

/// Service providing public resolution of patient-shared medical records.
///
/// Implements strict security and privacy controls:
/// - Strictly unauthenticated: sets [requiresAuth: false] to omit Bearer tokens.
/// - Context isolation: sets [includeClinicContext: false] to omit X-Clinic-ID headers.
/// - Pre-flight HTTPS enforcement in non-development environments.
/// - Zero persistent caching or credential logging.
class SharedRecordService {
  SharedRecordService(
    this._apiClient, {
    AppConfig? config,
  }) : _config = config ?? AppConfig.current;

  final ApiClient _apiClient;
  final AppConfig _config;

  /// Resolves an encrypted shared medical record using a token and recipient PIN.
  Future<SharedRecordResult> resolveSharedRecord({
    required String token,
    required String pin,
  }) async {
    final cleanToken = token.trim();
    final cleanPin = pin.trim();

    if (cleanToken.isEmpty) {
      return const SharedRecordValidationFailure('Sharing token is required.');
    }
    if (cleanPin.isEmpty) {
      return const SharedRecordValidationFailure('PIN is required.');
    }

    // Pre-flight HTTPS enforcement for non-development environments
    final baseUri = Uri.tryParse(_config.apiBaseUrl);
    final isDev = _config.environment.toLowerCase() == 'development';

    if (!isDev) {
      if (baseUri == null ||
          !baseUri.hasScheme ||
          baseUri.scheme.toLowerCase() != 'https') {
        return const SharedRecordInsecureSchemeFailure(
          'Insecure connection prohibited. Medical records can only be resolved over HTTPS in non-development environments.',
        );
      }
    }

    final ApiResult<Map<String, dynamic>> apiResult = await _apiClient.post(
      '/shared-records/resolve',
      body: {
        'token': cleanToken,
        'pin': cleanPin,
      },
      requiresAuth: false,
      includeClinicContext: false,
      allowRetry: false,
    );

    return switch (apiResult) {
      ApiSuccess(:final data) => _handleSuccess(data),
      ApiFailure(:final exception) => _handleFailure(exception),
    };
  }

  SharedRecordResult _handleSuccess(Map<String, dynamic> data) {
    try {
      final record = SharedPatientRecord.fromJson(data);
      return SharedRecordSuccess(record);
    } catch (_) {
      return const SharedRecordNetworkFailure(
          'Failed to parse shared medical record response.');
    }
  }

  SharedRecordResult _handleFailure(AppException exception) {
    if (exception is NetworkConnectionException ||
        exception is NetworkTimeoutException) {
      return SharedRecordNetworkFailure(exception.message);
    }

    if (exception is ApiException) {
      final statusCode = exception.statusCode;
      final message = exception.message;
      final rawCause = exception.cause;
      final Map<String, dynamic>? causeMap =
          rawCause is Map<String, dynamic> ? rawCause : null;

      switch (statusCode) {
        case 403:
          final remainingAttempts = causeMap?['remaining_attempts'] as int?;
          return SharedRecordWrongPinFailure(
            message.isNotEmpty ? message : 'Incorrect PIN entered.',
            remainingAttempts: remainingAttempts,
          );

        case 404:
          return SharedRecordNotFoundFailure(
            message.isNotEmpty
                ? message
                : 'Shared record not found or invalid.',
          );

        case 410:
          return SharedRecordExpiredOrRevokedFailure(
            message.isNotEmpty
                ? message
                : 'This share link has expired or been revoked.',
          );

        case 422:
          return SharedRecordValidationFailure(
            message.isNotEmpty
                ? message
                : 'Invalid sharing parameters or PIN format.',
          );

        case 423:
          // DEC-P05-03: Expose locked status without leaking locked_until duration
          return SharedRecordLockedFailure(
            message.isNotEmpty
                ? message
                : 'Access temporarily locked due to too many failed attempts.',
          );

        case 429:
          return SharedRecordRateLimitFailure(
            message.isNotEmpty
                ? message
                : 'Too many resolution attempts. Please wait a moment.',
          );

        default:
          return SharedRecordNetworkFailure(message);
      }
    }

    return SharedRecordNetworkFailure(exception.message);
  }
}

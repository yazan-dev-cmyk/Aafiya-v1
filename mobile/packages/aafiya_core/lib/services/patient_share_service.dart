import 'dart:async';

import '../config/app_config.dart';
import '../errors/app_exception.dart';
import '../models/patient_share_token.dart';
import '../network/api_client.dart';
import '../network/api_result.dart';

/// Service providing patient-side encrypted medical-record sharing and revocation.
///
/// Implements strict security and privacy controls:
/// - Authenticated patient access: sets [requiresAuth: true] for all operations.
/// - Mandatory PIN validation: requires 4–8 digits matching `/^[0-9]{4,8}$/`.
/// - Supported durations: '24h', '7d', '30d'.
/// - Supported scope: 'all_emr' only (DEC-P05-01).
/// - Pre-flight HTTPS enforcement in non-development environments before network calls.
/// - Immediate revocation support (DEC-P05-02).
/// - Zero persistent storage or diagnostic logging of PIN or bearer credentials.
class PatientShareService {
  PatientShareService(
    this._apiClient, {
    AppConfig? config,
  }) : _config = config ?? AppConfig.current;

  final ApiClient _apiClient;
  final AppConfig _config;

  static final RegExp _pinRegex = RegExp(r'^[0-9]{4,8}$');
  static const Set<String> _supportedDurations = {'24h', '7d', '30d'};

  /// Creates a new encrypted medical record share with mandatory PIN.
  ///
  /// Sends `POST /api/v1/patients/share-token` with `scope: all_emr`.
  /// Returns the newly generated [PatientShareToken] containing the plain token
  /// and share URL (available only upon initial creation).
  Future<ApiResult<PatientShareToken>> createShare({
    required String pin,
    required String duration,
  }) async {
    final cleanPin = pin.trim();
    final cleanDuration = duration.trim();

    // Local validation before network call
    if (!_pinRegex.hasMatch(cleanPin)) {
      return const ApiFailure(
        ValidationException(
          message: 'رمز الحماية PIN يجب أن يتكون من 4 إلى 8 أرقام فقط.',
          validationErrors: {
            'pin': ['يجب أن يتكون رمز الحماية PIN من 4 إلى 8 أرقام فقط.'],
          },
        ),
      );
    }

    if (!_supportedDurations.contains(cleanDuration)) {
      return const ApiFailure(
        ValidationException(
          message: 'مدة الصلاحية المسموح بها هي: 24h, 7d, 30d.',
          validationErrors: {
            'duration': ['مدة الصلاحية المسموح بها هي: 24h, 7d, 30d.'],
          },
        ),
      );
    }

    // Pre-flight HTTPS enforcement for non-development environments
    final baseUri = Uri.tryParse(_config.apiBaseUrl);
    final isDev = _config.environment.toLowerCase() == 'development';

    if (!isDev) {
      if (baseUri == null ||
          !baseUri.hasScheme ||
          baseUri.scheme.toLowerCase() != 'https') {
        return const ApiFailure(
          GenericApiException(
            statusCode: 400,
            message:
                'Insecure connection prohibited. Medical record sharing requires HTTPS in non-development environments.',
          ),
        );
      }
    }

    final ApiResult<Map<String, dynamic>> result = await _apiClient.post(
      '/patients/share-token',
      body: {
        'scope': 'all_emr',
        'duration': cleanDuration,
        'pin': cleanPin,
      },
      requiresAuth: true,
      allowRetry: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseCreateSuccess(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Lists all active and historical shares owned by the authenticated patient.
  ///
  /// Sends `GET /api/v1/patients/share-tokens`.
  /// Server omits plaintext tokens and PINs from listing responses for privacy.
  Future<ApiResult<List<PatientShareToken>>> getMyShares() async {
    final ApiResult<Map<String, dynamic>> result = await _apiClient.get(
      '/patients/share-tokens',
      requiresAuth: true,
      allowRetry: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseListSuccess(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Immediately revokes an active share token owned by the patient (DEC-P05-02).
  ///
  /// Sends `DELETE /api/v1/patients/share-tokens/{shareId}`.
  /// Subsequent recipient resolutions of this token will be immediately rejected with HTTP 410.
  Future<ApiResult<PatientShareToken>> revokeShare(String shareId) async {
    final cleanId = shareId.trim();
    if (cleanId.isEmpty) {
      return const ApiFailure(
        ValidationException(message: 'معرف المشاركة مطلوب لإلغائها.'),
      );
    }

    final ApiResult<Map<String, dynamic>> result = await _apiClient.delete(
      '/patients/share-tokens/$cleanId',
      requiresAuth: true,
      allowRetry: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseRevokeSuccess(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  ApiResult<PatientShareToken> _parseCreateSuccess(Map<String, dynamic> data) {
    try {
      final rawShare = data['data'];
      if (rawShare is Map<String, dynamic>) {
        return ApiSuccess(PatientShareToken.fromJson(rawShare));
      }
      return ApiSuccess(PatientShareToken.fromJson(data));
    } catch (_) {
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'فشل في معالجة استجابة إنشاء رابط المشاركة.',
        ),
      );
    }
  }

  ApiResult<List<PatientShareToken>> _parseListSuccess(
      Map<String, dynamic> data) {
    try {
      final rawList = data['data'];
      if (rawList is List) {
        final shares = rawList
            .whereType<Map<String, dynamic>>()
            .map(PatientShareToken.fromJson)
            .toList();
        return ApiSuccess(shares);
      }
      return const ApiSuccess([]);
    } catch (_) {
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'فشل في معالجة قائمة مشاركات السجل الطبي.',
        ),
      );
    }
  }

  ApiResult<PatientShareToken> _parseRevokeSuccess(Map<String, dynamic> data) {
    try {
      final rawShare = data['data'];
      if (rawShare is Map<String, dynamic>) {
        return ApiSuccess(PatientShareToken.fromJson(rawShare));
      }
      return ApiSuccess(PatientShareToken.fromJson(data));
    } catch (_) {
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'فشل في معالجة استجابة إلغاء المشاركة.',
        ),
      );
    }
  }
}

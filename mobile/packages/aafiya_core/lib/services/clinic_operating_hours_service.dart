import '../errors/app_exception.dart';
import '../models/clinic_operating_hours.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service for managing Clinic Weekly Operating Hours (Clinic Director & Admin).
///
/// Implements backend contracts for:
/// - GET /api/v1/clinic/operating-hours (Retrieve clinic operating schedule)
/// - PUT /api/v1/clinic/operating-hours (Save 7-day operating schedule and periods)
class ClinicOperatingHoursService {
  const ClinicOperatingHoursService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Retrieves weekly operating hours for a clinic.
  Future<ApiResult<ClinicOperatingHoursData>> getOperatingHours({
    String? clinicId,
  }) async {
    final headers = clinicId != null && clinicId.isNotEmpty
        ? {'X-Clinic-ID': clinicId}
        : null;

    final result = await _apiClient.get(
      ApiEndpoints.clinicOperatingHours,
      headers: headers,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseClinicHoursPayload(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Saves weekly operating hours for a clinic.
  ///
  /// Invariants:
  /// - Exactly 7 days required (0 to 6).
  /// - Requires director authorization or 'clinic.manage_settings' permission (403 if unauthorized).
  /// - Open time must precede close time (422 if invalid).
  Future<ApiResult<ClinicOperatingHoursData>> saveOperatingHours({
    required List<ClinicOperatingDay> days,
    String? clinicId,
  }) async {
    final headers = clinicId != null && clinicId.isNotEmpty
        ? {'X-Clinic-ID': clinicId}
        : null;

    final body = <String, dynamic>{
      'days': days.map((d) => d.toJson()).toList(),
    };

    final result = await _apiClient.put(
      ApiEndpoints.clinicOperatingHours,
      body: body,
      headers: headers,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseClinicHoursPayload(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  ApiResult<ClinicOperatingHoursData> _parseClinicHoursPayload(Map<String, dynamic> data) {
    try {
      final payload = data.containsKey('data') && data['data'] is Map<String, dynamic>
          ? data['data'] as Map<String, dynamic>
          : data;
      return ApiSuccess(ClinicOperatingHoursData.fromJson(payload));
    } catch (e) {
      return ApiFailure(
        GenericApiException(
          statusCode: 500,
          message: 'Failed to parse clinic operating hours: $e',
        ),
      );
    }
  }
}

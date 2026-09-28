import '../models/emergency_profile.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service providing typed methods for interacting with emergency profile endpoints.
class EmergencyProfileService {
  const EmergencyProfileService(this._apiClient);

  final ApiClient _apiClient;

  /// Fetch the authenticated patient's emergency medical summary (Read-only).
  Future<ApiResult<EmergencyProfile>> getEmergencyProfile() async {
    final result = await _apiClient.get(
      ApiEndpoints.patientMe,
      allowRetry: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        final raw = data['data'];
        if (raw is Map<String, dynamic>) {
          return ApiSuccess(EmergencyProfile.fromJson(raw));
        }
        return ApiSuccess(EmergencyProfile.fromJson(data));

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }

  /// Fetch a specific patient's medical summary for an authorized doctor (Read-only).
  ///
  /// Invokes `GET /api/v1/patients/$patientId`.
  /// Automatically carries active clinic context headers (`X-Clinic-ID` & `X-Active-Clinic-ID`) via [ApiClient].
  Future<ApiResult<EmergencyProfile>> getPatientSummary(String patientId) async {
    final result = await _apiClient.get(
      ApiEndpoints.patient(patientId),
      allowRetry: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        final raw = data['data'];
        if (raw is Map<String, dynamic>) {
          return ApiSuccess(EmergencyProfile.fromJson(raw));
        }
        return ApiSuccess(EmergencyProfile.fromJson(data));

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }
}

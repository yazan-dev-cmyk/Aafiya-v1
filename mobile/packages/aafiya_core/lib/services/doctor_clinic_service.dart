import '../models/doctor_clinic.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service responsible for fetching doctor-affiliated operational clinics.
class DoctorClinicService {
  const DoctorClinicService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches all clinics affiliated with the authenticated doctor.
  /// Mapped from `GET /api/v1/doctor/clinics`.
  Future<ApiResult<List<DoctorClinic>>> fetchDoctorClinics() async {
    final result = await _apiClient.get(ApiEndpoints.doctorClinics);

    return switch (result) {
      ApiSuccess(:final data) => _parseClinics(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  ApiResult<List<DoctorClinic>> _parseClinics(Map<String, dynamic> data) {
    final rawList = data['data'];
    if (rawList is! List) {
      return const ApiSuccess(<DoctorClinic>[]);
    }

    final clinics = <DoctorClinic>[];
    for (final item in rawList) {
      if (item is Map<String, dynamic>) {
        clinics.add(DoctorClinic.fromJson(item));
      }
    }

    return ApiSuccess(clinics);
  }
}

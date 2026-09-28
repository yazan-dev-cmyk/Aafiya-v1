import '../errors/app_exception.dart';
import '../models/clinic_doctor_stats.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service responsible for fetching Clinic Director Doctor Statistics.
///
/// Strictly consumes `GET /api/v1/clinic/doctor-stats` according to the
/// verified backend contract established by `ClinicDoctorStatsController`.
class ClinicDoctorStatsService {
  const ClinicDoctorStatsService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches clinic-wide doctor statistics or focused single-doctor statistics.
  ///
  /// Query parameters:
  /// - [fromDate]: Optional start date in `YYYY-MM-DD` format (defaults to today on backend).
  /// - [toDate]: Optional end date in `YYYY-MM-DD` format (defaults to today on backend).
  /// - [doctorId]: Optional doctor UUID. When provided, returns single-doctor focused stats.
  ///
  /// The active clinic context is injected via `X-Clinic-ID` header by [_apiClient].
  Future<ApiResult<ClinicDoctorStatsData>> fetchClinicDoctorStats({
    String? fromDate,
    String? toDate,
    String? doctorId,
  }) async {
    final queryParams = <String, String>{};

    if (fromDate != null && fromDate.trim().isNotEmpty) {
      queryParams['from_date'] = fromDate.trim();
    }
    if (toDate != null && toDate.trim().isNotEmpty) {
      queryParams['to_date'] = toDate.trim();
    }
    if (doctorId != null && doctorId.trim().isNotEmpty) {
      queryParams['doctor_id'] = doctorId.trim();
    }

    final result = await _apiClient.get(
      ApiEndpoints.clinicDoctorStats,
      queryParameters: queryParams.isEmpty ? null : queryParams,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseClinicDoctorStats(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  ApiResult<ClinicDoctorStatsData> _parseClinicDoctorStats(
    Map<String, dynamic> data,
  ) {
    try {
      final payload = data['data'];
      if (payload is Map<String, dynamic>) {
        return ApiSuccess(ClinicDoctorStatsData.fromJson(payload));
      }
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Malformed clinic doctor statistics response.',
        ),
      );
    } catch (e) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse clinic doctor statistics: $e',
        ),
      );
    }
  }
}

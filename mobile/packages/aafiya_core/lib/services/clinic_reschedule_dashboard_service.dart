import '../models/unresolved_reschedule_item.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Clinical service for fetching urgent unresolved appointment reschedules.
///
/// Implements read-only coordination parity for Doctor and Clinic Assistant:
/// `GET /api/v1/clinic/reschedule-dashboard/unresolved`.
class ClinicRescheduleDashboardService {
  ClinicRescheduleDashboardService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches paginated unresolved appointment reschedules for the currently active clinic context.
  Future<ApiResult<PaginatedUnresolvedReschedules>>
      fetchUnresolvedAppointments({
    int page = 1,
    int perPage = 20,
  }) async {
    final result = await _apiClient.get(
      ApiEndpoints.clinicUnresolvedReschedules,
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
      includeClinicContext: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => ApiSuccess(
          PaginatedUnresolvedReschedules.fromJson(data),
        ),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }
}

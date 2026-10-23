import '../errors/app_exception.dart';
import '../models/clinic_escalation.dart';
import '../models/clinic_escalations_response.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service abstraction for clinic escalation management and staff acknowledgment.
class ClinicNotificationService {
  const ClinicNotificationService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches paginated clinic escalation records scoped to the active clinic context.
  Future<ApiResult<ClinicEscalationsResponse>> fetchEscalations({
    String status = 'pending',
    int page = 1,
    int perPage = 20,
  }) async {
    final result = await _apiClient.get(
      '${ApiEndpoints.clinicEscalations}?status=$status&page=$page&per_page=$perPage',
      allowRetry: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => () {
          try {
            final parsed = ClinicEscalationsResponse.fromJson(data);
            return ApiSuccess(parsed);
          } catch (e) {
            return ApiFailure<ClinicEscalationsResponse>(
              GenericApiException(
                statusCode: 0,
                message: 'Failed to parse clinic escalations response',
                cause: e,
              ),
            );
          }
        }(),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Submits staff follow-up acknowledgment and closes the escalation alert.
  ///
  /// On successful server response, extracts the updated record from `data`.
  Future<ApiResult<ClinicEscalation>> acknowledgeEscalation(
    String id,
  ) async {
    final result = await _apiClient.post(
      ApiEndpoints.clinicEscalationAcknowledge(id),
      allowRetry: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => () {
          final rawItem = data['data'];
          if (rawItem is Map<String, dynamic>) {
            try {
              final parsed = ClinicEscalation.fromJson(rawItem);
              return ApiSuccess(parsed);
            } catch (e) {
              return ApiFailure<ClinicEscalation>(
                GenericApiException(
                  statusCode: 0,
                  message: 'Malformed escalation record in acknowledgment response',
                  cause: e,
                ),
              );
            }
          }
          return const ApiFailure<ClinicEscalation>(
            GenericApiException(
              statusCode: 0,
              message: 'Acknowledgment response missing data payload',
            ),
          );
        }(),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }
}

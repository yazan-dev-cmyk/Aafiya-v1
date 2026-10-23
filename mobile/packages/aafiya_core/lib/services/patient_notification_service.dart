import '../errors/app_exception.dart';
import '../models/patient_notification.dart';
import '../models/patient_notifications_response.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service abstraction for patient notifications and receipt acknowledgment.
class PatientNotificationService {
  const PatientNotificationService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches paginated in-app notifications belonging to the authenticated patient.
  Future<ApiResult<PatientNotificationsResponse>> fetchNotifications({
    int page = 1,
  }) async {
    final result = await _apiClient.get(
      '${ApiEndpoints.patientNotifications}?page=$page',
      allowRetry: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => () {
          try {
            final parsed = PatientNotificationsResponse.fromJson(data);
            return ApiSuccess(parsed);
          } catch (e) {
            return ApiFailure<PatientNotificationsResponse>(
              GenericApiException(
                statusCode: 0,
                message: 'Failed to parse patient notifications response',
                cause: e,
              ),
            );
          }
        }(),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Submits receipt acknowledgment for a specific notification.
  ///
  /// On successful server response, extracts the updated record from `data`.
  Future<ApiResult<PatientNotification>> acknowledgeNotification(
    String id,
  ) async {
    final result = await _apiClient.post(
      ApiEndpoints.patientNotificationAcknowledge(id),
      allowRetry: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => () {
          final rawItem = data['data'];
          if (rawItem is Map<String, dynamic>) {
            try {
              final parsed = PatientNotification.fromJson(rawItem);
              return ApiSuccess(parsed);
            } catch (e) {
              return ApiFailure<PatientNotification>(
                GenericApiException(
                  statusCode: 0,
                  message: 'Malformed notification record in acknowledgment response',
                  cause: e,
                ),
              );
            }
          }
          return const ApiFailure<PatientNotification>(
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

import '../models/appointment.dart';
import '../models/doctor_stats.dart';
import '../models/paginated_appointments.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service responsible for fetching doctor operational dashboard data:
/// 1. Doctor operational statistics (today's counts, waiting room, completed, etc.)
/// 2. Doctor today's appointments / agenda (chronologically sorted by time_slot)
class DoctorDashboardService {
  const DoctorDashboardService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches operational statistics for the authenticated doctor.
  /// Mapped from `GET /api/v1/doctor/stats`.
  /// Automatically carries active clinic context via ApiClient headers.
  Future<ApiResult<DoctorStats>> fetchDoctorStats({String? date}) async {
    final queryParams = <String, String>{};
    if (date != null && date.isNotEmpty) {
      queryParams['date'] = date;
    }

    final result = await _apiClient.get(
      ApiEndpoints.doctorStats,
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseStats(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches today's appointments for the authenticated doctor.
  /// Mapped from `GET /api/v1/appointments`.
  /// Sorted by `time_slot` ascending.
  /// Automatically carries active clinic context via ApiClient headers.
  Future<ApiResult<PaginatedAppointments>> fetchTodayAgenda({
    String? appointmentDate,
    int page = 1,
    int perPage = 20,
    String? status,
  }) async {
    final queryParams = <String, String>{
      'sort_by': 'time_slot',
      'sort_order': 'asc',
      'page': page.toString(),
      'per_page': perPage.toString(),
    };

    if (appointmentDate != null && appointmentDate.isNotEmpty) {
      queryParams['appointment_date'] = appointmentDate;
    }

    if (status != null && status.isNotEmpty && status != 'all') {
      queryParams['status'] = status;
    }

    final result = await _apiClient.get(
      ApiEndpoints.appointments,
      queryParameters: queryParams,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAgenda(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Marks an appointment as attended (operational doctor/assistant).
  /// Mapped from `POST /api/v1/appointments/{appointment}/attend`.
  /// Transitions status from `confirmed` -> `attended`.
  /// Automatically carries active clinic context via ApiClient headers.
  Future<ApiResult<Appointment>> attendAppointment(String appointmentId) async {
    final result = await _apiClient.post(
      ApiEndpoints.appointmentAttend(appointmentId),
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Marks an appointment as no-show (operational doctor/assistant).
  /// Mapped from `POST /api/v1/appointments/{appointment}/no-show`.
  /// Transitions status from `confirmed` -> `no_show`.
  /// Automatically carries active clinic context via ApiClient headers.
  Future<ApiResult<Appointment>> markNoShow(
    String appointmentId, {
    String? reason,
  }) async {
    final result = await _apiClient.post(
      ApiEndpoints.appointmentNoShow(appointmentId),
      body: reason != null && reason.trim().isNotEmpty
          ? {'reason': reason.trim()}
          : null,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  ApiResult<Appointment> _parseAppointment(Map<String, dynamic> data) {
    final rawData = data['data'];
    if (rawData is Map<String, dynamic>) {
      return ApiSuccess(Appointment.fromJson(rawData));
    }
    return ApiSuccess(Appointment.fromJson(data));
  }

  ApiResult<DoctorStats> _parseStats(Map<String, dynamic> data) {
    final rawData = data['data'];
    if (rawData is Map<String, dynamic>) {
      return ApiSuccess(DoctorStats.fromJson(rawData));
    }
    return ApiSuccess(DoctorStats.empty());
  }

  ApiResult<PaginatedAppointments> _parseAgenda(Map<String, dynamic> data) {
    return ApiSuccess(PaginatedAppointments.fromJson(data));
  }
}

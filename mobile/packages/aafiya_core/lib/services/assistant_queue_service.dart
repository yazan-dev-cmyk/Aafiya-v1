import '../models/appointment.dart';
import '../models/paginated_appointments.dart';
import '../models/patient_search_result.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service responsible for doctor assistant operational workflows:
/// 1. Fetching clinic appointment queue (waiting room and expected arrivals)
/// 2. QR Token Check-In (`POST /api/v1/appointments/check-in`)
/// 3. Direct Operational Attendance (`POST /api/v1/appointments/{id}/attend`)
/// 4. Operational No-Show Marking (`POST /api/v1/appointments/{id}/no-show`)
/// 5. Clinic Patient Search (`GET /api/v1/patients`)
class AssistantQueueService {
  const AssistantQueueService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches appointments for the assistant's clinic with server-side filtering.
  /// Mapped from `GET /api/v1/appointments`.
  /// Supports `appointment_date`, `from_date`, `to_date`, `doctor_id`, `status`, and pagination.
  Future<ApiResult<PaginatedAppointments>> fetchQueue({
    String? appointmentDate,
    String? fromDate,
    String? toDate,
    String? doctorId,
    String? status,
    int page = 1,
    int perPage = 20,
    String sortBy = 'time_slot',
    String sortOrder = 'asc',
  }) async {
    final queryParams = <String, String>{
      'sort_by': sortBy,
      'sort_order': sortOrder,
      'page': page.toString(),
      'per_page': perPage.toString(),
    };

    if (appointmentDate != null && appointmentDate.trim().isNotEmpty) {
      queryParams['appointment_date'] = appointmentDate.trim();
    }
    if (fromDate != null && fromDate.trim().isNotEmpty) {
      queryParams['from_date'] = fromDate.trim();
    }
    if (toDate != null && toDate.trim().isNotEmpty) {
      queryParams['to_date'] = toDate.trim();
    }
    if (doctorId != null && doctorId.trim().isNotEmpty) {
      queryParams['doctor_id'] = doctorId.trim();
    }
    if (status != null && status.trim().isNotEmpty && status != 'all') {
      queryParams['status'] = status.trim();
    }

    final result = await _apiClient.get(
      ApiEndpoints.appointments,
      queryParameters: queryParams,
    );

    return switch (result) {
      ApiSuccess(:final data) => ApiSuccess(PaginatedAppointments.fromJson(data)),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Compatibility wrapper for fetchTodayQueue.
  Future<ApiResult<PaginatedAppointments>> fetchTodayQueue({
    String? appointmentDate,
    String? fromDate,
    String? toDate,
    String? doctorId,
    int page = 1,
    int perPage = 20,
    String? status,
  }) {
    return fetchQueue(
      appointmentDate: appointmentDate,
      fromDate: fromDate,
      toDate: toDate,
      doctorId: doctorId,
      status: status,
      page: page,
      perPage: perPage,
    );
  }

  /// Confirms an appointment.
  /// Mapped from `POST /api/v1/appointments/{appointment}/confirm`.
  /// Transitions status from `pending` -> `confirmed`.
  Future<ApiResult<Appointment>> confirmAppointment(
    String appointmentId, {
    String? reason,
  }) async {
    final result = await _apiClient.post(
      ApiEndpoints.appointmentConfirm(appointmentId),
      body: reason != null && reason.trim().isNotEmpty
          ? {'reason': reason.trim()}
          : null,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Checks in an appointment using its single-use secure QR token.
  /// Mapped from `POST /api/v1/appointments/check-in`.
  /// Transitions status from `confirmed` -> `attended`.
  Future<ApiResult<Appointment>> checkInAppointment(String token) async {
    final result = await _apiClient.post(
      ApiEndpoints.appointmentCheckIn,
      body: {'token': token.trim()},
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Marks an appointment as attended directly by ID.
  /// Mapped from `POST /api/v1/appointments/{appointment}/attend`.
  /// Transitions status from `confirmed` -> `attended`.
  Future<ApiResult<Appointment>> attendAppointment(String appointmentId) async {
    final result = await _apiClient.post(
      ApiEndpoints.appointmentAttend(appointmentId),
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Marks an appointment as no-show.
  /// Mapped from `POST /api/v1/appointments/{appointment}/no-show`.
  /// Transitions status from `confirmed` -> `no_show`.
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

  /// Searches registered patients within the assistant's clinic.
  /// Mapped from `GET /api/v1/patients`.
  Future<ApiResult<List<PatientSearchResult>>> searchPatients({
    String? query,
    String? mrn,
    String? phone,
    int page = 1,
    int perPage = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
    };

    if (query != null && query.trim().isNotEmpty) {
      queryParams['search'] = query.trim();
    }
    if (mrn != null && mrn.trim().isNotEmpty) {
      queryParams['mrn'] = mrn.trim();
    }
    if (phone != null && phone.trim().isNotEmpty) {
      queryParams['phone'] = phone.trim();
    }

    final result = await _apiClient.get(
      ApiEndpoints.patients,
      queryParameters: queryParams,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parsePatientList(data),
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

  ApiResult<List<PatientSearchResult>> _parsePatientList(Map<String, dynamic> data) {
    final rawData = data['data'];
    if (rawData is List) {
      final list = rawData
          .whereType<Map<String, dynamic>>()
          .map((item) => PatientSearchResult.fromJson(item))
          .toList();
      return ApiSuccess(list);
    }
    return const ApiSuccess([]);
  }
}

import '../models/doctor_vacation.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Clinical service for managing Doctor Vacations.
///
/// Implements backend contracts for:
/// - GET /api/v1/doctor/vacations (List paginated vacations)
/// - POST /api/v1/doctor/vacations (Register new vacation with immediate effect DEC-VAC-01)
/// - DELETE /api/v1/doctor/vacations/{id} (Logical cancellation DEC-VAC-05)
class DoctorVacationService {
  const DoctorVacationService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches paginated vacations for the authenticated doctor.
  Future<ApiResult<PaginatedDoctorVacations>> fetchVacations({
    int page = 1,
    int perPage = 15,
  }) async {
    final result = await _apiClient.get(
      ApiEndpoints.doctorVacations,
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
      includeClinicContext: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => ApiSuccess(
          PaginatedDoctorVacations.fromJson(data),
        ),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Registers a new vacation for the authenticated doctor.
  ///
  /// Invariants:
  /// - Immediate effectiveness without Director veto (DEC-VAC-01, DEC-AUTH-01).
  /// - Automatic snapshot of specified [clinicIds] or all affiliated active clinics if null/empty.
  /// - 7-calendar-day relocation window (DEC-VAC-02).
  /// - Throws 422 with DOCTOR_VACATION_OVERLAP if overlapping effective vacation exists.
  Future<ApiResult<DoctorVacation>> registerVacation({
    required String vacationStart,
    required String vacationEnd,
    List<String>? clinicIds,
    String? reason,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'vacation_start': vacationStart,
      'vacation_end': vacationEnd,
      if (clinicIds != null && clinicIds.isNotEmpty) 'clinic_ids': clinicIds,
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    };

    final result = await _apiClient.post(
      ApiEndpoints.doctorVacations,
      body: body,
      includeClinicContext: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseVacationPayload(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Cancels an active vacation logically (DEC-VAC-05).
  ///
  /// Physical deletion is prohibited; status is set to 'cancelled'.
  Future<ApiResult<DoctorVacation>> cancelVacation(String id) async {
    final result = await _apiClient.delete(
      ApiEndpoints.doctorVacation(id),
      includeClinicContext: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseVacationPayload(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  ApiResult<DoctorVacation> _parseVacationPayload(Map<String, dynamic> data) {
    final rawItem = data['data'];
    if (rawItem is Map<String, dynamic>) {
      return ApiSuccess(DoctorVacation.fromJson(rawItem));
    }
    return ApiSuccess(DoctorVacation.fromJson(data));
  }
}

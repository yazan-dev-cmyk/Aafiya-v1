import '../errors/app_exception.dart';
import '../models/doctor_working_hours.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Clinical service for managing Doctor Weekly Working Hours and Schedule Activation.
///
/// Implements backend contracts for:
/// - GET /api/v1/doctors/{doctorId}/working-hours (Retrieve schedule and activation state)
/// - PUT /api/v1/doctors/{doctorId}/working-hours (Save draft weekly schedule)
/// - POST /api/v1/doctors/{doctorId}/working-hours/activate (Atomically activate and permanently lock)
class DoctorWorkingHoursService {
  const DoctorWorkingHoursService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Retrieves weekly working hours and activation state for a doctor at a clinic.
  Future<ApiResult<DoctorWorkingHoursData>> getSchedule({
    required String doctorId,
    String? clinicId,
  }) async {
    final headers = clinicId != null && clinicId.isNotEmpty
        ? {'X-Clinic-ID': clinicId}
        : null;

    final result = await _apiClient.get(
      ApiEndpoints.doctorWorkingHours(doctorId),
      headers: headers,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseSchedulePayload(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Saves a draft weekly schedule for the doctor before activation.
  ///
  /// Invariants:
  /// - Fails with SCHEDULE_LOCKED_ACTIVATED if schedule is already activated.
  /// - Fails with SCHEDULE_CONTRACTION_CONFLICT if closing a day or removing slots
  ///   with future booked appointments.
  Future<ApiResult<DoctorWorkingHoursData>> saveDraft({
    required String doctorId,
    required List<DoctorDayScheduleItem> days,
    String? clinicId,
  }) async {
    final headers = clinicId != null && clinicId.isNotEmpty
        ? {'X-Clinic-ID': clinicId}
        : null;

    final body = <String, dynamic>{
      'days': days.map((d) => d.toJson()).toList(),
    };

    final result = await _apiClient.put(
      ApiEndpoints.doctorWorkingHours(doctorId),
      body: body,
      headers: headers,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseSchedulePayload(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Atomically activates and permanently locks the doctor's weekly working schedule.
  ///
  /// Invariants:
  /// - Permanent lock: Cannot be undone or reverted in V1 (AAFIYA V1 Frozen Policy).
  /// - Requires at least 1 open day, and all open days must have slots.
  /// - Doctor slots must be contained within clinic operating hours.
  /// - Unlocks patient bookings (DEC-HOURS-03 gate).
  Future<ApiResult<DoctorWorkingHoursData>> activateSchedule({
    required String doctorId,
    String? clinicId,
  }) async {
    final headers = clinicId != null && clinicId.isNotEmpty
        ? {'X-Clinic-ID': clinicId}
        : null;

    final result = await _apiClient.post(
      ApiEndpoints.doctorWorkingHoursActivate(doctorId),
      body: <String, dynamic>{},
      headers: headers,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseSchedulePayload(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  ApiResult<DoctorWorkingHoursData> _parseSchedulePayload(Map<String, dynamic> data) {
    try {
      final payload = data.containsKey('data') && data['data'] is Map<String, dynamic>
          ? data['data'] as Map<String, dynamic>
          : data;
      return ApiSuccess(DoctorWorkingHoursData.fromJson(payload));
    } catch (e) {
      return ApiFailure(
        GenericApiException(
          statusCode: 500,
          message: 'Failed to parse doctor working hours: $e',
        ),
      );
    }
  }
}

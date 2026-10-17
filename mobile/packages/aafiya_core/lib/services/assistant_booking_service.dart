import '../errors/app_exception.dart';
import '../models/appointment.dart';
import '../models/appointment_slot.dart';
import '../models/clinic_staff.dart';
import '../models/patient_search_result.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service responsible for doctor assistant in-clinic appointment booking workflows (TASK-05-02):
/// 1. Fetching affiliated active doctors for the active clinic (`GET /api/v1/clinics/{id}`)
/// 2. Fetching real-time hourly capacity and available slots (`GET /api/v1/appointments/slots`)
/// 3. Creating in-clinic return visits or walk-in appointments (`POST /api/v1/appointments`)
class AssistantBookingService {
  const AssistantBookingService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches all active doctors affiliated with the specified clinic.
  /// Mapped from `GET /api/v1/clinics/{clinicId}` -> `data.doctors`.
  Future<ApiResult<List<ClinicDoctorStaff>>> getClinicDoctors(String clinicId) async {
    final result = await _apiClient.get(ApiEndpoints.clinic(clinicId));

    return switch (result) {
      ApiSuccess(:final data) => _parseClinicDoctors(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Queries real-time hourly slot capacity for a specific doctor, clinic, and date.
  /// Mapped from `GET /api/v1/appointments/slots`.
  Future<ApiResult<List<AppointmentSlot>>> getAvailableSlots({
    required String clinicId,
    required String doctorId,
    required String date,
  }) async {
    final queryParams = <String, String>{
      'clinic_id': clinicId.trim(),
      'doctor_id': doctorId.trim(),
      'date': date.trim(),
    };

    final result = await _apiClient.get(
      ApiEndpoints.appointmentSlots,
      queryParameters: queryParams,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseSlots(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Creates a new in-clinic appointment for a return visit or walk-in patient.
  /// Mapped from `POST /api/v1/appointments`.
  ///
  /// Note: [bookingCenterId] MUST NOT be sent for clinic assistant bookings.
  Future<ApiResult<Appointment>> createAppointment({
    required String clinicId,
    required String doctorId,
    required String appointmentDate,
    required String timeSlot,
    required String patientName,
    required String patientPhone,
    String? patientId,
    String? patientMrn,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'clinic_id': clinicId.trim(),
      'doctor_id': doctorId.trim(),
      'appointment_date': appointmentDate.trim(),
      'time_slot': timeSlot.trim(),
      'patient_name': patientName.trim(),
      'patient_phone': patientPhone.trim(),
      if (patientId != null && patientId.trim().isNotEmpty)
        'patient_id': patientId.trim(),
      if (patientMrn != null && patientMrn.trim().isNotEmpty)
        'patient_mrn': patientMrn.trim(),
      if (notes != null && notes.trim().isNotEmpty)
        'notes': notes.trim(),
    };

    final result = await _apiClient.post(
      ApiEndpoints.appointments,
      body: body,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Reschedules an existing in-clinic appointment to a new date and time slot.
  /// Mapped from `POST /api/v1/appointments/{id}/reschedule`.
  Future<ApiResult<Appointment>> rescheduleAppointment({
    required String appointmentId,
    required String appointmentDate,
    required String timeSlot,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'appointment_date': appointmentDate.trim(),
      'time_slot': timeSlot.trim(),
      if (notes != null && notes.trim().isNotEmpty)
        'notes': notes.trim(),
    };

    final result = await _apiClient.post(
      ApiEndpoints.appointmentReschedule(appointmentId.trim()),
      body: body,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Searches for registered patients by name, phone, or MRN.
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

  ApiResult<List<ClinicDoctorStaff>> _parseClinicDoctors(Map<String, dynamic> data) {
    try {
      final rawData = data['data'];
      final clinicMap = rawData is Map<String, dynamic> ? rawData : data;

      final doctors = <ClinicDoctorStaff>[];
      final seenDoctorIds = <String>{};

      // 1. Parse Clinic Director (if returned by backend)
      final rawDirector = clinicMap['director'];
      if (rawDirector is Map<String, dynamic>) {
        final directorMap = {
          if (!rawDirector.containsKey('position')) 'position': 'director',
          ...rawDirector,
        };
        final director = ClinicDoctorStaff.fromJson(directorMap);
        if (director.id.isNotEmpty && director.isActive) {
          doctors.add(director);
          seenDoctorIds.add(director.id);
        }
      }

      // 2. Parse Linked Doctors collection and merge without duplicates
      final rawDoctors = clinicMap['doctors'];
      if (rawDoctors is List) {
        for (final item in rawDoctors.whereType<Map<String, dynamic>>()) {
          final doc = ClinicDoctorStaff.fromJson(item);
          if (doc.id.isNotEmpty && doc.isActive && !seenDoctorIds.contains(doc.id)) {
            doctors.add(doc);
            seenDoctorIds.add(doc.id);
          }
        }
      }

      return ApiSuccess(doctors);
    } catch (e) {
      return ApiFailure(GenericApiException(statusCode: 500, message: 'Failed to parse clinic doctors: $e'));
    }
  }

  ApiResult<List<AppointmentSlot>> _parseSlots(Map<String, dynamic> data) {
    try {
      final rawData = data['data'];
      final container = rawData is Map<String, dynamic> ? rawData : data;
      final rawSlots = container['slots'];

      if (rawSlots is List) {
        final slots = rawSlots
            .whereType<Map<String, dynamic>>()
            .map(AppointmentSlot.fromJson)
            .toList();
        return ApiSuccess(slots);
      }
      return const ApiSuccess([]);
    } catch (e) {
      return ApiFailure(GenericApiException(statusCode: 500, message: 'Failed to parse appointment slots: $e'));
    }
  }

  ApiResult<Appointment> _parseAppointment(Map<String, dynamic> data) {
    try {
      final rawData = data['data'];
      if (rawData is Map<String, dynamic>) {
        return ApiSuccess(Appointment.fromJson(rawData));
      }
      return ApiSuccess(Appointment.fromJson(data));
    } catch (e) {
      return ApiFailure(GenericApiException(statusCode: 500, message: 'Failed to parse appointment response: $e'));
    }
  }

  ApiResult<List<PatientSearchResult>> _parsePatientList(Map<String, dynamic> data) {
    try {
      final rawData = data['data'];
      if (rawData is List) {
        final patients = rawData
            .whereType<Map<String, dynamic>>()
            .map(PatientSearchResult.fromJson)
            .toList();
        return ApiSuccess(patients);
      }
      return const ApiSuccess([]);
    } catch (e) {
      return ApiFailure(GenericApiException(statusCode: 500, message: 'Failed to parse patients list: $e'));
    }
  }
}

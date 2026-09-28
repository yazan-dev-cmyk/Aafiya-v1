import '../errors/app_exception.dart';
import '../models/appointment.dart';
import '../models/appointment_slot.dart';
import '../models/booking_center_quota.dart';
import '../models/booking_package.dart';
import '../models/booking_transaction.dart';
import '../models/doctor.dart';
import '../models/package_purchase_request.dart';
import '../models/patient_search_result.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service responsible for communicating with Booking Center commercial & quota APIs.
/// Strictly consumes authoritative backend endpoints established in Phase 2 & audited for TASK-05-03.
class BookingCenterService {
  const BookingCenterService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches current authoritative quota balance for authenticated booking center.
  /// `GET /api/v1/booking-centers/quota-balance`
  Future<ApiResult<BookingCenterQuota>> getQuotaBalance() async {
    final result = await _apiClient.get(
      ApiEndpoints.bookingCenterQuotaBalance,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseQuotaBalance(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches dynamically available commercial booking packages.
  /// `GET /api/v1/booking-packages`
  Future<ApiResult<List<BookingPackage>>> getBookingPackages() async {
    final result = await _apiClient.get(
      ApiEndpoints.bookingPackages,
      requiresAuth: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseBookingPackages(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Submits a package purchase request in pending review status.
  /// `POST /api/v1/booking-centers/purchase-requests`
  Future<ApiResult<PackagePurchaseRequest>> createPurchaseRequest({
    required String packageId,
    String? paymentMethod,
    String? transactionReference,
    String? receiptDocumentPath,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'package_id': packageId,
    };

    if (paymentMethod != null && paymentMethod.trim().isNotEmpty) {
      body['payment_method'] = paymentMethod.trim();
    }
    if (transactionReference != null && transactionReference.trim().isNotEmpty) {
      body['transaction_reference'] = transactionReference.trim();
    }
    if (receiptDocumentPath != null && receiptDocumentPath.trim().isNotEmpty) {
      body['receipt_document_path'] = receiptDocumentPath.trim();
    }
    if (notes != null && notes.trim().isNotEmpty) {
      body['notes'] = notes.trim();
    }

    final result = await _apiClient.post(
      ApiEndpoints.bookingCenterPurchaseRequests,
      body: body,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseSinglePurchaseRequest(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches purchase requests belonging exclusively to the authenticated booking center.
  /// `GET /api/v1/booking-centers/purchase-requests`
  Future<ApiResult<List<PackagePurchaseRequest>>> getPurchaseRequests({
    int? page,
    int? perPage,
  }) async {
    final queryParams = <String, String>{};
    if (page != null) queryParams['page'] = page.toString();
    if (perPage != null) queryParams['per_page'] = perPage.toString();

    final result = await _apiClient.get(
      ApiEndpoints.bookingCenterPurchaseRequests,
      queryParameters: queryParams.isEmpty ? null : queryParams,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parsePurchaseRequestsList(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches ledger transactions for the authenticated booking center.
  /// `GET /api/v1/booking-centers/transactions`
  Future<ApiResult<List<BookingTransactionItem>>> getTransactions({
    String? fromDate,
    String? toDate,
    String? sortBy,
    String? sortOrder,
    int? page,
    int? perPage,
  }) async {
    final queryParams = <String, String>{};
    if (fromDate != null && fromDate.trim().isNotEmpty) {
      queryParams['from_date'] = fromDate.trim();
    }
    if (toDate != null && toDate.trim().isNotEmpty) {
      queryParams['to_date'] = toDate.trim();
    }
    if (sortBy != null && sortBy.trim().isNotEmpty) {
      queryParams['sort_by'] = sortBy.trim();
    }
    if (sortOrder != null && sortOrder.trim().isNotEmpty) {
      queryParams['sort_order'] = sortOrder.trim();
    }
    if (page != null) queryParams['page'] = page.toString();
    if (perPage != null) queryParams['per_page'] = perPage.toString();

    final result = await _apiClient.get(
      ApiEndpoints.bookingCenterTransactions,
      queryParameters: queryParams.isEmpty ? null : queryParams,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseTransactionsList(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Searches registered patients within the authorized lookup directory.
  /// Mapped from `GET /api/v1/patients?search=...`.
  /// Lookup roles (booking_center) require an explicit positive search query.
  Future<ApiResult<List<PatientSearchResult>>> searchPatients({
    required String query,
    String? mrn,
    String? phone,
    int page = 1,
    int perPage = 20,
  }) async {
    final queryParams = <String, String>{
      'search': query.trim(),
      'page': page.toString(),
      'per_page': perPage.toString(),
    };

    if (mrn != null && mrn.trim().isNotEmpty) {
      queryParams['mrn'] = mrn.trim();
    }
    if (phone != null && phone.trim().isNotEmpty) {
      queryParams['phone'] = phone.trim();
    }

    final result = await _apiClient.get(
      ApiEndpoints.patients,
      queryParameters: queryParams,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parsePatientsList(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Discovers public doctors and their affiliated clinics.
  /// Mapped from `GET /api/v1/doctors`.
  Future<ApiResult<List<Doctor>>> searchDoctors({
    String? search,
    String? specialty,
    String? wilaya,
    int page = 1,
    int perPage = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
    };

    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (specialty != null && specialty.trim().isNotEmpty) {
      queryParams['specialty'] = specialty.trim();
    }
    if (wilaya != null && wilaya.trim().isNotEmpty) {
      queryParams['wilaya'] = wilaya.trim();
    }

    final result = await _apiClient.get(
      ApiEndpoints.doctors,
      queryParameters: queryParams,
      requiresAuth: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseDoctorsList(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches real-time available capacity and hourly slots for doctor, clinic, and date.
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
      requiresAuth: false,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseSlots(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Creates a new appointment for a patient in 'pending' status.
  /// Mapped from `POST /api/v1/appointments`.
  ///
  /// CRITICAL (DISC-06): Quota is NOT deducted on creation. Quota is deducted
  /// strictly upon clinic confirmation.
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
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches appointments booked by this booking center.
  /// Mapped from `GET /api/v1/appointments`.
  Future<ApiResult<List<Appointment>>> getAppointments({
    String? status,
    String? appointmentDate,
    String? fromDate,
    String? toDate,
    int page = 1,
    int perPage = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
      'sort_by': 'appointment_date',
      'sort_order': 'desc',
    };

    if (status != null && status.trim().isNotEmpty && status != 'all') {
      queryParams['status'] = status.trim();
    }
    if (appointmentDate != null && appointmentDate.trim().isNotEmpty) {
      queryParams['appointment_date'] = appointmentDate.trim();
    }
    if (fromDate != null && fromDate.trim().isNotEmpty) {
      queryParams['from_date'] = fromDate.trim();
    }
    if (toDate != null && toDate.trim().isNotEmpty) {
      queryParams['to_date'] = toDate.trim();
    }

    final result = await _apiClient.get(
      ApiEndpoints.appointments,
      queryParameters: queryParams,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointmentsList(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Cancels an appointment.
  /// Mapped from `POST /api/v1/appointments/{appointment}/cancel`.
  Future<ApiResult<Appointment>> cancelAppointment({
    required String appointmentId,
    String? reason,
  }) async {
    final body = <String, dynamic>{
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    };

    final result = await _apiClient.post(
      ApiEndpoints.appointmentCancel(appointmentId),
      body: body.isEmpty ? null : body,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Reschedules an appointment to a new date and time slot.
  /// Mapped from `POST /api/v1/appointments/{appointment}/reschedule`.
  Future<ApiResult<Appointment>> rescheduleAppointment({
    required String appointmentId,
    required String appointmentDate,
    required String timeSlot,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'appointment_date': appointmentDate.trim(),
      'time_slot': timeSlot.trim(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    };

    final result = await _apiClient.post(
      ApiEndpoints.appointmentReschedule(appointmentId),
      body: body,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAppointment(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  // --- Parsing Helpers ---

  ApiResult<BookingCenterQuota> _parseQuotaBalance(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is Map<String, dynamic>) {
        return ApiSuccess(BookingCenterQuota.fromJson(payload));
      }
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Malformed quota balance payload received.',
        ),
      );
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse quota balance: $e',
          cause: stackTrace,
        ),
      );
    }
  }

  ApiResult<List<BookingPackage>> _parseBookingPackages(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(BookingPackage.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Malformed packages payload received.',
        ),
      );
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse booking packages: $e',
          cause: stackTrace,
        ),
      );
    }
  }

  ApiResult<PackagePurchaseRequest> _parseSinglePurchaseRequest(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is Map<String, dynamic>) {
        return ApiSuccess(PackagePurchaseRequest.fromJson(payload));
      }
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Malformed purchase request response received.',
        ),
      );
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse purchase request: $e',
          cause: stackTrace,
        ),
      );
    }
  }

  ApiResult<List<PackagePurchaseRequest>> _parsePurchaseRequestsList(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(PackagePurchaseRequest.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Malformed purchase requests list received.',
        ),
      );
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse purchase requests list: $e',
          cause: stackTrace,
        ),
      );
    }
  }

  ApiResult<List<BookingTransactionItem>> _parseTransactionsList(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(BookingTransactionItem.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Malformed transactions list received.',
        ),
      );
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse transactions list: $e',
          cause: stackTrace,
        ),
      );
    }
  }

  ApiResult<List<PatientSearchResult>> _parsePatientsList(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(PatientSearchResult.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiSuccess([]);
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse patients list: $e',
          cause: stackTrace,
        ),
      );
    }
  }

  ApiResult<List<Doctor>> _parseDoctorsList(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(Doctor.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiSuccess([]);
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse doctors list: $e',
          cause: stackTrace,
        ),
      );
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
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse appointment slots: $e',
          cause: stackTrace,
        ),
      );
    }
  }

  ApiResult<Appointment> _parseAppointment(Map<String, dynamic> data) {
    try {
      final rawData = data['data'];
      if (rawData is Map<String, dynamic>) {
        return ApiSuccess(Appointment.fromJson(rawData));
      }
      return ApiSuccess(Appointment.fromJson(data));
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse appointment response: $e',
          cause: stackTrace,
        ),
      );
    }
  }

  ApiResult<List<Appointment>> _parseAppointmentsList(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(Appointment.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiSuccess([]);
    } catch (e, stackTrace) {
      return ApiFailure(
        ServerException(
          statusCode: 500,
          message: 'Failed to parse appointments list: $e',
          cause: stackTrace,
        ),
      );
    }
  }
}

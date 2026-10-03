import '../errors/app_exception.dart';
import '../models/clinic_staff.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service responsible for clinic staff lifecycle operations (Doctor Director only).
///
/// Encapsulates all 13 backend staff-management endpoints:
/// 1. `fetchClinicStaff` (GET /clinics/{id})
/// 2. `createEmployedDoctor` (POST /clinics/{id}/doctors)
/// 3. `lookupDoctor` (GET /clinics/{id}/doctors/lookup)
/// 4. `sendDoctorInvitation` (POST /clinics/{id}/doctor-invitations)
/// 5. `fetchClinicInvitations` (GET /clinics/{id}/doctor-invitations)
/// 6. `cancelInvitation` (POST /clinics/{id}/doctor-invitations/{id}/cancel)
/// 7. `updateDoctorStatus` (PUT /clinics/{id}/doctors/{id}/status)
/// 8. `detachDoctor` (DELETE /clinics/{id}/doctors/{id})
/// 9. `createAssistant` (POST /clinics/{id}/assistants)
/// 10. `updateAssistantStatus` (PUT /clinics/{id}/assistants/{id}/status)
/// 11. `updateAssistantPermissions` (PUT /clinics/{id}/assistants/{id}/permissions)
/// 12. `deleteAssistant` (DELETE /clinics/{id}/assistants/{id})
/// 13. `getStaffDetail` (GET /clinics/{id}/staff/{id})
class ClinicStaffService {
  const ClinicStaffService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  ApiClient get apiClient => _apiClient;

  /// 1. Fetches clinic details with populated doctors and assistants.
  Future<ApiResult<ClinicStaffData>> fetchClinicStaff(String clinicId) async {
    final result = await _apiClient.get(ApiEndpoints.clinic(clinicId));

    return switch (result) {
      ApiSuccess(:final data) => _parseClinicStaff(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 2. Provisions a new employed doctor account under the specified clinic.
  Future<ApiResult<ClinicDoctorStaff>> createEmployedDoctor(
    String clinicId, {
    required String name,
    required String email,
    required String phone,
    required String password,
    required String specialty,
    int? specialtyId,
    required String licenseNumber,
    String? bio,
  }) async {
    final body = <String, dynamic>{
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
      'specialty': specialty.trim(),
      if (specialtyId != null) 'specialty_id': specialtyId,
      'license_number': licenseNumber.trim(),
      if (bio != null && bio.trim().isNotEmpty) 'bio': bio.trim(),
    };

    final result = await _apiClient.post(
      ApiEndpoints.clinicDoctors(clinicId),
      body: body,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseDoctorFromCreation(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 3. Looks up an existing doctor by email address.
  Future<ApiResult<DoctorLookupResult>> lookupDoctor(String clinicId, String email) async {
    final result = await _apiClient.get(
      ApiEndpoints.clinicDoctorLookup(clinicId),
      queryParameters: {'email': email.trim()},
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseLookupResult(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 4. Dispatches an invitation to an existing doctor to join the clinic staff.
  Future<ApiResult<ClinicDoctorInvitation>> sendDoctorInvitation(
    String clinicId, {
    required String doctorId,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'doctor_id': doctorId,
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    };

    final result = await _apiClient.post(
      ApiEndpoints.clinicDoctorInvitations(clinicId),
      body: body,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseInvitation(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 5. Lists all invitations sent by the clinic.
  Future<ApiResult<List<ClinicDoctorInvitation>>> fetchClinicInvitations(String clinicId) async {
    final result = await _apiClient.get(ApiEndpoints.clinicDoctorInvitations(clinicId));

    return switch (result) {
      ApiSuccess(:final data) => _parseInvitationsList(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 6. Cancels a pending doctor invitation.
  Future<ApiResult<bool>> cancelInvitation(String clinicId, String invitationId) async {
    final result = await _apiClient.post(
      ApiEndpoints.clinicDoctorInvitationCancel(clinicId, invitationId),
    );

    return switch (result) {
      ApiSuccess() => const ApiSuccess(true),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 7. Updates active/suspended status of an employed doctor in the clinic.
  Future<ApiResult<bool>> updateDoctorStatus(
    String clinicId,
    String doctorId, {
    required bool isActive,
  }) async {
    final result = await _apiClient.put(
      ApiEndpoints.clinicDoctorStatus(clinicId, doctorId),
      body: {'is_active': isActive},
    );

    return switch (result) {
      ApiSuccess() => const ApiSuccess(true),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 8. Detaches an employed doctor from the clinic.
  Future<ApiResult<bool>> detachDoctor(String clinicId, String doctorId) async {
    final result = await _apiClient.delete(
      ApiEndpoints.clinicDoctorDetach(clinicId, doctorId),
    );

    return switch (result) {
      ApiSuccess() => const ApiSuccess(true),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 9. Provisions a new clinical assistant in the clinic.
  Future<ApiResult<ClinicAssistantStaff>> createAssistant(
    String clinicId, {
    required String name,
    required String email,
    required String phone,
    required String password,
    required List<String> permissions,
  }) async {
    final body = <String, dynamic>{
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
      'permissions_json': permissions,
    };

    final result = await _apiClient.post(
      ApiEndpoints.clinicAssistants(clinicId),
      body: body,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAssistant(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 10. Updates active/suspended status of an assistant in the clinic.
  Future<ApiResult<bool>> updateAssistantStatus(
    String clinicId,
    String assistantId, {
    required bool isActive,
  }) async {
    final result = await _apiClient.put(
      ApiEndpoints.clinicAssistantStatus(clinicId, assistantId),
      body: {'is_active': isActive},
    );

    return switch (result) {
      ApiSuccess() => const ApiSuccess(true),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 11. Updates delegated permissions of an assistant within the Layer 4 ceiling.
  Future<ApiResult<ClinicAssistantStaff>> updateAssistantPermissions(
    String clinicId,
    String assistantId, {
    required List<String> permissions,
  }) async {
    final result = await _apiClient.put(
      ApiEndpoints.clinicAssistantPermissions(clinicId, assistantId),
      body: {'permissions': permissions},
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseAssistant(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 12. Soft-deletes / removes an assistant from the clinic.
  Future<ApiResult<bool>> deleteAssistant(String clinicId, String assistantId) async {
    final result = await _apiClient.delete(
      ApiEndpoints.clinicAssistantDelete(clinicId, assistantId),
    );

    return switch (result) {
      ApiSuccess() => const ApiSuccess(true),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// 13. Retrieves unified details of a single staff member (doctor or assistant).
  Future<ApiResult<StaffMemberDetail>> getStaffDetail(String clinicId, String staffId) async {
    final result = await _apiClient.get(
      ApiEndpoints.clinicStaffDetail(clinicId, staffId),
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseStaffDetail(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  // --- Parser Helpers ---

  ApiResult<ClinicStaffData> _parseClinicStaff(Map<String, dynamic> response) {
    final raw = response['data'] ?? response;
    if (raw is Map<String, dynamic>) {
      return ApiSuccess(ClinicStaffData.fromJson(raw));
    }
    return const ApiFailure(
      GenericApiException(statusCode: 500, message: 'Invalid clinic staff response format.'),
    );
  }

  ApiResult<ClinicDoctorStaff> _parseDoctorFromCreation(Map<String, dynamic> response) {
    final raw = response['data'];
    if (raw is Map<String, dynamic>) {
      // Backend returns { 'user': UserResource, 'clinic': ClinicResource }
      final user = raw['user'] as Map<String, dynamic>?;
      final clinic = raw['clinic'] as Map<String, dynamic>?;
      if (user != null) {
        // Find created doctor in clinic doctors list if present
        if (clinic != null && clinic['doctors'] is List) {
          final docList = clinic['doctors'] as List;
          final match = docList.firstWhere(
            (d) => d is Map<String, dynamic> && d['user_id'] == user['id'],
            orElse: () => null,
          );
          if (match is Map<String, dynamic>) {
            return ApiSuccess(ClinicDoctorStaff.fromJson(match));
          }
        }
        return ApiSuccess(ClinicDoctorStaff(
          id: user['id']?.toString() ?? '',
          userId: user['id']?.toString(),
          name: user['name']?.toString() ?? '',
          email: user['email']?.toString(),
          phone: user['phone']?.toString(),
          position: 'doctor',
          isActive: true,
        ));
      }
    }
    return const ApiFailure(
      GenericApiException(statusCode: 500, message: 'Invalid created doctor response format.'),
    );
  }

  ApiResult<DoctorLookupResult> _parseLookupResult(Map<String, dynamic> response) {
    final raw = response['data'] ?? response;
    if (raw is Map<String, dynamic>) {
      return ApiSuccess(DoctorLookupResult.fromJson(raw));
    }
    return const ApiFailure(
      GenericApiException(statusCode: 500, message: 'Invalid doctor lookup response format.'),
    );
  }

  ApiResult<ClinicDoctorInvitation> _parseInvitation(Map<String, dynamic> response) {
    final raw = response['data'] ?? response;
    if (raw is Map<String, dynamic>) {
      return ApiSuccess(ClinicDoctorInvitation.fromJson(raw));
    }
    return const ApiFailure(
      GenericApiException(statusCode: 500, message: 'Invalid invitation response format.'),
    );
  }

  ApiResult<List<ClinicDoctorInvitation>> _parseInvitationsList(Map<String, dynamic> response) {
    final raw = response['data'];
    if (raw is List) {
      final list = <ClinicDoctorInvitation>[];
      for (final item in raw) {
        if (item is Map<String, dynamic>) {
          list.add(ClinicDoctorInvitation.fromJson(item));
        }
      }
      return ApiSuccess(list);
    }
    return const ApiSuccess(<ClinicDoctorInvitation>[]);
  }

  ApiResult<ClinicAssistantStaff> _parseAssistant(Map<String, dynamic> response) {
    final raw = response['data'] ?? response;
    if (raw is Map<String, dynamic>) {
      return ApiSuccess(ClinicAssistantStaff.fromJson(raw));
    }
    return const ApiFailure(
      GenericApiException(statusCode: 500, message: 'Invalid assistant response format.'),
    );
  }

  ApiResult<StaffMemberDetail> _parseStaffDetail(Map<String, dynamic> response) {
    final raw = response['data'] ?? response;
    if (raw is Map<String, dynamic>) {
      return ApiSuccess(StaffMemberDetail.fromJson(raw));
    }
    return const ApiFailure(
      GenericApiException(statusCode: 500, message: 'Invalid staff detail response format.'),
    );
  }
}

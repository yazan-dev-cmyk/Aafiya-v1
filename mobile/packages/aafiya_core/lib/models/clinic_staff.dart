import 'package:flutter/foundation.dart';

/// Doctor staff member associated with a clinic.
/// Mapped from `GET /api/v1/clinics/{id}` -> `data.doctors`.
@immutable
class ClinicDoctorStaff {
  const ClinicDoctorStaff({
    required this.id,
    this.userId,
    required this.name,
    this.email,
    this.phone,
    this.specialty,
    this.licenseNumber,
    this.position = 'doctor',
    this.isPrimary = false,
    this.isActive = true,
    this.joinedAt,
  });

  final String id;
  final String? userId;
  final String name;
  final String? email;
  final String? phone;
  final String? specialty;
  final String? licenseNumber;
  final String position;
  final bool isPrimary;
  final bool isActive;
  final String? joinedAt;

  bool get isDirector => position.toLowerCase() == 'director';

  factory ClinicDoctorStaff.fromJson(Map<String, dynamic> json) {
    return ClinicDoctorStaff(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString(),
      name: (json['name'] as String?) ?? '',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      specialty: json['specialty'] as String?,
      licenseNumber: json['license_number'] as String?,
      position: (json['position'] as String?) ?? 'doctor',
      isPrimary: json['is_primary'] == true,
      isActive: json['is_active'] != false,
      joinedAt: json['joined_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (userId != null) 'user_id': userId,
      'name': name,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      if (specialty != null) 'specialty': specialty,
      if (licenseNumber != null) 'license_number': licenseNumber,
      'position': position,
      'is_primary': isPrimary,
      'is_active': isActive,
      if (joinedAt != null) 'joined_at': joinedAt,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClinicDoctorStaff &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Assistant staff member associated with a clinic.
/// Mapped from `GET /api/v1/clinics/{id}` -> `data.assistants`.
@immutable
class ClinicAssistantStaff {
  const ClinicAssistantStaff({
    required this.id,
    this.userId,
    required this.name,
    this.email,
    this.phone,
    this.position = 'assistant',
    this.isActive = true,
    this.joinedAt,
    this.delegatedPermissions = const [],
  });

  final String id;
  final String? userId;
  final String name;
  final String? email;
  final String? phone;
  final String position;
  final bool isActive;
  final String? joinedAt;
  final List<String> delegatedPermissions;

  List<String> get permissions => delegatedPermissions;
  String? get createdAt => joinedAt;

  factory ClinicAssistantStaff.fromJson(Map<String, dynamic> json) {
    final rawPerms = json['delegated_permissions'] ?? json['permissions_json'];
    final perms = <String>[];
    if (rawPerms is List) {
      for (final p in rawPerms) {
        if (p != null) perms.add(p.toString());
      }
    }

    return ClinicAssistantStaff(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString(),
      name: (json['name'] as String?) ?? '',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      position: (json['position'] as String?) ?? 'assistant',
      isActive: json['is_active'] != false,
      joinedAt: json['joined_at']?.toString(),
      delegatedPermissions: List.unmodifiable(perms),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (userId != null) 'user_id': userId,
      'name': name,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      'position': position,
      'is_active': isActive,
      if (joinedAt != null) 'joined_at': joinedAt,
      'delegated_permissions': delegatedPermissions,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClinicAssistantStaff &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Container representing the clinic's staff list.
@immutable
class ClinicStaffData {
  const ClinicStaffData({
    required this.clinicId,
    required this.clinicName,
    this.wilaya,
    this.address,
    this.phone,
    this.isActive = true,
    this.doctors = const [],
    this.assistants = const [],
  });

  final String clinicId;
  final String clinicName;
  final String? wilaya;
  final String? address;
  final String? phone;
  final bool isActive;
  final List<ClinicDoctorStaff> doctors;
  final List<ClinicAssistantStaff> assistants;

  factory ClinicStaffData.fromJson(Map<String, dynamic> json) {
    final doctorsList = <ClinicDoctorStaff>[];
    if (json['doctors'] is List) {
      for (final d in json['doctors'] as List) {
        if (d is Map<String, dynamic>) {
          doctorsList.add(ClinicDoctorStaff.fromJson(d));
        }
      }
    }

    final assistantsList = <ClinicAssistantStaff>[];
    if (json['assistants'] is List) {
      for (final a in json['assistants'] as List) {
        if (a is Map<String, dynamic>) {
          assistantsList.add(ClinicAssistantStaff.fromJson(a));
        }
      }
    }

    return ClinicStaffData(
      clinicId: json['id']?.toString() ?? '',
      clinicName: (json['name'] as String?) ?? '',
      wilaya: json['wilaya'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      isActive: json['is_active'] != false,
      doctors: List.unmodifiable(doctorsList),
      assistants: List.unmodifiable(assistantsList),
    );
  }
}

/// Result of looking up an existing doctor by email.
/// Mapped from `GET /api/v1/clinics/{clinicId}/doctors/lookup?email=...`.
@immutable
class DoctorLookupResult {
  const DoctorLookupResult({
    required this.id,
    required this.fullName,
    this.specialty,
    this.licenseNumber,
    this.email,
    this.phone,
    this.isVerified = false,
    this.isAlreadyMember = false,
    this.isActiveMember = false,
    this.isSuspendedMember = false,
    this.hasPendingInvitation = false,
  });

  final String id;
  final String fullName;
  final String? specialty;
  final String? licenseNumber;
  final String? email;
  final String? phone;
  final bool isVerified;
  final bool isAlreadyMember;
  final bool isActiveMember;
  final bool isSuspendedMember;
  final bool hasPendingInvitation;

  String get name => fullName;
  bool get isAlreadyEmployed => isAlreadyMember;
  bool get isInvited => hasPendingInvitation;

  bool get canInvite =>
      isVerified && !isAlreadyMember && !hasPendingInvitation;

  DoctorLookupResult copyWith({
    String? id,
    String? fullName,
    String? specialty,
    String? licenseNumber,
    String? email,
    String? phone,
    bool? isVerified,
    bool? isAlreadyMember,
    bool? isActiveMember,
    bool? isSuspendedMember,
    bool? hasPendingInvitation,
    bool? isInvited,
  }) {
    return DoctorLookupResult(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      specialty: specialty ?? this.specialty,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      isVerified: isVerified ?? this.isVerified,
      isAlreadyMember: isAlreadyMember ?? this.isAlreadyMember,
      isActiveMember: isActiveMember ?? this.isActiveMember,
      isSuspendedMember: isSuspendedMember ?? this.isSuspendedMember,
      hasPendingInvitation:
          isInvited ?? hasPendingInvitation ?? this.hasPendingInvitation,
    );
  }

  factory DoctorLookupResult.fromJson(Map<String, dynamic> json) {
    return DoctorLookupResult(
      id: json['id']?.toString() ?? '',
      fullName: (json['full_name'] ?? json['name'])?.toString() ?? '',
      specialty: json['specialty'] as String?,
      licenseNumber: json['license_number'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      isVerified: json['is_verified'] == true,
      isAlreadyMember: json['is_already_member'] == true,
      isActiveMember: json['is_active_member'] == true,
      isSuspendedMember: json['is_suspended_member'] == true,
      hasPendingInvitation: json['has_pending_invitation'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      if (specialty != null) 'specialty': specialty,
      if (licenseNumber != null) 'license_number': licenseNumber,
      'is_verified': isVerified,
      'is_already_member': isAlreadyMember,
      'is_active_member': isActiveMember,
      'is_suspended_member': isSuspendedMember,
      'has_pending_invitation': hasPendingInvitation,
    };
  }
}

/// Invitation dispatched to an existing doctor to join a clinic.
/// Mapped from `GET /api/v1/clinics/{clinicId}/doctor-invitations`.
@immutable
class ClinicDoctorInvitation {
  const ClinicDoctorInvitation({
    required this.id,
    this.doctorId,
    this.doctorName,
    this.doctorEmail,
    this.doctorSpecialty,
    this.position = 'doctor',
    this.status = 'pending',
    this.notes,
    this.expiresAt,
    this.createdAt,
    this.respondedAt,
  });

  final String id;
  final String? doctorId;
  final String? doctorName;
  final String? doctorEmail;
  final String? doctorSpecialty;
  final String position;
  final String status;
  final String? notes;
  final String? expiresAt;
  final String? createdAt;
  final String? respondedAt;

  bool get isPending => status.toLowerCase() == 'pending';

  factory ClinicDoctorInvitation.fromJson(Map<String, dynamic> json) {
    return ClinicDoctorInvitation(
      id: json['id']?.toString() ?? '',
      doctorId: json['doctor_id']?.toString(),
      doctorName: json['doctor_name'] as String?,
      doctorEmail: json['doctor_email'] as String?,
      doctorSpecialty: json['doctor_specialty'] as String?,
      position: (json['position'] as String?) ?? 'doctor',
      status: (json['status'] as String?) ?? 'pending',
      notes: json['notes'] as String?,
      expiresAt: json['expires_at']?.toString(),
      createdAt: json['created_at']?.toString(),
      respondedAt: json['responded_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (doctorId != null) 'doctor_id': doctorId,
      if (doctorName != null) 'doctor_name': doctorName,
      if (doctorEmail != null) 'doctor_email': doctorEmail,
      if (doctorSpecialty != null) 'doctor_specialty': doctorSpecialty,
      'position': position,
      'status': status,
      if (notes != null) 'notes': notes,
      if (expiresAt != null) 'expires_at': expiresAt,
      if (createdAt != null) 'created_at': createdAt,
      if (respondedAt != null) 'responded_at': respondedAt,
    };
  }
}

/// Unified single staff member detail.
/// Mapped from `GET /api/v1/clinics/{clinicId}/staff/{staffId}`.
@immutable
class StaffMemberDetail {
  const StaffMemberDetail({
    required this.id,
    this.userId,
    required this.type,
    required this.name,
    this.email,
    this.phone,
    this.specialty,
    this.licenseNumber,
    this.bio,
    this.position = 'doctor',
    this.isPrimary = false,
    this.isActive = true,
    this.isVerified = false,
    this.joinedAt,
    this.delegatedPermissions = const [],
    this.permissions = const [],
  });

  final String id;
  final String? userId;
  final String type; // 'doctor' | 'assistant'
  final String name;
  final String? email;
  final String? phone;
  final String? specialty;
  final String? licenseNumber;
  final String? bio;
  final String position;
  final bool isPrimary;
  final bool isActive;
  final bool isVerified;
  final String? joinedAt;
  final List<String> delegatedPermissions;
  final List<String> permissions;

  bool get isDoctor => type.toLowerCase() == 'doctor';
  bool get isAssistant => type.toLowerCase() == 'assistant';
  bool get isDirector => position.toLowerCase() == 'director';

  factory StaffMemberDetail.fromJson(Map<String, dynamic> json) {
    final rawDelegated = json['delegated_permissions'] ?? json['permissions_json'];
    final delegated = <String>[];
    if (rawDelegated is List) {
      for (final p in rawDelegated) {
        if (p != null) delegated.add(p.toString());
      }
    }

    final rawPerms = json['permissions'];
    final allPerms = <String>[];
    if (rawPerms is List) {
      for (final p in rawPerms) {
        if (p != null) allPerms.add(p.toString());
      }
    }

    return StaffMemberDetail(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString(),
      type: (json['type'] as String?) ?? 'doctor',
      name: (json['name'] as String?) ?? '',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      specialty: json['specialty'] as String?,
      licenseNumber: json['license_number'] as String?,
      bio: json['bio'] as String?,
      position: (json['position'] as String?) ?? 'doctor',
      isPrimary: json['is_primary'] == true,
      isActive: json['is_active'] != false,
      isVerified: json['is_verified'] == true,
      joinedAt: json['joined_at']?.toString(),
      delegatedPermissions: List.unmodifiable(delegated),
      permissions: List.unmodifiable(allPerms),
    );
  }
}

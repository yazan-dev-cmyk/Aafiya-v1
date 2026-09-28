import 'package:flutter/foundation.dart';

/// Represents an emergency contact person associated with a patient.
@immutable
class EmergencyContact {
  const EmergencyContact({
    required this.id,
    this.patientId,
    required this.name,
    required this.relationship,
    required this.phone,
    this.isPrimary = false,
    this.createdAt,
  });

  final String id;
  final String? patientId;
  final String name;
  final String relationship;
  final String phone;
  final bool isPrimary;
  final DateTime? createdAt;

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    DateTime? parsedCreatedAt;
    if (json['created_at'] is String) {
      parsedCreatedAt = DateTime.tryParse(json['created_at'] as String);
    }

    return EmergencyContact(
      id: json['id'] as String? ?? '',
      patientId: json['patient_id'] as String?,
      name: json['name'] as String? ?? '',
      relationship: json['relationship'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      isPrimary: json['is_primary'] as bool? ?? false,
      createdAt: parsedCreatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (patientId != null) 'patient_id': patientId,
        'name': name,
        'relationship': relationship,
        'phone': phone,
        'is_primary': isPrimary,
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      };
}

/// Represents a documented patient allergy adhering to PatientAllergyResource.
@immutable
class PatientAllergy {
  const PatientAllergy({
    required this.id,
    this.patientId,
    required this.allergen,
    required this.severity,
    this.reaction,
    this.diagnosedAt,
    this.notes,
    this.createdAt,
  });

  final String id;
  final String? patientId;
  final String allergen;
  final String severity;
  final String? reaction;
  final String? diagnosedAt;
  final String? notes;
  final DateTime? createdAt;

  bool get isLifeThreatening => severity.toLowerCase() == 'life_threatening';
  bool get isSevere => severity.toLowerCase() == 'severe';
  bool get isModerate => severity.toLowerCase() == 'moderate';
  bool get isMild => severity.toLowerCase() == 'mild';

  factory PatientAllergy.fromJson(Map<String, dynamic> json) {
    DateTime? parsedCreatedAt;
    if (json['created_at'] is String) {
      parsedCreatedAt = DateTime.tryParse(json['created_at'] as String);
    }

    return PatientAllergy(
      id: json['id'] as String? ?? '',
      patientId: json['patient_id'] as String?,
      allergen: json['allergen'] as String? ?? '',
      severity: json['severity'] as String? ?? 'mild',
      reaction: json['reaction'] as String?,
      diagnosedAt: json['diagnosed_at'] as String?,
      notes: json['notes'] as String?,
      createdAt: parsedCreatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (patientId != null) 'patient_id': patientId,
        'allergen': allergen,
        'severity': severity,
        if (reaction != null) 'reaction': reaction,
        if (diagnosedAt != null) 'diagnosed_at': diagnosedAt,
        if (notes != null) 'notes': notes,
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      };
}

/// Represents a documented chronic condition adhering to PatientChronicConditionResource.
@immutable
class ChronicCondition {
  const ChronicCondition({
    required this.id,
    this.patientId,
    required this.conditionName,
    this.icd10Code,
    this.diagnosedDate,
    this.status = 'active',
    this.notes,
    this.createdAt,
  });

  final String id;
  final String? patientId;
  final String conditionName;
  final String? icd10Code;
  final String? diagnosedDate;
  final String status;
  final String? notes;
  final DateTime? createdAt;

  bool get isActive => status.toLowerCase() == 'active';

  factory ChronicCondition.fromJson(Map<String, dynamic> json) {
    DateTime? parsedCreatedAt;
    if (json['created_at'] is String) {
      parsedCreatedAt = DateTime.tryParse(json['created_at'] as String);
    }

    return ChronicCondition(
      id: json['id'] as String? ?? '',
      patientId: json['patient_id'] as String?,
      conditionName: json['condition_name'] as String? ?? '',
      icd10Code: json['icd10_code'] as String?,
      diagnosedDate: json['diagnosed_date'] as String?,
      status: json['status'] as String? ?? 'active',
      notes: json['notes'] as String?,
      createdAt: parsedCreatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (patientId != null) 'patient_id': patientId,
        'condition_name': conditionName,
        if (icd10Code != null) 'icd10_code': icd10Code,
        if (diagnosedDate != null) 'diagnosed_date': diagnosedDate,
        'status': status,
        if (notes != null) 'notes': notes,
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      };
}

/// Represents a documented active medication.
@immutable
class CurrentMedication {
  const CurrentMedication({
    required this.id,
    this.patientId,
    required this.medicationName,
    required this.dosage,
    required this.frequency,
    this.prescribedBy,
    this.startDate,
    this.endDate,
    this.status = 'active',
    this.notes,
  });

  final String id;
  final String? patientId;
  final String medicationName;
  final String dosage;
  final String frequency;
  final String? prescribedBy;
  final String? startDate;
  final String? endDate;
  final String status;
  final String? notes;

  factory CurrentMedication.fromJson(Map<String, dynamic> json) {
    return CurrentMedication(
      id: json['id'] as String? ?? '',
      patientId: json['patient_id'] as String?,
      medicationName: json['medication_name'] as String? ?? '',
      dosage: json['dosage'] as String? ?? '',
      frequency: json['frequency'] as String? ?? '',
      prescribedBy: json['prescribed_by'] as String?,
      startDate: json['start_date'] as String?,
      endDate: json['end_date'] as String?,
      status: json['status'] as String? ?? 'active',
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (patientId != null) 'patient_id': patientId,
        'medication_name': medicationName,
        'dosage': dosage,
        'frequency': frequency,
        if (prescribedBy != null) 'prescribed_by': prescribedBy,
        if (startDate != null) 'start_date': startDate,
        if (endDate != null) 'end_date': endDate,
        'status': status,
        if (notes != null) 'notes': notes,
      };
}

/// Emergency profile data representation adhering to PatientResource (GET /api/v1/patients/me).
@immutable
class EmergencyProfile {
  const EmergencyProfile({
    required this.id,
    required this.mrn,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    this.gender,
    this.dateOfBirth,
    this.bloodGroup,
    this.phone,
    this.email,
    this.nationalId,
    this.address,
    this.wilaya,
    this.isActive = true,
    this.emergencyContacts = const [],
    this.allergies = const [],
    this.chronicConditions = const [],
    this.currentMedications = const [],
    this.createdAt,
  });

  final String id;
  final String mrn;
  final String firstName;
  final String lastName;
  final String fullName;
  final String? gender;
  final String? dateOfBirth;
  final String? bloodGroup;
  final String? phone;
  final String? email;
  final String? nationalId;
  final String? address;
  final String? wilaya;
  final bool isActive;
  final List<EmergencyContact> emergencyContacts;
  final List<PatientAllergy> allergies;
  final List<ChronicCondition> chronicConditions;
  final List<CurrentMedication> currentMedications;
  final DateTime? createdAt;

  String? get bloodType => bloodGroup;
  bool get hasAllergies => allergies.isNotEmpty;
  bool get hasChronicConditions => chronicConditions.isNotEmpty;
  bool get isChronic => chronicConditions.isNotEmpty;
  bool get hasEmergencyContacts => emergencyContacts.isNotEmpty;

  factory EmergencyProfile.fromJson(Map<String, dynamic> json) {
    final rawContacts = json['emergency_contacts'] as List<dynamic>? ?? const [];
    final contacts = rawContacts
        .whereType<Map<String, dynamic>>()
        .map(EmergencyContact.fromJson)
        .toList();

    final rawAllergies = json['allergies'] as List<dynamic>? ?? const [];
    final allergies = rawAllergies
        .whereType<Map<String, dynamic>>()
        .map(PatientAllergy.fromJson)
        .toList();

    final rawConditions = json['chronic_conditions'] as List<dynamic>? ?? const [];
    final conditions = rawConditions
        .whereType<Map<String, dynamic>>()
        .map(ChronicCondition.fromJson)
        .toList();

    final rawMedications = json['current_medications'] as List<dynamic>? ?? const [];
    final medications = rawMedications
        .whereType<Map<String, dynamic>>()
        .map(CurrentMedication.fromJson)
        .toList();

    DateTime? parsedCreatedAt;
    if (json['created_at'] is String) {
      parsedCreatedAt = DateTime.tryParse(json['created_at'] as String);
    }

    return EmergencyProfile(
      id: json['id'] as String? ?? '',
      mrn: json['mrn'] as String? ?? '',
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      fullName: json['full_name'] as String? ?? '${json['first_name'] ?? ''} ${json['last_name'] ?? ''}'.trim(),
      gender: json['gender'] as String?,
      dateOfBirth: json['date_of_birth'] as String?,
      bloodGroup: json['blood_group'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      nationalId: json['national_id'] as String?,
      address: json['address'] as String?,
      wilaya: json['wilaya'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      emergencyContacts: contacts,
      allergies: allergies,
      chronicConditions: conditions,
      currentMedications: medications,
      createdAt: parsedCreatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'mrn': mrn,
        'first_name': firstName,
        'last_name': lastName,
        'full_name': fullName,
        if (gender != null) 'gender': gender,
        if (dateOfBirth != null) 'date_of_birth': dateOfBirth,
        if (bloodGroup != null) 'blood_group': bloodGroup,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (nationalId != null) 'national_id': nationalId,
        if (address != null) 'address': address,
        if (wilaya != null) 'wilaya': wilaya,
        'is_active': isActive,
        'emergency_contacts': emergencyContacts.map((c) => c.toJson()).toList(),
        'allergies': allergies.map((a) => a.toJson()).toList(),
        'chronic_conditions': chronicConditions.map((c) => c.toJson()).toList(),
        'current_medications': currentMedications.map((m) => m.toJson()).toList(),
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      };
}

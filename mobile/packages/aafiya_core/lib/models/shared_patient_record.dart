import 'package:flutter/foundation.dart';

/// Immutable model for a patient allergy item within a shared medical record.
@immutable
class SharedPatientAllergy {
  const SharedPatientAllergy({
    required this.id,
    required this.patientId,
    required this.allergen,
    this.severity,
    this.reaction,
    this.diagnosedAt,
    this.notes,
    this.createdAt,
  });

  final String id;
  final String patientId;
  final String allergen;
  final String? severity;
  final String? reaction;
  final String? diagnosedAt;
  final String? notes;
  final String? createdAt;

  factory SharedPatientAllergy.fromJson(Map<String, dynamic> json) {
    return SharedPatientAllergy(
      id: json['id']?.toString() ?? '',
      patientId: json['patient_id']?.toString() ?? '',
      allergen: json['allergen']?.toString() ?? '',
      severity: json['severity'] as String?,
      reaction: json['reaction'] as String?,
      diagnosedAt: json['diagnosed_at'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}

/// Immutable model for a chronic condition within a shared medical record.
@immutable
class SharedPatientChronicCondition {
  const SharedPatientChronicCondition({
    required this.id,
    required this.patientId,
    required this.conditionName,
    this.icd10Code,
    this.diagnosedDate,
    this.status,
    this.notes,
    this.createdAt,
  });

  final String id;
  final String patientId;
  final String conditionName;
  final String? icd10Code;
  final String? diagnosedDate;
  final String? status;
  final String? notes;
  final String? createdAt;

  factory SharedPatientChronicCondition.fromJson(Map<String, dynamic> json) {
    return SharedPatientChronicCondition(
      id: json['id']?.toString() ?? '',
      patientId: json['patient_id']?.toString() ?? '',
      conditionName: json['condition_name']?.toString() ?? '',
      icd10Code: json['icd10_code'] as String?,
      diagnosedDate: json['diagnosed_date'] as String?,
      status: json['status'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}

/// Immutable model for a current medication item within a shared medical record.
@immutable
class SharedPatientCurrentMedication {
  const SharedPatientCurrentMedication({
    required this.id,
    required this.patientId,
    required this.medicationName,
    this.dosage,
    this.frequency,
    this.startDate,
    this.prescribedBy,
    this.isActive = true,
    this.notes,
    this.createdAt,
  });

  final String id;
  final String patientId;
  final String medicationName;
  final String? dosage;
  final String? frequency;
  final String? startDate;
  final String? prescribedBy;
  final bool isActive;
  final String? notes;
  final String? createdAt;

  factory SharedPatientCurrentMedication.fromJson(Map<String, dynamic> json) {
    return SharedPatientCurrentMedication(
      id: json['id']?.toString() ?? '',
      patientId: json['patient_id']?.toString() ?? '',
      medicationName: json['medication_name']?.toString() ?? '',
      dosage: json['dosage'] as String?,
      frequency: json['frequency'] as String?,
      startDate: json['start_date'] as String?,
      prescribedBy: json['prescribed_by'] as String?,
      isActive: (json['is_active'] as bool?) ?? true,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}

/// Immutable, privacy-minimized patient entity within a shared record.
///
/// PROHIBITED EXCLUDED FIELDS:
/// - phone
/// - email
/// - national_id
/// - address
/// - wilaya_id
/// - user_id
@immutable
class SharedPatient {
  const SharedPatient({
    required this.id,
    required this.mrn,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    this.gender,
    this.dateOfBirth,
    this.bloodGroup,
    this.allergies = const [],
    this.chronicConditions = const [],
    this.currentMedications = const [],
  });

  final String id;
  final String mrn;
  final String firstName;
  final String lastName;
  final String fullName;
  final String? gender;
  final String? dateOfBirth;
  final String? bloodGroup;
  final List<SharedPatientAllergy> allergies;
  final List<SharedPatientChronicCondition> chronicConditions;
  final List<SharedPatientCurrentMedication> currentMedications;

  factory SharedPatient.fromJson(Map<String, dynamic> json) {
    final rawAllergies = json['allergies'] as List<dynamic>?;
    final rawConditions = json['chronic_conditions'] as List<dynamic>?;
    final rawMeds = json['current_medications'] as List<dynamic>?;

    return SharedPatient(
      id: json['id']?.toString() ?? '',
      mrn: json['mrn']?.toString() ?? '',
      firstName: json['first_name']?.toString() ?? '',
      lastName: json['last_name']?.toString() ?? '',
      fullName: json['full_name']?.toString() ?? '',
      gender: json['gender'] as String?,
      dateOfBirth: json['date_of_birth'] as String?,
      bloodGroup: json['blood_group'] as String?,
      allergies: rawAllergies != null
          ? rawAllergies
              .whereType<Map<String, dynamic>>()
              .map(SharedPatientAllergy.fromJson)
              .toList()
          : const [],
      chronicConditions: rawConditions != null
          ? rawConditions
              .whereType<Map<String, dynamic>>()
              .map(SharedPatientChronicCondition.fromJson)
              .toList()
          : const [],
      currentMedications: rawMeds != null
          ? rawMeds
              .whereType<Map<String, dynamic>>()
              .map(SharedPatientCurrentMedication.fromJson)
              .toList()
          : const [],
    );
  }
}

/// Immutable metadata describing the authorization window of the shared record.
@immutable
class SharedRecordMetadata {
  const SharedRecordMetadata({
    required this.scope,
    this.accessGrantedAt,
    this.expiresAt,
    this.authorizedClinicalScope,
  });

  final String scope;
  final String? accessGrantedAt;
  final String? expiresAt;
  final String? authorizedClinicalScope;

  factory SharedRecordMetadata.fromJson(Map<String, dynamic> json) {
    return SharedRecordMetadata(
      scope: json['scope']?.toString() ?? 'all_emr',
      accessGrantedAt: json['access_granted_at'] as String?,
      expiresAt: json['expires_at'] as String?,
      authorizedClinicalScope: json['authorized_clinical_scope'] as String?,
    );
  }
}

/// Root shared medical record response matching SharedPatientMedicalRecordResource.
@immutable
class SharedPatientRecord {
  const SharedPatientRecord({
    required this.scope,
    required this.patient,
    required this.shareMetadata,
  });

  final String scope;
  final SharedPatient patient;
  final SharedRecordMetadata shareMetadata;

  factory SharedPatientRecord.fromJson(Map<String, dynamic> json) {
    // Check if envelope has 'data'
    final Map<String, dynamic> data = json.containsKey('data') && json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;

    return SharedPatientRecord(
      scope: data['scope']?.toString() ?? 'all_emr',
      patient: SharedPatient.fromJson((data['patient'] as Map<String, dynamic>?) ?? {}),
      shareMetadata: SharedRecordMetadata.fromJson((data['share_metadata'] as Map<String, dynamic>?) ?? {}),
    );
  }
}

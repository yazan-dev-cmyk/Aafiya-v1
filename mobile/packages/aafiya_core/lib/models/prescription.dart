import 'package:flutter/foundation.dart';

/// Represents a single medication item within a digital prescription.
@immutable
class PrescriptionItem {
  const PrescriptionItem({
    required this.id,
    required this.medicationName,
    required this.dosage,
    required this.frequency,
    required this.duration,
    this.instructions,
    this.substitutionAllowed,
  });

  final String id;
  final String medicationName;
  final String dosage;
  final String frequency;
  final String duration;
  final String? instructions;
  final bool? substitutionAllowed;

  factory PrescriptionItem.fromJson(Map<String, dynamic> json) {
    return PrescriptionItem(
      id: json['id'] as String? ?? '',
      medicationName: json['medication_name'] as String? ?? '',
      dosage: json['dosage'] as String? ?? '',
      frequency: json['frequency'] as String? ?? '',
      duration: json['duration'] as String? ?? '',
      instructions: json['instructions'] as String?,
      substitutionAllowed: json['substitution_allowed'] as bool?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'medication_name': medicationName,
        'dosage': dosage,
        'frequency': frequency,
        'duration': duration,
        if (instructions != null) 'instructions': instructions,
        if (substitutionAllowed != null) 'substitution_allowed': substitutionAllowed,
      };
}

/// Brief patient identity embedded inside PrescriptionResource.
@immutable
class PrescriptionPatient {
  const PrescriptionPatient({
    required this.id,
    required this.name,
    this.mrn,
    this.phone,
  });

  final String id;
  final String name;
  final String? mrn;
  final String? phone;

  factory PrescriptionPatient.fromJson(Map<String, dynamic> json) {
    return PrescriptionPatient(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      mrn: json['mrn'] as String?,
      phone: json['phone'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (mrn != null) 'mrn': mrn,
        if (phone != null) 'phone': phone,
      };
}

/// Brief doctor identity embedded inside PrescriptionResource.
@immutable
class PrescriptionDoctor {
  const PrescriptionDoctor({
    required this.id,
    required this.name,
    this.specialty,
  });

  final String id;
  final String name;
  final String? specialty;

  factory PrescriptionDoctor.fromJson(Map<String, dynamic> json) {
    return PrescriptionDoctor(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      specialty: json['specialty'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (specialty != null) 'specialty': specialty,
      };
}

/// Brief clinic identity embedded inside PrescriptionResource.
@immutable
class PrescriptionClinic {
  const PrescriptionClinic({
    required this.id,
    required this.name,
    this.phone,
  });

  final String id;
  final String name;
  final String? phone;

  factory PrescriptionClinic.fromJson(Map<String, dynamic> json) {
    return PrescriptionClinic(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (phone != null) 'phone': phone,
      };
}

/// Digital prescription representation adhering strictly to PrescriptionResource contract.
@immutable
class Prescription {
  const Prescription({
    required this.id,
    required this.prescriptionReference,
    required this.secureToken,
    required this.qrVerificationUrl,
    required this.patient,
    required this.doctor,
    required this.clinic,
    this.clinicalVisitId,
    this.issueDate,
    this.expiryDate,
    required this.status,
    required this.isValid,
    this.notes,
    required this.items,
    this.createdAt,
  });

  final String id;
  final String prescriptionReference;
  final String secureToken;
  final String qrVerificationUrl;
  final PrescriptionPatient patient;
  final PrescriptionDoctor doctor;
  final PrescriptionClinic clinic;
  final String? clinicalVisitId;
  final String? issueDate;
  final String? expiryDate;
  final String status;
  final bool isValid;
  final String? notes;
  final List<PrescriptionItem> items;
  final DateTime? createdAt;

  bool get isActive => status == 'active' && isValid;
  bool get isVoided => status == 'voided';
  bool get isExpired => status == 'expired' || (!isValid && status == 'active');
  bool get isCompleted => status == 'completed';

  factory Prescription.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    final items = rawItems
        .whereType<Map<String, dynamic>>()
        .map(PrescriptionItem.fromJson)
        .toList();

    DateTime? parsedCreatedAt;
    if (json['created_at'] is String) {
      parsedCreatedAt = DateTime.tryParse(json['created_at'] as String);
    }

    return Prescription(
      id: json['id'] as String? ?? '',
      prescriptionReference: json['prescription_reference'] as String? ?? '',
      secureToken: json['secure_token'] as String? ?? '',
      qrVerificationUrl: json['qr_verification_url'] as String? ?? '',
      patient: PrescriptionPatient.fromJson(
        json['patient'] as Map<String, dynamic>? ?? const {},
      ),
      doctor: PrescriptionDoctor.fromJson(
        json['doctor'] as Map<String, dynamic>? ?? const {},
      ),
      clinic: PrescriptionClinic.fromJson(
        json['clinic'] as Map<String, dynamic>? ?? const {},
      ),
      clinicalVisitId: json['clinical_visit_id'] as String?,
      issueDate: json['issue_date'] as String?,
      expiryDate: json['expiry_date'] as String?,
      status: json['status'] as String? ?? 'active',
      isValid: json['is_valid'] as bool? ?? false,
      notes: json['notes'] as String?,
      items: items,
      createdAt: parsedCreatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'prescription_reference': prescriptionReference,
        'secure_token': secureToken,
        'qr_verification_url': qrVerificationUrl,
        'patient': patient.toJson(),
        'doctor': doctor.toJson(),
        'clinic': clinic.toJson(),
        if (clinicalVisitId != null) 'clinical_visit_id': clinicalVisitId,
        if (issueDate != null) 'issue_date': issueDate,
        if (expiryDate != null) 'expiry_date': expiryDate,
        'status': status,
        'is_valid': isValid,
        if (notes != null) 'notes': notes,
        'items': items.map((i) => i.toJson()).toList(),
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      };
}

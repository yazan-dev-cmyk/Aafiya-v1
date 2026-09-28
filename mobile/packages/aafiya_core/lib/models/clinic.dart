import 'package:flutter/foundation.dart';

/// Director of a clinic.
@immutable
class ClinicDirector {
  const ClinicDirector({
    required this.id,
    required this.name,
    this.specialty,
  });

  final String id;
  final String name;
  final String? specialty;

  factory ClinicDirector.fromJson(Map<String, dynamic> json) {
    return ClinicDirector(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      specialty: json['specialty'] as String?,
    );
  }
}

/// Doctor practicing at a clinic.
@immutable
class ClinicDoctorAffiliation {
  const ClinicDoctorAffiliation({
    required this.id,
    required this.name,
    this.specialty,
    this.position,
    this.isPrimary = false,
    this.isActive = true,
  });

  final String id;
  final String name;
  final String? specialty;
  final String? position;
  final bool isPrimary;
  final bool isActive;

  factory ClinicDoctorAffiliation.fromJson(Map<String, dynamic> json) {
    return ClinicDoctorAffiliation(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      specialty: json['specialty'] as String?,
      position: json['position'] as String?,
      isPrimary: json['is_primary'] == true,
      isActive: json['is_active'] != false,
    );
  }
}

/// Public Clinic domain model mapped directly from Laravel `ClinicResource`.
@immutable
class Clinic {
  const Clinic({
    required this.id,
    required this.name,
    this.address,
    this.wilaya,
    this.phone,
    this.maxPatientsPerSlot,
    this.slotDurationMin,
    this.isActive = true,
    this.director,
    this.doctors = const [],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String? address;
  final String? wilaya;
  final String? phone;
  final int? maxPatientsPerSlot;
  final int? slotDurationMin;
  final bool isActive;
  final ClinicDirector? director;
  final List<ClinicDoctorAffiliation> doctors;
  final String? createdAt;
  final String? updatedAt;

  factory Clinic.fromJson(Map<String, dynamic> json) {
    final directorRaw = json['director'];
    final doctorsRaw = json['doctors'];
    final doctorsList = <ClinicDoctorAffiliation>[];
    if (doctorsRaw is List) {
      for (final d in doctorsRaw) {
        if (d is Map<String, dynamic>) {
          doctorsList.add(ClinicDoctorAffiliation.fromJson(d));
        }
      }
    }

    return Clinic(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      address: json['address'] as String?,
      wilaya: json['wilaya'] as String?,
      phone: json['phone'] as String?,
      maxPatientsPerSlot: json['max_patients_per_slot'] as int?,
      slotDurationMin: json['slot_duration_min'] as int?,
      isActive: json['is_active'] != false,
      director: directorRaw is Map<String, dynamic>
          ? ClinicDirector.fromJson(directorRaw)
          : null,
      doctors: doctorsList,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }
}

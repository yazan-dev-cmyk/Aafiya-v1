import 'package:flutter/foundation.dart';

/// Affiliated clinic where a doctor practices.
@immutable
class DoctorClinicAffiliation {
  const DoctorClinicAffiliation({
    required this.id,
    required this.name,
    this.wilaya,
    this.address,
    this.phone,
    this.position,
  });

  final String id;
  final String name;
  final String? wilaya;
  final String? address;
  final String? phone;
  final String? position;

  factory DoctorClinicAffiliation.fromJson(Map<String, dynamic> json) {
    return DoctorClinicAffiliation(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      wilaya: json['wilaya'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      position: json['position'] as String?,
    );
  }
}

/// Public Doctor domain model mapped directly from Laravel `DoctorPublicResource`.
@immutable
class Doctor {
  const Doctor({
    required this.id,
    required this.name,
    required this.specialty,
    this.bio,
    this.isVerified = false,
    this.clinics = const [],
    this.createdAt,
  });

  final String id;
  final String name;
  final String specialty;
  final String? bio;
  final bool isVerified;
  final List<DoctorClinicAffiliation> clinics;
  final String? createdAt;

  factory Doctor.fromJson(Map<String, dynamic> json) {
    final clinicsRaw = json['clinics'];
    final clinicsList = <DoctorClinicAffiliation>[];
    if (clinicsRaw is List) {
      for (final c in clinicsRaw) {
        if (c is Map<String, dynamic>) {
          clinicsList.add(DoctorClinicAffiliation.fromJson(c));
        }
      }
    }

    return Doctor(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      specialty: (json['specialty'] as String?) ?? '',
      bio: json['bio'] as String?,
      isVerified: json['is_verified'] == true,
      clinics: clinicsList,
      createdAt: json['created_at'] as String?,
    );
  }
}

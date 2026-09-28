import 'package:flutter/foundation.dart';

/// Represents a clinic affiliated with an authenticated doctor.
/// Mapped directly from `GET /api/v1/doctor/clinics`.
@immutable
class DoctorClinic {
  const DoctorClinic({
    required this.id,
    required this.name,
    this.wilaya,
    this.address,
    this.phone,
    this.position = 'doctor',
    this.isDirector = false,
    this.isActive = true,
    this.isPrimary = false,
    this.joinedAt,
  });

  final String id;
  final String name;
  final String? wilaya;
  final String? address;
  final String? phone;
  final String position;
  final bool isDirector;
  final bool isActive;
  final bool isPrimary;
  final String? joinedAt;

  /// Helper indicating if the doctor holds the Medical Director position.
  bool get isMedicalDirector => isDirector || position.toLowerCase() == 'director';

  factory DoctorClinic.fromJson(Map<String, dynamic> json) {
    return DoctorClinic(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      wilaya: json['wilaya'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      position: (json['position'] as String?) ?? 'doctor',
      isDirector: json['is_director'] == true,
      isActive: json['is_active'] != false,
      isPrimary: json['is_primary'] == true,
      joinedAt: json['joined_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (wilaya != null) 'wilaya': wilaya,
      if (address != null) 'address': address,
      if (phone != null) 'phone': phone,
      'position': position,
      'is_director': isDirector,
      'is_active': isActive,
      'is_primary': isPrimary,
      if (joinedAt != null) 'joined_at': joinedAt,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DoctorClinic &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'DoctorClinic(id: $id, name: $name, position: $position, isDirector: $isDirector)';
}

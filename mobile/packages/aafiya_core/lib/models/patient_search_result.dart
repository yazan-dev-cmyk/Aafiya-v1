import 'package:flutter/foundation.dart';

/// Lightweight patient search result model mapped from Laravel `PatientResource`.
@immutable
class PatientSearchResult {
  const PatientSearchResult({
    required this.id,
    required this.mrn,
    required this.firstName,
    required this.lastName,
    this.gender,
    this.dateOfBirth,
    this.phone,
    this.email,
    this.nationalId,
    this.bloodType,
  });

  final String id;
  final String mrn;
  final String firstName;
  final String lastName;
  final String? gender;
  final String? dateOfBirth;
  final String? phone;
  final String? email;
  final String? nationalId;
  final String? bloodType;

  /// Full display name combining first and last name.
  String get fullName => '$firstName $lastName'.trim();

  factory PatientSearchResult.fromJson(Map<String, dynamic> json) {
    return PatientSearchResult(
      id: (json['id']?.toString()) ?? '',
      mrn: (json['mrn'] as String?) ?? '',
      firstName: (json['first_name'] as String?) ?? '',
      lastName: (json['last_name'] as String?) ?? '',
      gender: json['gender'] as String?,
      dateOfBirth: json['date_of_birth'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      nationalId: json['national_id'] as String?,
      bloodType: json['blood_type'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'mrn': mrn,
        'first_name': firstName,
        'last_name': lastName,
        if (gender != null) 'gender': gender,
        if (dateOfBirth != null) 'date_of_birth': dateOfBirth,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (nationalId != null) 'national_id': nationalId,
        if (bloodType != null) 'blood_type': bloodType,
      };
}

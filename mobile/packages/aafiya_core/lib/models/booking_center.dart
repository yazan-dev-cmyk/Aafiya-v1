import 'package:flutter/foundation.dart';

/// Public Booking Center domain model mapped directly from Laravel `BookingCenterResource`.
@immutable
class BookingCenter {
  const BookingCenter({
    required this.id,
    required this.name,
    this.commercialRegister,
    this.licenseNumber,
    this.phone,
    this.email,
    this.address,
    this.wilaya,
    this.quotaBalance = 0,
    this.verificationStatus = 'verified',
    this.isActive = true,
    this.createdAt,
  });

  final String id;
  final String name;
  final String? commercialRegister;
  final String? licenseNumber;
  final String? phone;
  final String? email;
  final String? address;
  final String? wilaya;
  final int quotaBalance;
  final String verificationStatus;
  final bool isActive;
  final String? createdAt;

  factory BookingCenter.fromJson(Map<String, dynamic> json) {
    return BookingCenter(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      commercialRegister: json['commercial_register'] as String?,
      licenseNumber: json['license_number'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      wilaya: json['wilaya'] as String?,
      quotaBalance: (json['quota_balance'] as num?)?.toInt() ?? 0,
      verificationStatus: (json['verification_status'] as String?) ?? 'verified',
      isActive: json['is_active'] != false,
      createdAt: json['created_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'commercial_register': commercialRegister,
        'license_number': licenseNumber,
        'phone': phone,
        'email': email,
        'address': address,
        'wilaya': wilaya,
        'quota_balance': quotaBalance,
        'verification_status': verificationStatus,
        'is_active': isActive,
        'created_at': createdAt,
      };
}

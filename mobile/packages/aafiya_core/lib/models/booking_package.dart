import 'package:flutter/foundation.dart';

/// Domain representation of a commercial booking package available for purchase.
/// Sourced dynamically from `GET /api/v1/booking-packages`.
@immutable
class BookingPackage {
  const BookingPackage({
    required this.id,
    required this.packageCode,
    required this.name,
    required this.quotaUnits,
    required this.priceDzd,
    this.description,
    required this.isActive,
  });

  final String id;
  final String packageCode;
  final String name;
  final int quotaUnits;
  final double priceDzd;
  final String? description;
  final bool isActive;

  factory BookingPackage.fromJson(Map<String, dynamic> json) {
    return BookingPackage(
      id: json['id'] as String? ?? '',
      packageCode: json['package_code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      quotaUnits: (json['quota_units'] as num?)?.toInt() ?? 0,
      priceDzd: (json['price_dzd'] as num?)?.toDouble() ?? 0.0,
      description: json['description'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'package_code': packageCode,
      'name': name,
      'quota_units': quotaUnits,
      'price_dzd': priceDzd,
      'description': description,
      'is_active': isActive,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BookingPackage &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          packageCode == other.packageCode &&
          name == other.name &&
          quotaUnits == other.quotaUnits &&
          priceDzd == other.priceDzd &&
          description == other.description &&
          isActive == other.isActive;

  @override
  int get hashCode =>
      id.hashCode ^
      packageCode.hashCode ^
      name.hashCode ^
      quotaUnits.hashCode ^
      priceDzd.hashCode ^
      description.hashCode ^
      isActive.hashCode;
}

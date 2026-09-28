import 'package:flutter/foundation.dart';

/// Domain representation of a Booking Center's active quota balance.
/// Sourced from `GET /api/v1/booking-centers/quota-balance`.
@immutable
class BookingCenterQuota {
  const BookingCenterQuota({
    required this.bookingCenterId,
    required this.name,
    required this.quotaBalance,
  });

  final String bookingCenterId;
  final String name;
  final int quotaBalance;

  factory BookingCenterQuota.fromJson(Map<String, dynamic> json) {
    return BookingCenterQuota(
      bookingCenterId: json['booking_center_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      quotaBalance: (json['quota_balance'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'booking_center_id': bookingCenterId,
      'name': name,
      'quota_balance': quotaBalance,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BookingCenterQuota &&
          runtimeType == other.runtimeType &&
          bookingCenterId == other.bookingCenterId &&
          name == other.name &&
          quotaBalance == other.quotaBalance;

  @override
  int get hashCode =>
      bookingCenterId.hashCode ^ name.hashCode ^ quotaBalance.hashCode;
}

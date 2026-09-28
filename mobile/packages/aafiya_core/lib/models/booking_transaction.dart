import 'package:flutter/foundation.dart';

/// Transaction type indicating the business nature of the quota movement.
enum BookingTransactionType {
  purchase,
  confirmation,
  refund,
  unknown;

  static BookingTransactionType fromString(String? type) {
    return switch (type?.toLowerCase().trim()) {
      'purchase' => BookingTransactionType.purchase,
      'confirmation' => BookingTransactionType.confirmation,
      'refund' => BookingTransactionType.refund,
      _ => BookingTransactionType.unknown,
    };
  }

  String get value => switch (this) {
        BookingTransactionType.purchase => 'purchase',
        BookingTransactionType.confirmation => 'confirmation',
        BookingTransactionType.refund => 'refund',
        BookingTransactionType.unknown => 'unknown',
      };

  bool get isCredit =>
      this == BookingTransactionType.purchase ||
      this == BookingTransactionType.refund;

  bool get isDebit => this == BookingTransactionType.confirmation;
}

/// Domain representation of a commercial ledger transaction item.
/// Sourced from `GET /api/v1/booking-centers/transactions`.
@immutable
class BookingTransactionItem {
  const BookingTransactionItem({
    required this.id,
    required this.bookingCenterId,
    required this.transactionType,
    required this.units,
    required this.balanceAfter,
    this.referenceNote,
    this.appointmentBookingReference,
    this.appointmentPatientName,
    this.packageName,
    this.packageCode,
    this.createdByName,
    this.createdAt,
  });

  final String id;
  final String bookingCenterId;
  final BookingTransactionType transactionType;
  final int units;
  final int balanceAfter;
  final String? referenceNote;
  final String? appointmentBookingReference;
  final String? appointmentPatientName;
  final String? packageName;
  final String? packageCode;
  final String? createdByName;
  final String? createdAt;

  factory BookingTransactionItem.fromJson(Map<String, dynamic> json) {
    final appointment = json['appointment'];
    final package = json['package'];

    return BookingTransactionItem(
      id: json['id'] as String? ?? '',
      bookingCenterId: json['booking_center_id'] as String? ?? '',
      transactionType: BookingTransactionType.fromString(
          json['transaction_type'] as String?),
      units: (json['units'] as num?)?.toInt() ?? 0,
      balanceAfter: (json['balance_after'] as num?)?.toInt() ?? 0,
      referenceNote: json['reference_note'] as String?,
      appointmentBookingReference: appointment is Map<String, dynamic>
          ? appointment['booking_reference'] as String?
          : null,
      appointmentPatientName: appointment is Map<String, dynamic>
          ? appointment['patient_name'] as String?
          : null,
      packageName: package is Map<String, dynamic>
          ? package['name'] as String?
          : null,
      packageCode: package is Map<String, dynamic>
          ? package['package_code'] as String?
          : null,
      createdByName: json['created_by'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'booking_center_id': bookingCenterId,
      'transaction_type': transactionType.value,
      'units': units,
      'balance_after': balanceAfter,
      'reference_note': referenceNote,
      'created_by': createdByName,
      'created_at': createdAt,
    };
  }
}

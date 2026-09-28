import 'package:flutter/foundation.dart';

/// Status of a package purchase request submitted by a Booking Center.
enum PurchaseRequestStatus {
  pending,
  approved,
  rejected,
  unknown;

  static PurchaseRequestStatus fromString(String? status) {
    return switch (status?.toLowerCase().trim()) {
      'pending' => PurchaseRequestStatus.pending,
      'approved' => PurchaseRequestStatus.approved,
      'rejected' => PurchaseRequestStatus.rejected,
      _ => PurchaseRequestStatus.unknown,
    };
  }

  String get value => switch (this) {
        PurchaseRequestStatus.pending => 'pending',
        PurchaseRequestStatus.approved => 'approved',
        PurchaseRequestStatus.rejected => 'rejected',
        PurchaseRequestStatus.unknown => 'unknown',
      };
}

/// Domain representation of a package purchase request.
/// Sourced from `POST /api/v1/booking-centers/purchase-requests`
/// and `GET /api/v1/booking-centers/purchase-requests`.
@immutable
class PackagePurchaseRequest {
  const PackagePurchaseRequest({
    required this.id,
    required this.requestReference,
    required this.bookingCenterId,
    required this.bookingPackageId,
    required this.packageName,
    required this.packageCode,
    required this.quotaUnits,
    required this.priceDzd,
    this.paymentMethod,
    this.transactionReference,
    this.receiptDocumentPath,
    required this.status,
    this.notes,
    this.reviewedByName,
    this.reviewedAt,
    this.rejectionReason,
    this.bookingTransactionId,
    this.createdByName,
    this.createdAt,
  });

  final String id;
  final String requestReference;
  final String bookingCenterId;
  final String bookingPackageId;
  final String packageName;
  final String packageCode;
  final int quotaUnits;
  final double priceDzd;
  final String? paymentMethod;
  final String? transactionReference;
  final String? receiptDocumentPath;
  final PurchaseRequestStatus status;
  final String? notes;
  final String? reviewedByName;
  final String? reviewedAt;
  final String? rejectionReason;
  final String? bookingTransactionId;
  final String? createdByName;
  final String? createdAt;

  factory PackagePurchaseRequest.fromJson(Map<String, dynamic> json) {
    final reviewedBy = json['reviewed_by'];
    final createdBy = json['created_by'];

    return PackagePurchaseRequest(
      id: json['id'] as String? ?? '',
      requestReference: json['request_reference'] as String? ?? '',
      bookingCenterId: json['booking_center_id'] as String? ?? '',
      bookingPackageId: json['booking_package_id'] as String? ?? '',
      packageName: json['package_name'] as String? ?? '',
      packageCode: json['package_code'] as String? ?? '',
      quotaUnits: (json['quota_units'] as num?)?.toInt() ?? 0,
      priceDzd: (json['price_dzd'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['payment_method'] as String?,
      transactionReference: json['transaction_reference'] as String?,
      receiptDocumentPath: json['receipt_document_path'] as String?,
      status: PurchaseRequestStatus.fromString(json['status'] as String?),
      notes: json['notes'] as String?,
      reviewedByName:
          reviewedBy is Map<String, dynamic> ? reviewedBy['name'] as String? : null,
      reviewedAt: json['reviewed_at'] as String?,
      rejectionReason: json['rejection_reason'] as String?,
      bookingTransactionId: json['booking_transaction_id'] as String?,
      createdByName:
          createdBy is Map<String, dynamic> ? createdBy['name'] as String? : null,
      createdAt: json['created_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'request_reference': requestReference,
      'booking_center_id': bookingCenterId,
      'booking_package_id': bookingPackageId,
      'package_name': packageName,
      'package_code': packageCode,
      'quota_units': quotaUnits,
      'price_dzd': priceDzd,
      'payment_method': paymentMethod,
      'transaction_reference': transactionReference,
      'receipt_document_path': receiptDocumentPath,
      'status': status.value,
      'notes': notes,
      'reviewed_at': reviewedAt,
      'rejection_reason': rejectionReason,
      'booking_transaction_id': bookingTransactionId,
      'created_at': createdAt,
    };
  }
}

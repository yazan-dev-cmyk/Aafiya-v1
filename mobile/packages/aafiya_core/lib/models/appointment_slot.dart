import 'package:flutter/foundation.dart';

/// Hourly appointment slot with capacity and real-time occupancy metrics.
///
/// Mapped from Laravel backend `GET /api/v1/appointments/slots` -> `data.slots`.
@immutable
class AppointmentSlot {
  const AppointmentSlot({
    required this.timeSlot,
    required this.maxCapacity,
    required this.occupied,
    required this.available,
    required this.isAvailable,
  });

  /// The hourly time slot format, e.g. "08:00", "09:00", ... "17:00".
  final String timeSlot;

  /// Maximum allowed patients for this slot (1 <= maxCapacity <= 10).
  final int maxCapacity;

  /// Current number of occupied appointments in this slot.
  final int occupied;

  /// Remaining slots available for booking (maxCapacity - occupied, >= 0).
  final int available;

  /// Whether this slot has capacity available for new bookings.
  final bool isAvailable;

  /// Creates an [AppointmentSlot] from the backend JSON map.
  factory AppointmentSlot.fromJson(Map<String, dynamic> json) {
    final maxCap = (json['max_capacity'] as num?)?.toInt() ?? 10;
    final occ = (json['occupied'] as num?)?.toInt() ?? 0;
    final avail = (json['available'] as num?)?.toInt() ?? (maxCap - occ).clamp(0, maxCap);
    final isAvail = json['is_available'] as bool? ?? (avail > 0);

    return AppointmentSlot(
      timeSlot: (json['time_slot'] as String?)?.trim() ?? '',
      maxCapacity: maxCap,
      occupied: occ,
      available: avail,
      isAvailable: isAvail,
    );
  }

  /// Serializes the slot back to a JSON-compatible map.
  Map<String, dynamic> toJson() {
    return {
      'time_slot': timeSlot,
      'max_capacity': maxCapacity,
      'occupied': occupied,
      'available': available,
      'is_available': isAvailable,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppointmentSlot &&
          runtimeType == other.runtimeType &&
          timeSlot == other.timeSlot &&
          maxCapacity == other.maxCapacity &&
          occupied == other.occupied &&
          available == other.available &&
          isAvailable == other.isAvailable;

  @override
  int get hashCode => Object.hash(timeSlot, maxCapacity, occupied, available, isAvailable);

  @override
  String toString() =>
      'AppointmentSlot($timeSlot, capacity: $maxCapacity, occupied: $occupied, available: $available, isAvailable: $isAvailable)';
}

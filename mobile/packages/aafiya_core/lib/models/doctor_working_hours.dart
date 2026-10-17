import 'package:flutter/foundation.dart';

/// Hourly working slots permitted by AAFIYA backend engine.
///
/// Invariants:
/// - 60-minute duration.
/// - Available from 08:00 to 16:00 (last bookable hour).
/// - 17:00 is strictly closing time, not an allowable slot.
const List<String> kAllowedHourlySlots = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
];

/// Canonical weekday ordering (0 = Saturday ... 6 = Friday).
const List<int> kWeekdaysOrder = [0, 1, 2, 3, 4, 5, 6];

/// Represents a single day's schedule item for a doctor in a clinic.
@immutable
class DoctorDayScheduleItem {
  const DoctorDayScheduleItem({
    required this.dayOfWeek,
    required this.isClosed,
    required this.slots,
  });

  /// 0 = Saturday, 1 = Sunday, 2 = Monday, 3 = Tuesday,
  /// 4 = Wednesday, 5 = Thursday, 6 = Friday.
  final int dayOfWeek;
  final bool isClosed;
  final List<String> slots;

  DoctorDayScheduleItem copyWith({
    int? dayOfWeek,
    bool? isClosed,
    List<String>? slots,
  }) {
    return DoctorDayScheduleItem(
      dayOfWeek: dayOfWeek ?? this.dayOfWeek,
      isClosed: isClosed ?? this.isClosed,
      slots: slots ?? List.unmodifiable(this.slots),
    );
  }

  factory DoctorDayScheduleItem.fromJson(Map<String, dynamic> json) {
    final rawSlots = json['slots'] as List<dynamic>? ?? [];
    return DoctorDayScheduleItem(
      dayOfWeek: json['day_of_week'] as int? ?? 0,
      isClosed: json['is_closed'] as bool? ?? true,
      slots: rawSlots.map((s) => s.toString()).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'day_of_week': dayOfWeek,
        'is_closed': isClosed,
        'slots': slots,
      };
}

/// Represents the weekly working hours and activation state for a doctor at a clinic.
@immutable
class DoctorWorkingHoursData {
  const DoctorWorkingHoursData({
    required this.clinicId,
    required this.doctorId,
    required this.isActivated,
    this.activatedAt,
    this.scheduleVersion = 1,
    required this.days,
  });

  final String clinicId;
  final String doctorId;
  final bool isActivated;
  final DateTime? activatedAt;
  final int scheduleVersion;
  final List<DoctorDayScheduleItem> days;

  factory DoctorWorkingHoursData.fromJson(Map<String, dynamic> json) {
    final rawDays = json['days'] as List<dynamic>? ?? [];
    final daysList = rawDays
        .whereType<Map<String, dynamic>>()
        .map(DoctorDayScheduleItem.fromJson)
        .toList();

    DateTime? parsedActivatedAt;
    if (json['activated_at'] != null) {
      parsedActivatedAt = DateTime.tryParse(json['activated_at'].toString());
    }

    return DoctorWorkingHoursData(
      clinicId: json['clinic_id'] as String? ?? '',
      doctorId: json['doctor_id'] as String? ?? '',
      isActivated: json['is_activated'] as bool? ?? false,
      activatedAt: parsedActivatedAt,
      scheduleVersion: json['schedule_version'] as int? ?? 1,
      days: daysList,
    );
  }

  Map<String, dynamic> toJson() => {
        'clinic_id': clinicId,
        'doctor_id': doctorId,
        'is_activated': isActivated,
        'activated_at': activatedAt?.toIso8601String(),
        'schedule_version': scheduleVersion,
        'days': days.map((d) => d.toJson()).toList(),
      };

  /// Generates a standard default schedule matching Web defaults.
  /// (Saturday & Friday closed, Sunday-Thursday 08:00-11:00 & 13:00-16:00).
  static List<DoctorDayScheduleItem> defaultDays() {
    return kWeekdaysOrder.map((d) {
      final isWeekend = (d == 0 || d == 6);
      return DoctorDayScheduleItem(
        dayOfWeek: d,
        isClosed: isWeekend,
        slots: isWeekend
            ? const []
            : const [
                '08:00',
                '09:00',
                '10:00',
                '11:00',
                '13:00',
                '14:00',
                '15:00',
                '16:00',
              ],
      );
    }).toList();
  }
}

import 'package:flutter/foundation.dart';

/// Represents a single operational time period within a day for a clinic.
/// (e.g. Morning period 08:00 to 12:00, Afternoon period 13:00 to 17:00).
@immutable
class ClinicOperatingPeriod {
  const ClinicOperatingPeriod({
    this.periodIndex = 0,
    required this.openTime,
    required this.closeTime,
  });

  final int periodIndex;
  final String openTime;
  final String closeTime;

  ClinicOperatingPeriod copyWith({
    int? periodIndex,
    String? openTime,
    String? closeTime,
  }) {
    return ClinicOperatingPeriod(
      periodIndex: periodIndex ?? this.periodIndex,
      openTime: openTime ?? this.openTime,
      closeTime: closeTime ?? this.closeTime,
    );
  }

  factory ClinicOperatingPeriod.fromJson(Map<String, dynamic> json) {
    return ClinicOperatingPeriod(
      periodIndex: json['period_index'] as int? ?? 0,
      openTime: json['open_time']?.toString() ?? '',
      closeTime: json['close_time']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'period_index': periodIndex,
        'open_time': openTime,
        'close_time': closeTime,
      };
}

/// Represents the operating configuration of a clinic for a specific day of the week.
@immutable
class ClinicOperatingDay {
  const ClinicOperatingDay({
    required this.dayOfWeek,
    required this.isClosed,
    required this.periods,
  });

  /// Canonical weekday: 0 = Saturday, 1 = Sunday ... 6 = Friday.
  final int dayOfWeek;
  final bool isClosed;
  final List<ClinicOperatingPeriod> periods;

  ClinicOperatingDay copyWith({
    int? dayOfWeek,
    bool? isClosed,
    List<ClinicOperatingPeriod>? periods,
  }) {
    return ClinicOperatingDay(
      dayOfWeek: dayOfWeek ?? this.dayOfWeek,
      isClosed: isClosed ?? this.isClosed,
      periods: periods ?? List.unmodifiable(this.periods),
    );
  }

  factory ClinicOperatingDay.fromJson(Map<String, dynamic> json) {
    final rawPeriods = json['periods'] as List<dynamic>? ?? [];
    final periodsList = rawPeriods
        .whereType<Map<String, dynamic>>()
        .map(ClinicOperatingPeriod.fromJson)
        .toList();

    return ClinicOperatingDay(
      dayOfWeek: json['day_of_week'] as int? ?? 0,
      isClosed: json['is_closed'] as bool? ?? true,
      periods: periodsList,
    );
  }

  Map<String, dynamic> toJson() => {
        'day_of_week': dayOfWeek,
        'is_closed': isClosed,
        'periods': periods.map((p) => p.toJson()).toList(),
      };
}

/// Represents the complete 7-day weekly operating schedule and configuration status of a clinic.
@immutable
class ClinicOperatingHoursData {
  const ClinicOperatingHoursData({
    required this.clinicId,
    required this.isConfigured,
    required this.days,
  });

  final String clinicId;
  final bool isConfigured;
  final List<ClinicOperatingDay> days;

  factory ClinicOperatingHoursData.fromJson(Map<String, dynamic> json) {
    final rawDays = json['days'] as List<dynamic>? ?? [];
    final daysList = rawDays
        .whereType<Map<String, dynamic>>()
        .map(ClinicOperatingDay.fromJson)
        .toList();

    return ClinicOperatingHoursData(
      clinicId: json['clinic_id'] as String? ?? '',
      isConfigured: json['is_configured'] as bool? ?? false,
      days: daysList.isNotEmpty ? daysList : unconfiguredDays(),
    );
  }

  Map<String, dynamic> toJson() => {
        'clinic_id': clinicId,
        'is_configured': isConfigured,
        'days': days.map((d) => d.toJson()).toList(),
      };

  /// Creates a blank 7-day unconfigured schedule (Saturday..Friday, all closed, no periods).
  /// Strictly avoids inventing default hours that imply the clinic is configured.
  static List<ClinicOperatingDay> unconfiguredDays() {
    return List.generate(
      7,
      (d) => ClinicOperatingDay(
        dayOfWeek: d,
        isClosed: true,
        periods: const [],
      ),
    );
  }
}

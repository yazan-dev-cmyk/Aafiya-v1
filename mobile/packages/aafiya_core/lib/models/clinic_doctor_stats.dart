import 'package:flutter/foundation.dart';

/// Summary KPIs for Clinic Director Doctor Statistics (10 authoritative metrics).
@immutable
class ClinicStatsSummary {
  const ClinicStatsSummary({
    required this.totalAppointments,
    required this.pendingCheckIn,
    required this.inWaitingRoom,
    required this.completed,
    required this.noShow,
    required this.cancelled,
    required this.rejected,
    required this.expired,
    required this.rescheduled,
    required this.walkInVisits,
  });

  final int totalAppointments;
  final int pendingCheckIn;
  final int inWaitingRoom;
  final int completed;
  final int noShow;
  final int cancelled;
  final int rejected;
  final int expired;
  final int rescheduled;
  final int walkInVisits;

  factory ClinicStatsSummary.fromJson(Map<String, dynamic> json) {
    return ClinicStatsSummary(
      totalAppointments: (json['total_appointments'] as num?)?.toInt() ?? 0,
      pendingCheckIn: (json['pending_check_in'] as num?)?.toInt() ?? 0,
      inWaitingRoom: (json['in_waiting_room'] as num?)?.toInt() ?? 0,
      completed: (json['completed'] as num?)?.toInt() ?? 0,
      noShow: (json['no_show'] as num?)?.toInt() ?? 0,
      cancelled: (json['cancelled'] as num?)?.toInt() ?? 0,
      rejected: (json['rejected'] as num?)?.toInt() ?? 0,
      expired: (json['expired'] as num?)?.toInt() ?? 0,
      rescheduled: (json['rescheduled'] as num?)?.toInt() ?? 0,
      walkInVisits: (json['walk_in_visits'] as num?)?.toInt() ?? 0,
    );
  }

  static const ClinicStatsSummary zero = ClinicStatsSummary(
    totalAppointments: 0,
    pendingCheckIn: 0,
    inWaitingRoom: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
    rejected: 0,
    expired: 0,
    rescheduled: 0,
    walkInVisits: 0,
  );

  Map<String, dynamic> toJson() {
    return {
      'total_appointments': totalAppointments,
      'pending_check_in': pendingCheckIn,
      'in_waiting_room': inWaitingRoom,
      'completed': completed,
      'no_show': noShow,
      'cancelled': cancelled,
      'rejected': rejected,
      'expired': expired,
      'rescheduled': rescheduled,
      'walk_in_visits': walkInVisits,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClinicStatsSummary &&
          runtimeType == other.runtimeType &&
          totalAppointments == other.totalAppointments &&
          pendingCheckIn == other.pendingCheckIn &&
          inWaitingRoom == other.inWaitingRoom &&
          completed == other.completed &&
          noShow == other.noShow &&
          cancelled == other.cancelled &&
          rejected == other.rejected &&
          expired == other.expired &&
          rescheduled == other.rescheduled &&
          walkInVisits == other.walkInVisits;

  @override
  int get hashCode => Object.hash(
        totalAppointments,
        pendingCheckIn,
        inWaitingRoom,
        completed,
        noShow,
        cancelled,
        rejected,
        expired,
        rescheduled,
        walkInVisits,
      );

  @override
  String toString() =>
      'ClinicStatsSummary(total: $totalAppointments, completed: $completed, waiting: $inWaitingRoom, walkIn: $walkInVisits)';
}

/// Represents an affiliated doctor's performance metrics in All-Doctors mode.
@immutable
class ClinicDoctorItem {
  const ClinicDoctorItem({
    required this.id,
    required this.name,
    this.specialty,
    required this.position,
    required this.metrics,
  });

  final String id;
  final String name;
  final String? specialty;
  final String position;
  final ClinicStatsSummary metrics;

  bool get isDirector => position.toLowerCase() == 'director';

  factory ClinicDoctorItem.fromJson(Map<String, dynamic> json) {
    return ClinicDoctorItem(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      specialty: json['specialty'] as String?,
      position: (json['position'] as String?) ?? 'doctor',
      metrics: json['metrics'] is Map<String, dynamic>
          ? ClinicStatsSummary.fromJson(json['metrics'] as Map<String, dynamic>)
          : ClinicStatsSummary.zero,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (specialty != null) 'specialty': specialty,
      'position': position,
      'metrics': metrics.toJson(),
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClinicDoctorItem &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          specialty == other.specialty &&
          position == other.position &&
          metrics == other.metrics;

  @override
  int get hashCode => Object.hash(id, name, specialty, position, metrics);

  @override
  String toString() => 'ClinicDoctorItem(id: $id, name: $name, position: $position)';
}

/// Focused doctor identity in Single-Doctor mode.
@immutable
class ClinicSelectedDoctor {
  const ClinicSelectedDoctor({
    required this.id,
    required this.name,
    this.specialty,
    required this.position,
  });

  final String id;
  final String name;
  final String? specialty;
  final String position;

  bool get isDirector => position.toLowerCase() == 'director';

  factory ClinicSelectedDoctor.fromJson(Map<String, dynamic> json) {
    return ClinicSelectedDoctor(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      specialty: json['specialty'] as String?,
      position: (json['position'] as String?) ?? 'doctor',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (specialty != null) 'specialty': specialty,
      'position': position,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClinicSelectedDoctor &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          specialty == other.specialty &&
          position == other.position;

  @override
  int get hashCode => Object.hash(id, name, specialty, position);

  @override
  String toString() => 'ClinicSelectedDoctor(id: $id, name: $name, position: $position)';
}

/// Applied filters in the backend response.
@immutable
class ClinicStatsFilters {
  const ClinicStatsFilters({
    required this.fromDate,
    required this.toDate,
    this.doctorId,
  });

  final String fromDate;
  final String toDate;
  final String? doctorId;

  factory ClinicStatsFilters.fromJson(Map<String, dynamic> json) {
    return ClinicStatsFilters(
      fromDate: (json['from_date'] as String?) ?? '',
      toDate: (json['to_date'] as String?) ?? '',
      doctorId: json['doctor_id']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'from_date': fromDate,
      'to_date': toDate,
      'doctor_id': doctorId,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClinicStatsFilters &&
          runtimeType == other.runtimeType &&
          fromDate == other.fromDate &&
          toDate == other.toDate &&
          doctorId == other.doctorId;

  @override
  int get hashCode => Object.hash(fromDate, toDate, doctorId);

  @override
  String toString() => 'ClinicStatsFilters(from: $fromDate, to: $toDate, doctor: $doctorId)';
}

/// Minimal clinic context attached to the statistics payload.
@immutable
class ClinicStatsClinicInfo {
  const ClinicStatsClinicInfo({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;

  factory ClinicStatsClinicInfo.fromJson(Map<String, dynamic> json) {
    return ClinicStatsClinicInfo(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClinicStatsClinicInfo &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name;

  @override
  int get hashCode => Object.hash(id, name);

  @override
  String toString() => 'ClinicStatsClinicInfo(id: $id, name: $name)';
}

/// Complete data container returned by `GET /api/v1/clinic/doctor-stats`.
@immutable
class ClinicDoctorStatsData {
  const ClinicDoctorStatsData({
    required this.clinic,
    required this.filters,
    required this.summary,
    this.doctors = const [],
    this.selectedDoctor,
  });

  final ClinicStatsClinicInfo clinic;
  final ClinicStatsFilters filters;
  final ClinicStatsSummary summary;
  final List<ClinicDoctorItem> doctors;
  final ClinicSelectedDoctor? selectedDoctor;

  /// True when statistics are focused on a single doctor.
  bool get isSelectedDoctorMode => selectedDoctor != null;

  /// True when all metrics indicate zero activity (reassuring empty state).
  bool get isZeroRecords =>
      summary.totalAppointments == 0 && summary.walkInVisits == 0;

  factory ClinicDoctorStatsData.fromJson(Map<String, dynamic> json) {
    final clinicRaw = json['clinic'] is Map<String, dynamic>
        ? json['clinic'] as Map<String, dynamic>
        : <String, dynamic>{};
    final filtersRaw = json['filters'] is Map<String, dynamic>
        ? json['filters'] as Map<String, dynamic>
        : <String, dynamic>{};
    final summaryRaw = json['summary'] is Map<String, dynamic>
        ? json['summary'] as Map<String, dynamic>
        : <String, dynamic>{};

    final rawDoctors = json['doctors'];
    final parsedDoctors = <ClinicDoctorItem>[];
    if (rawDoctors is List) {
      for (final item in rawDoctors) {
        if (item is Map<String, dynamic>) {
          parsedDoctors.add(ClinicDoctorItem.fromJson(item));
        }
      }
    }

    final rawSelected = json['selected_doctor'];
    ClinicSelectedDoctor? parsedSelected;
    if (rawSelected is Map<String, dynamic>) {
      parsedSelected = ClinicSelectedDoctor.fromJson(rawSelected);
    }

    return ClinicDoctorStatsData(
      clinic: ClinicStatsClinicInfo.fromJson(clinicRaw),
      filters: ClinicStatsFilters.fromJson(filtersRaw),
      summary: ClinicStatsSummary.fromJson(summaryRaw),
      doctors: List.unmodifiable(parsedDoctors),
      selectedDoctor: parsedSelected,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'clinic': clinic.toJson(),
      'filters': filters.toJson(),
      'summary': summary.toJson(),
      if (doctors.isNotEmpty) 'doctors': doctors.map((d) => d.toJson()).toList(),
      if (selectedDoctor != null) 'selected_doctor': selectedDoctor!.toJson(),
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClinicDoctorStatsData &&
          runtimeType == other.runtimeType &&
          clinic == other.clinic &&
          filters == other.filters &&
          summary == other.summary &&
          listEquals(doctors, other.doctors) &&
          selectedDoctor == other.selectedDoctor;

  @override
  int get hashCode => Object.hash(
        clinic,
        filters,
        summary,
        Object.hashAll(doctors),
        selectedDoctor,
      );

  @override
  String toString() =>
      'ClinicDoctorStatsData(clinic: ${clinic.name}, selectedDoctor: ${selectedDoctor?.name}, doctorsCount: ${doctors.length})';
}

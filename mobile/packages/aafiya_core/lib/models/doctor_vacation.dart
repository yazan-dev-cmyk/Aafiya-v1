import 'package:flutter/foundation.dart';

/// Clinic entity snapshot embedded within a doctor vacation.
@immutable
class DoctorVacationClinic {
  const DoctorVacationClinic({
    required this.id,
    this.name,
    this.wilaya,
  });

  final String id;
  final String? name;
  final String? wilaya;

  factory DoctorVacationClinic.fromJson(Map<String, dynamic> json) {
    return DoctorVacationClinic(
      id: json['id'] as String? ?? '',
      name: json['name'] as String?,
      wilaya: json['wilaya'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (name != null) 'name': name,
        if (wilaya != null) 'wilaya': wilaya,
      };
}

/// Represents a Doctor Vacation record.
///
/// Invariants & Policies:
/// - Immediate effectiveness without Director approval (DEC-VAC-01, DEC-AUTH-01).
/// - 7-calendar-day auto-reschedule horizon (DEC-VAC-02).
/// - Zero patient surcharge (DEC-VAC-04).
/// - Logical cancellation only: physical delete prohibited (DEC-VAC-05).
@immutable
class DoctorVacation {
  const DoctorVacation({
    required this.id,
    required this.doctorId,
    required this.vacationStart,
    required this.vacationEnd,
    required this.status,
    this.reason,
    this.notes,
    this.createdAt,
    this.updatedAt,
    this.clinics = const [],
  });

  final String id;
  final String doctorId;
  final String vacationStart;
  final String vacationEnd;
  final String status;
  final String? reason;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<DoctorVacationClinic> clinics;

  bool get isEffective => status.toLowerCase() == 'effective';
  bool get isCancelled => status.toLowerCase() == 'cancelled';

  factory DoctorVacation.fromJson(Map<String, dynamic> json) {
    final clinicsRaw = json['clinics'];
    final List<DoctorVacationClinic> parsedClinics;
    if (clinicsRaw is List) {
      parsedClinics = clinicsRaw
          .whereType<Map<String, dynamic>>()
          .map(DoctorVacationClinic.fromJson)
          .toList();
    } else {
      parsedClinics = const [];
    }

    return DoctorVacation(
      id: json['id'] as String? ?? '',
      doctorId: json['doctor_id'] as String? ?? '',
      vacationStart: json['vacation_start'] as String? ?? '',
      vacationEnd: json['vacation_end'] as String? ?? '',
      status: json['status'] as String? ?? 'effective',
      reason: json['reason'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
      clinics: List.unmodifiable(parsedClinics),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'doctor_id': doctorId,
        'vacation_start': vacationStart,
        'vacation_end': vacationEnd,
        'status': status,
        if (reason != null) 'reason': reason,
        if (notes != null) 'notes': notes,
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
        if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
        'clinics': clinics.map((c) => c.toJson()).toList(),
      };
}

/// Paginated wrapper for Doctor Vacations adhering to Laravel collection pagination.
@immutable
class PaginatedDoctorVacations {
  const PaginatedDoctorVacations({
    required this.items,
    required this.currentPage,
    required this.lastPage,
    required this.perPage,
    required this.total,
  });

  final List<DoctorVacation> items;
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;

  bool get hasMore => currentPage < lastPage;
  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  factory PaginatedDoctorVacations.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    final List<DoctorVacation> list;

    if (rawData is List) {
      list = rawData
          .whereType<Map<String, dynamic>>()
          .map(DoctorVacation.fromJson)
          .toList();
    } else {
      list = const [];
    }

    final meta = json['meta'] as Map<String, dynamic>?;
    final currentPage = (meta?['current_page'] as num?)?.toInt() ?? 1;
    final lastPage = (meta?['last_page'] as num?)?.toInt() ?? 1;
    final perPage = (meta?['per_page'] as num?)?.toInt() ??
        (list.isEmpty ? 15 : list.length);
    final total = (meta?['total'] as num?)?.toInt() ?? list.length;

    return PaginatedDoctorVacations(
      items: List.unmodifiable(list),
      currentPage: currentPage,
      lastPage: lastPage,
      perPage: perPage,
      total: total,
    );
  }

  static const empty = PaginatedDoctorVacations(
    items: [],
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  );
}

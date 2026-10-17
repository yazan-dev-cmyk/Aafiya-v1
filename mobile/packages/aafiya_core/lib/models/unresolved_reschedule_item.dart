import 'package:flutter/foundation.dart';

/// Represents a single urgent unresolved appointment reschedule item.
///
/// Conforms to `VacationAppointmentRescheduleResource` from Laravel API:
/// `GET /api/v1/clinic/reschedule-dashboard/unresolved`.
@immutable
class UnresolvedRescheduleItem {
  const UnresolvedRescheduleItem({
    required this.id,
    required this.doctorVacationId,
    required this.clinicId,
    required this.status,
    this.failureReason,
    this.resolvedAt,
    this.resolvedById,
    this.createdAt,
    this.updatedAt,
    this.originalAppointment,
    this.replacementAppointment,
    this.vacation,
  });

  final String id;
  final String doctorVacationId;
  final String clinicId;
  final String status;
  final String? failureReason;
  final DateTime? resolvedAt;
  final String? resolvedById;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final OriginalAppointmentInfo? originalAppointment;
  final ReplacementAppointmentInfo? replacementAppointment;
  final VacationInfo? vacation;

  bool get isUrgentUnresolved => status == 'urgent_unresolved';

  factory UnresolvedRescheduleItem.fromJson(Map<String, dynamic> json) {
    return UnresolvedRescheduleItem(
      id: json['id'] as String? ?? '',
      doctorVacationId: json['doctor_vacation_id'] as String? ?? '',
      clinicId: json['clinic_id'] as String? ?? '',
      status: json['status'] as String? ?? 'urgent_unresolved',
      failureReason: json['failure_reason'] as String?,
      resolvedAt: json['resolved_at'] != null
          ? DateTime.tryParse(json['resolved_at'] as String)
          : null,
      resolvedById: json['resolved_by_id'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
      originalAppointment: json['original_appointment'] is Map<String, dynamic>
          ? OriginalAppointmentInfo.fromJson(
              json['original_appointment'] as Map<String, dynamic>)
          : null,
      replacementAppointment: json['replacement_appointment'] is Map<String, dynamic>
          ? ReplacementAppointmentInfo.fromJson(
              json['replacement_appointment'] as Map<String, dynamic>)
          : null,
      vacation: json['vacation'] is Map<String, dynamic>
          ? VacationInfo.fromJson(json['vacation'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Permitted details of the original displaced appointment.
@immutable
class OriginalAppointmentInfo {
  const OriginalAppointmentInfo({
    required this.id,
    this.bookingReference,
    this.appointmentDate,
    this.timeSlot,
    this.status,
    this.patientName,
    this.patientPhone,
    this.patientMrn,
    this.doctorId,
    this.doctorName,
    this.doctorSpecialty,
  });

  final String id;
  final String? bookingReference;
  final String? appointmentDate;
  final String? timeSlot;
  final String? status;
  final String? patientName;

  /// Patient contact phone.
  ///
  /// Strictly null if the backend masks it due to lacking `patient.view_contacts` permission.
  final String? patientPhone;
  final String? patientMrn;
  final String? doctorId;
  final String? doctorName;
  final String? doctorSpecialty;

  bool get hasPhone => patientPhone != null && patientPhone!.trim().isNotEmpty;

  factory OriginalAppointmentInfo.fromJson(Map<String, dynamic> json) {
    final doctorMap = json['doctor'] as Map<String, dynamic>?;

    return OriginalAppointmentInfo(
      id: json['id'] as String? ?? '',
      bookingReference: json['booking_reference'] as String?,
      appointmentDate: json['appointment_date'] as String?,
      timeSlot: json['time_slot'] as String?,
      status: json['status'] as String?,
      patientName: json['patient_name'] as String?,
      patientPhone: json['patient_phone'] as String?,
      patientMrn: json['patient_mrn'] as String?,
      doctorId: doctorMap?['id'] as String?,
      doctorName: doctorMap?['name'] as String?,
      doctorSpecialty: doctorMap?['specialty'] as String?,
    );
  }
}

/// Replacement appointment details if generated.
@immutable
class ReplacementAppointmentInfo {
  const ReplacementAppointmentInfo({
    required this.id,
    this.bookingReference,
    this.appointmentDate,
    this.timeSlot,
    this.status,
  });

  final String id;
  final String? bookingReference;
  final String? appointmentDate;
  final String? timeSlot;
  final String? status;

  factory ReplacementAppointmentInfo.fromJson(Map<String, dynamic> json) {
    return ReplacementAppointmentInfo(
      id: json['id'] as String? ?? '',
      bookingReference: json['booking_reference'] as String?,
      appointmentDate: json['appointment_date'] as String?,
      timeSlot: json['time_slot'] as String?,
      status: json['status'] as String?,
    );
  }
}

/// Vacation record that caused the rescheduling displacement.
@immutable
class VacationInfo {
  const VacationInfo({
    required this.id,
    this.vacationStart,
    this.vacationEnd,
    this.status,
    this.reason,
  });

  final String id;
  final String? vacationStart;
  final String? vacationEnd;
  final String? status;
  final String? reason;

  factory VacationInfo.fromJson(Map<String, dynamic> json) {
    return VacationInfo(
      id: json['id'] as String? ?? '',
      vacationStart: json['vacation_start'] as String?,
      vacationEnd: json['vacation_end'] as String?,
      status: json['status'] as String?,
      reason: json['reason'] as String?,
    );
  }
}

/// Paginated wrapper for unresolved appointments adhering to Laravel collection pagination.
@immutable
class PaginatedUnresolvedReschedules {
  const PaginatedUnresolvedReschedules({
    required this.items,
    required this.currentPage,
    required this.lastPage,
    required this.perPage,
    required this.total,
  });

  final List<UnresolvedRescheduleItem> items;
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;

  bool get hasMore => currentPage < lastPage;
  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  factory PaginatedUnresolvedReschedules.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    final List<UnresolvedRescheduleItem> list;

    if (rawData is List) {
      list = rawData
          .whereType<Map<String, dynamic>>()
          .map(UnresolvedRescheduleItem.fromJson)
          .toList();
    } else {
      list = const [];
    }

    final meta = json['meta'] as Map<String, dynamic>?;
    final currentPage = (meta?['current_page'] as num?)?.toInt() ?? 1;
    final lastPage = (meta?['last_page'] as num?)?.toInt() ?? 1;
    final perPage = (meta?['per_page'] as num?)?.toInt() ?? list.length;
    final total = (meta?['total'] as num?)?.toInt() ?? list.length;

    return PaginatedUnresolvedReschedules(
      items: List.unmodifiable(list),
      currentPage: currentPage,
      lastPage: lastPage,
      perPage: perPage,
      total: total,
    );
  }

  static const empty = PaginatedUnresolvedReschedules(
    items: [],
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
    total: 0,
  );
}

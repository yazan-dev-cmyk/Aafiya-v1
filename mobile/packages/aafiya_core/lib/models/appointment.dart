import 'package:flutter/foundation.dart';

/// Authoritative appointment lifecycle statuses defined by Laravel backend.
enum AppointmentStatus {
  pending,
  confirmed,
  attended,
  noShow,
  cancelled,
  rejected,
  expired,
  rescheduled,
  unknown;

  static AppointmentStatus fromString(String? status) {
    if (status == null) return AppointmentStatus.unknown;
    return switch (status.toLowerCase().trim()) {
      'pending' => AppointmentStatus.pending,
      'confirmed' => AppointmentStatus.confirmed,
      'attended' => AppointmentStatus.attended,
      'no_show' => AppointmentStatus.noShow,
      'cancelled' => AppointmentStatus.cancelled,
      'rejected' => AppointmentStatus.rejected,
      'expired' => AppointmentStatus.expired,
      'rescheduled' => AppointmentStatus.rescheduled,
      _ => AppointmentStatus.unknown,
    };
  }

  String get key => switch (this) {
        AppointmentStatus.pending => 'pending',
        AppointmentStatus.confirmed => 'confirmed',
        AppointmentStatus.attended => 'attended',
        AppointmentStatus.noShow => 'no_show',
        AppointmentStatus.cancelled => 'cancelled',
        AppointmentStatus.rejected => 'rejected',
        AppointmentStatus.expired => 'expired',
        AppointmentStatus.rescheduled => 'rescheduled',
        AppointmentStatus.unknown => 'unknown',
      };

  /// Whether this appointment is currently in an active state.
  bool get isActive => this == AppointmentStatus.pending || this == AppointmentStatus.confirmed;

  /// Whether this appointment is in a terminal or completed state.
  bool get isTerminal =>
      this == AppointmentStatus.attended ||
      this == AppointmentStatus.noShow ||
      this == AppointmentStatus.cancelled ||
      this == AppointmentStatus.rejected ||
      this == AppointmentStatus.expired;
}

/// Clinic information associated with an appointment.
@immutable
class AppointmentClinic {
  const AppointmentClinic({
    this.id,
    this.name,
    this.phone,
    this.wilaya,
  });

  final String? id;
  final String? name;
  final String? phone;
  final String? wilaya;

  factory AppointmentClinic.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AppointmentClinic();
    return AppointmentClinic(
      id: json['id']?.toString(),
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      wilaya: json['wilaya'] as String?,
    );
  }
}

/// Doctor information associated with an appointment.
@immutable
class AppointmentDoctor {
  const AppointmentDoctor({
    this.id,
    this.name,
    this.specialty,
  });

  final String? id;
  final String? name;
  final String? specialty;

  factory AppointmentDoctor.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AppointmentDoctor();
    return AppointmentDoctor(
      id: json['id']?.toString(),
      name: json['name'] as String?,
      specialty: json['specialty'] as String?,
    );
  }
}

/// Patient information associated with an appointment.
@immutable
class AppointmentPatient {
  const AppointmentPatient({
    this.id,
    this.name,
    this.phone,
    this.mrn,
    this.nationalId,
  });

  final String? id;
  final String? name;
  final String? phone;
  final String? mrn;
  final String? nationalId;

  factory AppointmentPatient.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AppointmentPatient();
    return AppointmentPatient(
      id: json['id']?.toString(),
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      mrn: json['mrn'] as String?,
      nationalId: json['national_id'] as String?,
    );
  }
}

/// Booking center if the appointment was booked institutionally.
@immutable
class AppointmentBookingCenter {
  const AppointmentBookingCenter({
    this.id,
    this.name,
  });

  final String? id;
  final String? name;

  factory AppointmentBookingCenter.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AppointmentBookingCenter();
    return AppointmentBookingCenter(
      id: json['id']?.toString(),
      name: json['name'] as String?,
    );
  }
}

/// Authoritative Appointment domain model mapped directly from Laravel `AppointmentResource`.
@immutable
class Appointment {
  const Appointment({
    required this.id,
    required this.bookingReference,
    this.secureToken,
    this.clinic = const AppointmentClinic(),
    this.doctor = const AppointmentDoctor(),
    this.patient = const AppointmentPatient(),
    this.bookingCenter,
    this.appointmentDate,
    this.timeSlot,
    required this.status,
    this.notes,
    this.confirmedAt,
    this.confirmedBy,
    this.checkedInAt,
    this.checkedInBy,
    this.createdAt,
  });

  final String id;
  final String bookingReference;
  final String? secureToken;
  final AppointmentClinic clinic;
  final AppointmentDoctor doctor;
  final AppointmentPatient patient;
  final AppointmentBookingCenter? bookingCenter;
  final String? appointmentDate; // 'YYYY-MM-DD'
  final String? timeSlot; // 'HH:mm'
  final AppointmentStatus status;
  final String? notes;
  final String? confirmedAt;
  final String? confirmedBy;
  final String? checkedInAt;
  final String? checkedInBy;
  final String? createdAt;

  /// Determines whether this appointment is upcoming relative to a given reference date.
  ///
  /// Criteria: Status must be active (pending or confirmed) AND appointment date must be
  /// today or in the future. Terminal or inactive statuses (cancelled, rejected, attended,
  /// expired) are NEVER classified as upcoming even if the date is in the future.
  bool isUpcoming([DateTime? now]) {
    if (!status.isActive) return false;
    if (appointmentDate == null || appointmentDate!.isEmpty) return false;
    try {
      final date = DateTime.parse(appointmentDate!);
      final reference = now ?? DateTime.now();
      final todayMidnight = DateTime(reference.year, reference.month, reference.day);
      final appDateMidnight = DateTime(date.year, date.month, date.day);
      return !appDateMidnight.isBefore(todayMidnight);
    } catch (_) {
      return status.isActive;
    }
  }

  /// Parses an Appointment from Laravel backend `AppointmentResource` JSON payload.
  factory Appointment.fromJson(Map<String, dynamic> json) {
    return Appointment(
      id: (json['id']?.toString()) ?? '',
      bookingReference: (json['booking_reference'] as String?) ?? '',
      secureToken: json['secure_token'] as String?,
      clinic: AppointmentClinic.fromJson(json['clinic'] as Map<String, dynamic>?),
      doctor: AppointmentDoctor.fromJson(json['doctor'] as Map<String, dynamic>?),
      patient: AppointmentPatient.fromJson(json['patient'] as Map<String, dynamic>?),
      bookingCenter: json['booking_center'] != null
          ? AppointmentBookingCenter.fromJson(json['booking_center'] as Map<String, dynamic>?)
          : null,
      appointmentDate: json['appointment_date'] as String?,
      timeSlot: json['time_slot'] as String?,
      status: AppointmentStatus.fromString(json['status'] as String?),
      notes: json['notes'] as String?,
      confirmedAt: json['confirmed_at'] as String?,
      confirmedBy: json['confirmed_by'] as String?,
      checkedInAt: json['checked_in_at'] as String?,
      checkedInBy: json['checked_in_by'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}

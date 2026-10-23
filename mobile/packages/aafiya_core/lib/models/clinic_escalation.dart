/// Model representing a clinic staff follow-up escalation record.
///
/// Maps exactly to backend `ClinicEscalationResource` fields (TASK-COMMS-01).
class ClinicEscalation {
  const ClinicEscalation({
    required this.id,
    required this.appointmentId,
    required this.patientName,
    required this.patientPhone,
    required this.doctorName,
    required this.clinicId,
    required this.clinicName,
    required this.escalationReason,
    required this.instruction,
    this.originalDate,
    this.originalTimeSlot,
    this.replacementAppointmentId,
    this.newDate,
    this.newSlot,
    this.escalatedAt,
    this.acknowledgedAt,
    required this.isAcknowledged,
  });

  /// Unique escalation outbox identifier (UUID).
  final String id;

  /// Original appointment ID.
  final String appointmentId;

  /// Patient display name.
  final String patientName;

  /// Patient contact telephone number for manual staff outreach.
  final String patientPhone;

  /// Affiliated doctor name.
  final String doctorName;

  /// Authoritative clinic ID.
  final String clinicId;

  /// Clinic display name.
  final String clinicName;

  /// Machine code for escalation reason (e.g., 'PATIENT_UNREAD_SLA_EXPIRED_24H').
  final String escalationReason;

  /// Operational instructions for the clinic staff.
  final String instruction;

  /// Original cancelled/displaced date.
  final String? originalDate;

  /// Original cancelled/displaced time slot.
  final String? originalTimeSlot;

  /// Replacement appointment ID if rescheduled automatically.
  final String? replacementAppointmentId;

  /// New appointment date.
  final String? newDate;

  /// New appointment time slot.
  final String? newSlot;

  /// Timestamp when SLA escalation occurred.
  final DateTime? escalatedAt;

  /// Timestamp when clinic staff acknowledged follow-up, or null if open.
  final DateTime? acknowledgedAt;

  /// Whether this escalation has been closed/acknowledged by staff.
  final bool isAcknowledged;

  /// Returns a copy of this escalation with updated fields.
  ClinicEscalation copyWith({
    String? id,
    String? appointmentId,
    String? patientName,
    String? patientPhone,
    String? doctorName,
    String? clinicId,
    String? clinicName,
    String? escalationReason,
    String? instruction,
    String? originalDate,
    String? originalTimeSlot,
    String? replacementAppointmentId,
    String? newDate,
    String? newSlot,
    DateTime? escalatedAt,
    DateTime? acknowledgedAt,
    bool? isAcknowledged,
  }) {
    return ClinicEscalation(
      id: id ?? this.id,
      appointmentId: appointmentId ?? this.appointmentId,
      patientName: patientName ?? this.patientName,
      patientPhone: patientPhone ?? this.patientPhone,
      doctorName: doctorName ?? this.doctorName,
      clinicId: clinicId ?? this.clinicId,
      clinicName: clinicName ?? this.clinicName,
      escalationReason: escalationReason ?? this.escalationReason,
      instruction: instruction ?? this.instruction,
      originalDate: originalDate ?? this.originalDate,
      originalTimeSlot: originalTimeSlot ?? this.originalTimeSlot,
      replacementAppointmentId:
          replacementAppointmentId ?? this.replacementAppointmentId,
      newDate: newDate ?? this.newDate,
      newSlot: newSlot ?? this.newSlot,
      escalatedAt: escalatedAt ?? this.escalatedAt,
      acknowledgedAt: acknowledgedAt ?? this.acknowledgedAt,
      isAcknowledged: isAcknowledged ?? this.isAcknowledged,
    );
  }

  /// Parses a ClinicEscalation from backend JSON resource map.
  factory ClinicEscalation.fromJson(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? '';
    final appointmentId = json['appointment_id']?.toString() ?? '';
    final patientName = json['patient_name']?.toString() ?? 'مريض';
    final patientPhone = json['patient_phone']?.toString() ?? '';
    final doctorName = json['doctor_name']?.toString() ?? 'طبيب العيادة';
    final clinicId = json['clinic_id']?.toString() ?? '';
    final clinicName = json['clinic_name']?.toString() ?? 'العيادة';
    final escalationReason = json['escalation_reason']?.toString() ??
        'PATIENT_UNREAD_SLA_EXPIRED_24H';
    final instruction = json['instruction']?.toString() ??
        'يرجى التواصل الهاتفي المباشر مع المريض لتأكيد علمه بالموعد البديل أو بترتيب موعد آخر.';

    final originalDate = json['original_date']?.toString();
    final originalTimeSlot = json['original_time_slot']?.toString();
    final replacementApptId = json['replacement_appointment_id']?.toString();
    final newDate = json['new_date']?.toString();
    final newSlot = json['new_slot']?.toString();

    DateTime? escalatedAt;
    final rawEscalatedAt = json['escalated_at'];
    if (rawEscalatedAt is String && rawEscalatedAt.isNotEmpty) {
      escalatedAt = DateTime.tryParse(rawEscalatedAt);
    }

    DateTime? acknowledgedAt;
    final rawAckAt = json['acknowledged_at'];
    if (rawAckAt is String && rawAckAt.isNotEmpty) {
      acknowledgedAt = DateTime.tryParse(rawAckAt);
    }

    final isAck = json['is_acknowledged'] == true || acknowledgedAt != null;

    return ClinicEscalation(
      id: id,
      appointmentId: appointmentId,
      patientName: patientName,
      patientPhone: patientPhone,
      doctorName: doctorName,
      clinicId: clinicId,
      clinicName: clinicName,
      escalationReason: escalationReason,
      instruction: instruction,
      originalDate: originalDate,
      originalTimeSlot: originalTimeSlot,
      replacementAppointmentId: replacementApptId,
      newDate: newDate,
      newSlot: newSlot,
      escalatedAt: escalatedAt,
      acknowledgedAt: acknowledgedAt,
      isAcknowledged: isAck,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'appointment_id': appointmentId,
        'patient_name': patientName,
        'patient_phone': patientPhone,
        'doctor_name': doctorName,
        'clinic_id': clinicId,
        'clinic_name': clinicName,
        'escalation_reason': escalationReason,
        'instruction': instruction,
        if (originalDate != null) 'original_date': originalDate,
        if (originalTimeSlot != null) 'original_time_slot': originalTimeSlot,
        if (replacementAppointmentId != null)
          'replacement_appointment_id': replacementAppointmentId,
        if (newDate != null) 'new_date': newDate,
        if (newSlot != null) 'new_slot': newSlot,
        if (escalatedAt != null) 'escalated_at': escalatedAt!.toIso8601String(),
        if (acknowledgedAt != null)
          'acknowledged_at': acknowledgedAt!.toIso8601String(),
        'is_acknowledged': isAcknowledged,
      };
}

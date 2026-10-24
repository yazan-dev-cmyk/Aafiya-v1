import '../localization/localized_strings.dart';

/// Patient in-app notification model adhering strictly to data minimization.
///
/// Strips out internal engine delivery metadata (phone, retry counts, errors, raw payload).
class PatientNotification {
  const PatientNotification({
    required this.id,
    required this.createdAt,
    this.acknowledgedAt,
    required this.template,
    required this.message,
    this.messageEn,
    this.messageFr,
    this.newDate,
    this.newSlot,
    this.clinicName,
    this.bookingReference,
    this.appointmentId,
  });

  /// Unique notification identifier (UUID).
  final String id;

  /// Timestamp when the notification was created.
  final DateTime createdAt;

  /// Timestamp when the patient acknowledged the notification, or null if unacknowledged.
  final DateTime? acknowledgedAt;

  /// Template type (e.g., 'vacation_reschedule_success', 'appointment_cancelled', 'appointment_booked', 'appointment_confirmed').
  final String template;

  /// Display message text in Arabic (primary/fallback).
  final String message;

  /// Optional English message text.
  final String? messageEn;

  /// Optional French message text.
  final String? messageFr;

  /// Optional replacement or rescheduled date (YYYY-MM-DD).
  final String? newDate;

  /// Optional replacement or rescheduled time slot.
  final String? newSlot;

  /// Optional clinic name associated with the notice.
  final String? clinicName;

  /// Optional booking reference string.
  final String? bookingReference;

  /// Optional associated appointment ID.
  final String? appointmentId;

  /// Whether this notification has already been acknowledged by the patient.
  bool get isAcknowledged => acknowledgedAt != null;

  /// Resolves the display message according to the active locale.
  String displayMessage(LocalizedStrings strings) {
    if (strings.isFrench) {
      if (messageFr != null && messageFr!.trim().isNotEmpty) {
        return messageFr!.trim();
      }
      return switch (template) {
        'appointment_booked' => strings.appointmentBookedNotification,
        'appointment_confirmed' => strings.appointmentConfirmedNotification,
        'appointment_cancelled' => strings.appointmentCancelledNotification,
        'appointment_rejected' => strings.appointmentRejectedNotification,
        'vacation_reschedule_success' => strings.vacationRescheduleNotification,
        _ => message,
      };
    } else if (strings.isEnglish) {
      if (messageEn != null && messageEn!.trim().isNotEmpty) {
        return messageEn!.trim();
      }
      return switch (template) {
        'appointment_booked' => strings.appointmentBookedNotification,
        'appointment_confirmed' => strings.appointmentConfirmedNotification,
        'appointment_cancelled' => strings.appointmentCancelledNotification,
        'appointment_rejected' => strings.appointmentRejectedNotification,
        'vacation_reschedule_success' => strings.vacationRescheduleNotification,
        _ => message,
      };
    }
    return message;
  }

  /// Returns a copy of this notification with updated fields.
  PatientNotification copyWith({
    String? id,
    DateTime? createdAt,
    DateTime? acknowledgedAt,
    bool clearAcknowledgedAt = false,
    String? template,
    String? message,
    String? messageEn,
    String? messageFr,
    String? newDate,
    String? newSlot,
    String? clinicName,
    String? bookingReference,
    String? appointmentId,
  }) {
    return PatientNotification(
      id: id ?? this.id,
      createdAt: createdAt ?? this.createdAt,
      acknowledgedAt:
          clearAcknowledgedAt ? null : (acknowledgedAt ?? this.acknowledgedAt),
      template: template ?? this.template,
      message: message ?? this.message,
      messageEn: messageEn ?? this.messageEn,
      messageFr: messageFr ?? this.messageFr,
      newDate: newDate ?? this.newDate,
      newSlot: newSlot ?? this.newSlot,
      clinicName: clinicName ?? this.clinicName,
      bookingReference: bookingReference ?? this.bookingReference,
      appointmentId: appointmentId ?? this.appointmentId,
    );
  }

  /// Parses a patient notification from backend JSON with defensive payload handling.
  factory PatientNotification.fromJson(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? '';

    DateTime parsedCreatedAt;
    final rawCreatedAt = json['created_at'];
    if (rawCreatedAt is String && rawCreatedAt.isNotEmpty) {
      parsedCreatedAt = DateTime.tryParse(rawCreatedAt) ?? DateTime.now();
    } else {
      parsedCreatedAt = DateTime.now();
    }

    DateTime? parsedAckAt;
    final rawAckAt = json['acknowledged_at'];
    if (rawAckAt is String && rawAckAt.isNotEmpty) {
      parsedAckAt = DateTime.tryParse(rawAckAt);
    }

    final template = json['template']?.toString() ?? '';

    // Safely extract payload map without crashing on malformed structures
    final rawPayload = json['payload'];
    final Map<String, dynamic> payload =
        rawPayload is Map<String, dynamic> ? rawPayload : const {};

    // Message derivation: accept non-empty payload.message, else use verified template fallbacks
    final rawMessage = payload['message'];
    final rawMessageEn = payload['message_en']?.toString();
    final rawMessageFr = payload['message_fr']?.toString();
    String resolvedMessage;
    if (rawMessage is String && rawMessage.trim().isNotEmpty) {
      resolvedMessage = rawMessage.trim();
    } else {
      resolvedMessage = switch (template) {
        'appointment_booked' =>
          'تم تسجيل طلب حجز موعدكم الطبي بنجاح وهو قيد المراجعة.',
        'appointment_confirmed' =>
          'تم تأكيد موعدكم الطبي بنجاح. تذكرة الحضور متاحة الآن في التطبيق.',
        'vacation_reschedule_success' =>
          'تمت إعادة جدولة موعدكم الطبي نظراً لإجازة الطبيب.',
        'appointment_cancelled' => 'تم إلغاء الموعد الطبي.',
        'appointment_rejected' => 'تم رفض طلب الموعد الطبي.',
        _ => 'إشعار طبي جديد.',
      };
    }

    final newDate = payload['new_date']?.toString() ??
        payload['appointment_date']?.toString();
    final newSlot =
        payload['new_slot']?.toString() ?? payload['time_slot']?.toString();
    final clinicName = payload['clinic_name']?.toString();
    final bookingRef = payload['booking_reference']?.toString();
    final apptId = json['appointment_id']?.toString() ??
        payload['appointment_id']?.toString();

    return PatientNotification(
      id: id,
      createdAt: parsedCreatedAt,
      acknowledgedAt: parsedAckAt,
      template: template,
      message: resolvedMessage,
      messageEn: rawMessageEn,
      messageFr: rawMessageFr,
      newDate: newDate,
      newSlot: newSlot,
      clinicName: clinicName,
      bookingReference: bookingRef,
      appointmentId: apptId,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'created_at': createdAt.toIso8601String(),
        'acknowledged_at': acknowledgedAt?.toIso8601String(),
        'template': template,
        'message': message,
        if (messageEn != null) 'message_en': messageEn,
        if (messageFr != null) 'message_fr': messageFr,
        if (newDate != null) 'new_date': newDate,
        if (newSlot != null) 'new_slot': newSlot,
        if (clinicName != null) 'clinic_name': clinicName,
        if (bookingReference != null) 'booking_reference': bookingReference,
        if (appointmentId != null) 'appointment_id': appointmentId,
      };
}

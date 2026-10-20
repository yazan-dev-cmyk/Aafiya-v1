import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/reschedule_appointment_sheet.dart';
import '../widgets/visit_pass_sheet.dart';

/// Screen displaying complete details for an appointment.
///
/// NOTE: Strictly read-only to preserve DISC-01. Contains ZERO booking actions.
/// Screen displaying complete details for an appointment with P-01 cancellation and FIX-PAT-02 rescheduling support.
class AppointmentDetailScreen extends StatefulWidget {
  const AppointmentDetailScreen({
    super.key,
    required this.appointment,
    this.apiClient,
    this.onAppointmentCancelled,
    this.onAppointmentRescheduled,
    this.currentPatientId,
    this.currentTime,
  });

  final Appointment appointment;
  final ApiClient? apiClient;
  final ValueChanged<Appointment>? onAppointmentCancelled;
  final ValueChanged<Appointment>? onAppointmentRescheduled;
  final String? currentPatientId;
  final DateTime Function()? currentTime;

  /// Helper to present this screen via modal bottom sheet or route.
  static Future<void> show(
    BuildContext context,
    Appointment appointment, {
    ApiClient? apiClient,
    ValueChanged<Appointment>? onAppointmentCancelled,
    ValueChanged<Appointment>? onAppointmentRescheduled,
    String? currentPatientId,
    DateTime Function()? currentTime,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppointmentDetailScreen(
          appointment: appointment,
          apiClient: apiClient,
          onAppointmentCancelled: onAppointmentCancelled,
          onAppointmentRescheduled: onAppointmentRescheduled,
          currentPatientId: currentPatientId,
          currentTime: currentTime,
        ),
      ),
    );
  }

  @override
  State<AppointmentDetailScreen> createState() =>
      _AppointmentDetailScreenState();
}

class _AppointmentDetailScreenState extends State<AppointmentDetailScreen> {
  late Appointment _currentAppointment;
  late final ApiClient _apiClient;
  bool _isCancelling = false;

  Appointment get appointment => _currentAppointment;

  @override
  void initState() {
    super.initState();
    _currentAppointment = widget.appointment;
    _apiClient = widget.apiClient ?? ApiClient();
  }

  @override
  void didUpdateWidget(covariant AppointmentDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.appointment != widget.appointment) {
      _currentAppointment = widget.appointment;
    }
  }

  DateTime? get _appointmentStartDateTime {
    if (appointment.appointmentDate == null ||
        appointment.appointmentDate!.isEmpty) {
      return null;
    }
    try {
      final date = DateTime.parse(appointment.appointmentDate!);
      if (appointment.timeSlot != null && appointment.timeSlot!.isNotEmpty) {
        final parts = appointment.timeSlot!.split(':');
        if (parts.length >= 2) {
          final hour = int.tryParse(parts[0]);
          final minute = int.tryParse(parts[1]);
          if (hour != null && minute != null) {
            return DateTime(date.year, date.month, date.day, hour, minute);
          }
        }
      }
      return DateTime(date.year, date.month, date.day, 0, 0);
    } catch (_) {
      return null;
    }
  }

  bool get _canCancel {
    // 1. Only active / non-terminal statuses
    if (appointment.status != AppointmentStatus.pending &&
        appointment.status != AppointmentStatus.confirmed &&
        appointment.status != AppointmentStatus.rescheduled) {
      return false;
    }

    // 2. Ownership check: if currentPatientId is supplied, it must match
    if (widget.currentPatientId != null &&
        appointment.patient.id != null &&
        appointment.patient.id != widget.currentPatientId) {
      return false;
    }

    // 3. Time check: DEC-POL-02 allows cancellation up until appointment start time
    final start = _appointmentStartDateTime;
    if (start == null) return false;

    final now =
        widget.currentTime != null ? widget.currentTime!() : DateTime.now();
    return now.isBefore(start);
  }

  bool get _canReschedule {
    // 1. Only active / reschedulable statuses (pending, confirmed, rescheduled)
    if (appointment.status != AppointmentStatus.pending &&
        appointment.status != AppointmentStatus.confirmed &&
        appointment.status != AppointmentStatus.rescheduled) {
      return false;
    }

    // 2. Ownership check: if currentPatientId is supplied, it must match
    if (widget.currentPatientId != null &&
        appointment.patient.id != null &&
        appointment.patient.id != widget.currentPatientId) {
      return false;
    }

    // 3. Time check: Option A enforces now.isBefore(start) on original appointment
    final start = _appointmentStartDateTime;
    if (start == null) return false;

    final now =
        widget.currentTime != null ? widget.currentTime!() : DateTime.now();
    return now.isBefore(start);
  }

  Future<String?> _showCancelDialog(
      BuildContext context, LocalizedStrings strings) async {
    final reasonController = TextEditingController();

    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          strings.cancelAppointmentTitle,
          style: AafiyaTypography.titleMedium
              .copyWith(fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              strings.cancelAppointmentConfirmPrompt,
              style: AafiyaTypography.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              key: const Key('cancellation_reason_input'),
              controller: reasonController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: strings.cancellationReasonPrompt,
                hintStyle: AafiyaTypography.caption
                    .copyWith(color: AafiyaColors.secondaryText),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  borderSide: const BorderSide(color: AafiyaColors.border),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            key: const Key('cancel_dialog_dismiss_button'),
            onPressed: () => Navigator.of(ctx).pop(null),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            key: const Key('confirm_cancel_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.error,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            onPressed: () =>
                Navigator.of(ctx).pop(reasonController.text.trim()),
            child: Text(strings.confirmCancelAction),
          ),
        ],
      ),
    );
  }

  Future<void> _handleCancel() async {
    final strings = LocalizedStrings.of(context);

    if (!_canCancel) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            strings.isArabic
                ? 'لا يمكن إلغاء الموعد بعد موعد بدئه أو في حالته الحالية.'
                : strings.isFrench
                    ? 'Le rendez-vous ne peut plus être annulé après son heure de début.'
                    : 'Appointment cannot be cancelled after its scheduled start time.',
          ),
          backgroundColor: AafiyaColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_isCancelling) return;

    final reason = await _showCancelDialog(context, strings);
    if (reason == null || !mounted) return;

    if (_isCancelling) return;

    setState(() {
      _isCancelling = true;
    });

    final payload = reason.isNotEmpty ? {'reason': reason} : null;
    final result = await _apiClient.post(
      ApiEndpoints.appointmentCancel(appointment.id),
      body: payload,
    );

    if (!mounted) return;

    setState(() {
      _isCancelling = false;
    });

    switch (result) {
      case ApiSuccess(:final data):
        final raw = data['data'];
        final apptData = (raw is Map<String, dynamic>) ? raw : data;
        Appointment updated;
        try {
          final parsed = Appointment.fromJson(apptData);
          updated = Appointment(
            id: parsed.id.isNotEmpty ? parsed.id : appointment.id,
            bookingReference: parsed.bookingReference.isNotEmpty
                ? parsed.bookingReference
                : appointment.bookingReference,
            secureToken:
                (parsed.secureToken != null && parsed.secureToken!.isNotEmpty)
                    ? parsed.secureToken
                    : appointment.secureToken,
            clinic:
                (parsed.clinic.name != null && parsed.clinic.name!.isNotEmpty)
                    ? parsed.clinic
                    : appointment.clinic,
            doctor:
                (parsed.doctor.name != null && parsed.doctor.name!.isNotEmpty)
                    ? parsed.doctor
                    : appointment.doctor,
            patient:
                (parsed.patient.name != null && parsed.patient.name!.isNotEmpty)
                    ? parsed.patient
                    : appointment.patient,
            bookingCenter: parsed.bookingCenter ?? appointment.bookingCenter,
            appointmentDate:
                parsed.appointmentDate ?? appointment.appointmentDate,
            timeSlot: parsed.timeSlot ?? appointment.timeSlot,
            status: AppointmentStatus.cancelled,
            notes: parsed.notes ?? appointment.notes,
            confirmedAt: parsed.confirmedAt ?? appointment.confirmedAt,
            confirmedBy: parsed.confirmedBy ?? appointment.confirmedBy,
            checkedInAt: parsed.checkedInAt ?? appointment.checkedInAt,
            checkedInBy: parsed.checkedInBy ?? appointment.checkedInBy,
            createdAt: parsed.createdAt ?? appointment.createdAt,
          );
        } catch (_) {
          updated = Appointment(
            id: appointment.id,
            bookingReference: appointment.bookingReference,
            secureToken: appointment.secureToken,
            clinic: appointment.clinic,
            doctor: appointment.doctor,
            patient: appointment.patient,
            bookingCenter: appointment.bookingCenter,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            status: AppointmentStatus.cancelled,
            notes: appointment.notes,
            confirmedAt: appointment.confirmedAt,
            confirmedBy: appointment.confirmedBy,
            checkedInAt: appointment.checkedInAt,
            checkedInBy: appointment.checkedInBy,
            createdAt: appointment.createdAt,
          );
        }

        setState(() {
          _currentAppointment = updated;
        });

        widget.onAppointmentCancelled?.call(updated);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.cancelSuccessMessage),
            backgroundColor: AafiyaColors.healingGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );

      case ApiFailure(:final exception):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exception.message),
            backgroundColor: AafiyaColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }

  Future<void> _handleReschedule() async {
    if (!_canReschedule || _isCancelling) return;

    final updated = await RescheduleAppointmentSheet.show(
      context,
      appointment: appointment,
      apiClient: _apiClient,
      currentTime: widget.currentTime,
    );

    if (!mounted) return;

    if (updated != null) {
      setState(() {
        _currentAppointment = updated;
      });

      widget.onAppointmentRescheduled?.call(updated);

      final strings = LocalizedStrings.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.rescheduleSuccessMessage),
          backgroundColor: AafiyaColors.healingGreen,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final statusColor = _resolveStatusColor(appointment.status);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.appointmentDetails,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          tooltip: strings.close,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AafiyaSpacing.insetScreen,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Status & Reference Header Ticket Card
              AafiyaTicketCard(
                dividerPositionFromBottom: 50.0,
                topContent: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    AafiyaBrandMark(
                      markSize: 26,
                      showWordmark: true,
                      titleStyle: AafiyaTypography.titleMedium.copyWith(
                        color: AafiyaColors.primaryText,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                        border: Border.all(
                            color: statusColor.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        strings.statusLabel(appointment.status),
                        style: AafiyaTypography.titleMedium.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                bottomContent: SizedBox(
                  height: 20,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.confirmation_number_outlined,
                        size: 16,
                        color: AafiyaColors.secondaryText,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${strings.bookingReference}: #${appointment.bookingReference}',
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.secondaryText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 2. Doctor Information Card
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.medical_services_outlined,
                          color: AafiyaColors.healthBlue,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          strings.doctor,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      appointment.doctor.name?.isNotEmpty == true
                          ? appointment.doctor.name!
                          : strings.doctor,
                      style: AafiyaTypography.titleLarge.copyWith(
                        color: AafiyaColors.primaryText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (appointment.doctor.specialty?.isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Text(
                        strings.specialtyName(appointment.doctor.specialty!),
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.healthBlue,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 3. Clinic Information Card
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.apartment_rounded,
                          color: AafiyaColors.healthBlue,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          strings.clinic,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      appointment.clinic.name?.isNotEmpty == true
                          ? appointment.clinic.name!
                          : strings.clinic,
                      style: AafiyaTypography.titleMedium.copyWith(
                        color: AafiyaColors.primaryText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (appointment.clinic.wilaya?.isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            size: 16,
                            color: AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            strings.wilayaName(appointment.clinic.wilaya!),
                            style: AafiyaTypography.bodyMedium.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (appointment.clinic.phone?.isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.phone_outlined,
                            size: 16,
                            color: AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            appointment.clinic.phone!,
                            style: AafiyaTypography.bodyMedium.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 4. Schedule (Date & Time) Card
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(
                                    Icons.calendar_today_outlined,
                                    size: 16,
                                    color: AafiyaColors.secondaryText,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    strings.appointmentDate,
                                    style: AafiyaTypography.caption.copyWith(
                                      color: AafiyaColors.secondaryText,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                appointment.appointmentDate?.isNotEmpty == true
                                    ? strings
                                        .formatDate(appointment.appointmentDate)
                                    : '-',
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (appointment.timeSlot?.isNotEmpty == true)
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.access_time_rounded,
                                      size: 16,
                                      color: AafiyaColors.secondaryText,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      strings.timeSlot,
                                      style: AafiyaTypography.caption.copyWith(
                                        color: AafiyaColors.secondaryText,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  appointment.timeSlot!,
                                  style: AafiyaTypography.titleMedium.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 5. Notes Card (if present)
              if (appointment.notes?.isNotEmpty == true) ...[
                AafiyaCard(
                  padding: AafiyaSpacing.insetAllMd,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.notes_rounded,
                            size: 18,
                            color: AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            strings.notes,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        appointment.notes!,
                        style: AafiyaTypography.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // 6. Confirmation / Check-in metadata (if present)
              if (appointment.confirmedAt?.isNotEmpty == true ||
                  appointment.checkedInAt?.isNotEmpty == true) ...[
                AafiyaCard(
                  padding: AafiyaSpacing.insetAllMd,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (appointment.confirmedAt?.isNotEmpty == true) ...[
                        Row(
                          children: [
                            const Icon(
                              Icons.check_circle_outline_rounded,
                              size: 16,
                              color: AafiyaColors.success,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '${strings.appointmentConfirmedAt}: ${strings.formatDate(appointment.confirmedAt)}',
                                style: AafiyaTypography.caption.copyWith(
                                  color: AafiyaColors.secondaryText,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (appointment.checkedInAt?.isNotEmpty == true) ...[
                        if (appointment.confirmedAt?.isNotEmpty == true)
                          const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(
                              Icons.how_to_reg_outlined,
                              size: 16,
                              color: AafiyaColors.healthBlue,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '${strings.appointmentCheckedInAt}: ${strings.formatDate(appointment.checkedInAt)}',
                                style: AafiyaTypography.caption.copyWith(
                                  color: AafiyaColors.secondaryText,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // 7. Visit Pass (QR) Action Button (P-02)
              AafiyaButton(
                key: const Key('view_visit_pass_button'),
                label: strings.isArabic
                    ? 'تصريح الزيارة الرقمي (QR)'
                    : strings.isFrench
                        ? 'Pass de visite digital (QR)'
                        : 'Digital Visit Pass (QR)',
                icon: const Icon(Icons.qr_code_2_rounded, size: 20),
                onPressed: () =>
                    VisitPassSheet.show(context, appointment: appointment),
                variant: AafiyaButtonVariant.primary,
              ),
              const SizedBox(height: 12),

              // 7b. Patient Rescheduling Action Button (FIX-PAT-02)
              if (_canReschedule) ...[
                AafiyaButton(
                  key: const Key('reschedule_appointment_button'),
                  label: strings.rescheduleAppointmentTitle,
                  icon: const Icon(Icons.edit_calendar_outlined,
                      size: 20, color: AafiyaColors.healthBlue),
                  onPressed: _isCancelling ? null : _handleReschedule,
                  variant: AafiyaButtonVariant.outline,
                ),
                const SizedBox(height: 12),
              ],

              // 7c. Patient Cancellation Action Button (FIX-PAT-01 / P-01)
              if (_canCancel) ...[
                AafiyaButton(
                  key: const Key('cancel_appointment_button'),
                  label: strings.cancelAppointmentTitle,
                  icon: const Icon(Icons.cancel_outlined,
                      size: 20, color: AafiyaColors.error),
                  onPressed: _isCancelling ? null : _handleCancel,
                  isLoading: _isCancelling,
                  variant: AafiyaButtonVariant.outline,
                ),
                const SizedBox(height: 12),
              ],

              // 8. Close Action Button
              AafiyaButton(
                label: strings.close,
                onPressed: () => Navigator.of(context).pop(),
                variant: AafiyaButtonVariant.outline,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Color _resolveStatusColor(AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.pending => AafiyaColors.warning,
      AppointmentStatus.confirmed => AafiyaColors.success,
      AppointmentStatus.attended => AafiyaColors.healthBlue,
      AppointmentStatus.noShow => AafiyaColors.warning,
      AppointmentStatus.cancelled ||
      AppointmentStatus.rejected =>
        AafiyaColors.error,
      AppointmentStatus.expired => AafiyaColors.secondaryText,
      AppointmentStatus.rescheduled => AafiyaColors.info,
      AppointmentStatus.unknown => AafiyaColors.secondaryText,
    };
  }
}

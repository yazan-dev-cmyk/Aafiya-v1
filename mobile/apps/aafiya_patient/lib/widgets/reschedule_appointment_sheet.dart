import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal bottom sheet allowing patients to reschedule an active appointment (FIX-PAT-02).
///
/// Features:
/// - Select a new appointment date (restricted to >= today).
/// - Queries available hourly capacity via `GET /api/v1/appointments/slots`.
/// - Renders available slots and disables full/unavailable slots.
/// - Handles loading, empty, and error slot states with retry.
/// - Prevents no-op rescheduling to the identical date and time slot.
/// - Protects against duplicate concurrent submissions.
/// - Re-validates Option A eligibility (`now.isBefore(start)`) before submitting.
/// - Submits update via `POST /api/v1/appointments/{id}/reschedule`.
/// - Preserves `secure_token` and coordinates without optimistic mutation.
class RescheduleAppointmentSheet extends StatefulWidget {
  const RescheduleAppointmentSheet({
    super.key,
    required this.appointment,
    required this.apiClient,
    this.currentTime,
  });

  final Appointment appointment;
  final ApiClient apiClient;
  final DateTime Function()? currentTime;

  /// Helper to display this sheet as a modal bottom sheet.
  /// Returns the updated [Appointment] if rescheduling succeeded, or null if cancelled.
  static Future<Appointment?> show(
    BuildContext context, {
    required Appointment appointment,
    required ApiClient apiClient,
    DateTime Function()? currentTime,
  }) {
    return showModalBottomSheet<Appointment>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RescheduleAppointmentSheet(
        appointment: appointment,
        apiClient: apiClient,
        currentTime: currentTime,
      ),
    );
  }

  @override
  State<RescheduleAppointmentSheet> createState() =>
      _RescheduleAppointmentSheetState();
}

class _RescheduleAppointmentSheetState
    extends State<RescheduleAppointmentSheet> {
  late DateTime _selectedDate;
  AppointmentSlot? _selectedSlot;
  late final TextEditingController _notesController;

  List<AppointmentSlot> _slots = [];
  bool _isLoadingSlots = false;
  String? _slotsError;

  bool _isSubmitting = false;
  String? _submitError;

  DateTime get _now =>
      widget.currentTime != null ? widget.currentTime!() : DateTime.now();

  DateTime get _today {
    final now = _now;
    return DateTime(now.year, now.month, now.day);
  }

  String _formatDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  DateTime? get _appointmentStartDateTime {
    final appt = widget.appointment;
    if (appt.appointmentDate == null || appt.appointmentDate!.isEmpty) {
      return null;
    }
    try {
      final date = DateTime.parse(appt.appointmentDate!);
      if (appt.timeSlot != null && appt.timeSlot!.isNotEmpty) {
        final parts = appt.timeSlot!.split(':');
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

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController(text: widget.appointment.notes ?? '');

    // Set initial date to appointment date if >= today, else default to today
    DateTime initial = _today;
    if (widget.appointment.appointmentDate != null) {
      try {
        final parsed = DateTime.parse(widget.appointment.appointmentDate!);
        final midnight = DateTime(parsed.year, parsed.month, parsed.day);
        if (!midnight.isBefore(_today)) {
          initial = midnight;
        }
      } catch (_) {}
    }
    _selectedDate = initial;

    // Fetch available slots for the initial date
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchSlots();
    });
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _fetchSlots() async {
    final clinicId = widget.appointment.clinic.id?.trim();
    final doctorId = widget.appointment.doctor.id?.trim();

    if (clinicId == null || clinicId.isEmpty || doctorId == null || doctorId.isEmpty) {
      setState(() {
        _slotsError = 'بيانات العيادة أو الطبيب غير مكتملة.';
        _slots = [];
        _selectedSlot = null;
      });
      return;
    }

    setState(() {
      _isLoadingSlots = true;
      _slotsError = null;
      _selectedSlot = null;
      _submitError = null;
    });

    final formattedDate = _formatDate(_selectedDate);
    final result = await widget.apiClient.get(
      ApiEndpoints.appointmentSlots,
      queryParameters: {
        'clinic_id': clinicId,
        'doctor_id': doctorId,
        'date': formattedDate,
      },
    );

    if (!mounted) return;

    setState(() {
      _isLoadingSlots = false;
      switch (result) {
        case ApiSuccess(:final data):
          final rawData = data['data'];
          final container = rawData is Map<String, dynamic> ? rawData : data;
          final rawSlots = container['slots'];
          if (rawSlots is List) {
            _slots = rawSlots
                .whereType<Map<String, dynamic>>()
                .map(AppointmentSlot.fromJson)
                .toList();
          } else {
            _slots = [];
          }
          _slotsError = null;
        case ApiFailure(:final exception):
          _slotsError = exception.message;
          _slots = [];
      }
    });
  }

  Future<void> _selectDate() async {
    if (_isSubmitting) return;

    final initial = _selectedDate.isBefore(_today) ? _today : _selectedDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: _today,
      lastDate: _today.add(const Duration(days: 90)),
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = DateTime(picked.year, picked.month, picked.day);
      });
      _fetchSlots();
    }
  }

  String _extractErrorMessage(AppException exception, LocalizedStrings strings) {
    if (exception is ValidationException && exception.validationErrors.isNotEmpty) {
      for (final errors in exception.validationErrors.values) {
        if (errors.isNotEmpty) {
          return errors.first;
        }
      }
    }
    return exception.message;
  }

  Future<void> _confirmReschedule() async {
    if (_isSubmitting) return;

    final strings = LocalizedStrings.of(context);

    // 1. Re-validate Option A eligibility at submission time
    final start = _appointmentStartDateTime;
    if (start != null && !_now.isBefore(start)) {
      setState(() {
        _submitError = strings.isArabic
            ? 'انتهى وقت الموعد الأصلي ولا يمكن إعادة جدولته.'
            : (strings.isFrench
                ? 'L\'heure du rendez-vous est dépassée et ne peut plus être modifiée.'
                : 'Appointment time has passed and cannot be rescheduled.');
      });
      return;
    }

    // 2. Validate slot selection
    if (_selectedSlot == null) {
      setState(() {
        _submitError = strings.isArabic
            ? 'يرجى اختيار فترة زمنية متاحة.'
            : (strings.isFrench
                ? 'Veuillez sélectionner un créneau horaire.'
                : 'Please select an available time slot.');
      });
      return;
    }

    // 3. No-op prevention: reject identical date and time slot
    final formattedDate = _formatDate(_selectedDate);
    if (formattedDate == widget.appointment.appointmentDate &&
        _selectedSlot!.timeSlot == widget.appointment.timeSlot) {
      setState(() {
        _submitError = strings.isArabic
            ? 'التاريخ والفترة المحددة مطابقة لموعدك الحالي بالفعل.'
            : (strings.isFrench
                ? 'La date et le créneau sélectionnés sont identiques à votre rendez-vous actuel.'
                : 'Selected date and time slot are identical to your current appointment.');
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _submitError = null;
    });

    final payload = <String, dynamic>{
      'appointment_date': formattedDate,
      'time_slot': _selectedSlot!.timeSlot,
    };
    final notes = _notesController.text.trim();
    if (notes.isNotEmpty) {
      payload['notes'] = notes;
    }

    final result = await widget.apiClient.post(
      ApiEndpoints.appointmentReschedule(widget.appointment.id),
      body: payload,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        final raw = data['data'];
        final apptData = (raw is Map<String, dynamic>) ? raw : data;
        Appointment updated;
        try {
          final parsed = Appointment.fromJson(apptData);
          updated = Appointment(
            id: parsed.id.isNotEmpty ? parsed.id : widget.appointment.id,
            bookingReference: parsed.bookingReference.isNotEmpty
                ? parsed.bookingReference
                : widget.appointment.bookingReference,
            secureToken: (parsed.secureToken != null && parsed.secureToken!.isNotEmpty)
                ? parsed.secureToken
                : widget.appointment.secureToken,
            clinic: (parsed.clinic.name != null && parsed.clinic.name!.isNotEmpty)
                ? parsed.clinic
                : widget.appointment.clinic,
            doctor: (parsed.doctor.name != null && parsed.doctor.name!.isNotEmpty)
                ? parsed.doctor
                : widget.appointment.doctor,
            patient: (parsed.patient.name != null && parsed.patient.name!.isNotEmpty)
                ? parsed.patient
                : widget.appointment.patient,
            bookingCenter: parsed.bookingCenter ?? widget.appointment.bookingCenter,
            appointmentDate: parsed.appointmentDate ?? formattedDate,
            timeSlot: parsed.timeSlot ?? _selectedSlot!.timeSlot,
            status: parsed.status != AppointmentStatus.unknown
                ? parsed.status
                : widget.appointment.status,
            notes: parsed.notes ?? (notes.isNotEmpty ? notes : widget.appointment.notes),
            confirmedAt: parsed.confirmedAt ?? widget.appointment.confirmedAt,
            confirmedBy: parsed.confirmedBy ?? widget.appointment.confirmedBy,
            checkedInAt: parsed.checkedInAt ?? widget.appointment.checkedInAt,
            checkedInBy: parsed.checkedInBy ?? widget.appointment.checkedInBy,
            createdAt: parsed.createdAt ?? widget.appointment.createdAt,
          );
        } catch (_) {
          updated = Appointment(
            id: widget.appointment.id,
            bookingReference: widget.appointment.bookingReference,
            secureToken: widget.appointment.secureToken,
            clinic: widget.appointment.clinic,
            doctor: widget.appointment.doctor,
            patient: widget.appointment.patient,
            bookingCenter: widget.appointment.bookingCenter,
            appointmentDate: formattedDate,
            timeSlot: _selectedSlot!.timeSlot,
            status: widget.appointment.status,
            notes: notes.isNotEmpty ? notes : widget.appointment.notes,
            confirmedAt: widget.appointment.confirmedAt,
            confirmedBy: widget.appointment.confirmedBy,
            checkedInAt: widget.appointment.checkedInAt,
            checkedInBy: widget.appointment.checkedInBy,
            createdAt: widget.appointment.createdAt,
          );
        }

        Navigator.of(context).pop(updated);

      case ApiFailure(:final exception):
        setState(() {
          _isSubmitting = false;
          _submitError = _extractErrorMessage(exception, strings);
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final formattedDate = _formatDate(_selectedDate);

    return PopScope(
      canPop: !_isSubmitting,
      child: DraggableScrollableSheet(
        initialChildSize: 0.88,
        minChildSize: 0.5,
        maxChildSize: 0.96,
        builder: (context, scrollController) {
          return Container(
            decoration: const BoxDecoration(
              color: AafiyaColors.pureWhite,
              borderRadius: BorderRadius.vertical(top: Radius.circular(AafiyaRadius.lg)),
            ),
            child: Column(
              children: [
                // 1. Drag Handle
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AafiyaColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),

                // 2. Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                        ),
                        child: const Icon(
                          Icons.edit_calendar_outlined,
                          color: AafiyaColors.healthBlue,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          strings.rescheduleAppointmentTitle,
                          style: AafiyaTypography.titleLarge.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.primaryText,
                          ),
                        ),
                      ),
                      IconButton(
                        key: const Key('close_reschedule_sheet_button'),
                        icon: const Icon(Icons.close_rounded, color: AafiyaColors.secondaryText),
                        onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: AafiyaColors.border),

                // 3. Scrollable Form Content
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Current Appointment Info Card
                      Container(
                        padding: AafiyaSpacing.insetAllMd,
                        decoration: BoxDecoration(
                          color: AafiyaColors.lightBackground,
                          borderRadius: BorderRadius.circular(AafiyaRadius.md),
                          border: Border.all(color: AafiyaColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (widget.appointment.doctor.name != null &&
                                widget.appointment.doctor.name!.isNotEmpty)
                              Row(
                                children: [
                                  const Icon(Icons.person_outline_rounded,
                                      size: 16, color: AafiyaColors.healthBlue),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      widget.appointment.doctor.name!,
                                      style: AafiyaTypography.bodyMedium.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.access_time_rounded,
                                    size: 16, color: AafiyaColors.secondaryText),
                                const SizedBox(width: 6),
                                Text(
                                  strings.isArabic
                                      ? 'الموعد الحالي: ${widget.appointment.appointmentDate ?? '-'} • ${widget.appointment.timeSlot ?? '-'}'
                                      : (strings.isFrench
                                          ? 'Actuel: ${widget.appointment.appointmentDate ?? '-'} • ${widget.appointment.timeSlot ?? '-'}'
                                          : 'Current: ${widget.appointment.appointmentDate ?? '-'} • ${widget.appointment.timeSlot ?? '-'}'),
                                  style: AafiyaTypography.caption.copyWith(
                                    color: AafiyaColors.secondaryText,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Date Picker Section
                      Text(
                        strings.selectDateLabel,
                        style: AafiyaTypography.titleMedium.copyWith(fontSize: 14),
                      ),
                      const SizedBox(height: 6),
                      InkWell(
                        key: const Key('date_picker_button'),
                        onTap: _isSubmitting ? null : _selectDate,
                        borderRadius: BorderRadius.circular(AafiyaRadius.md),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: AafiyaColors.border),
                            borderRadius: BorderRadius.circular(AafiyaRadius.md),
                            color: AafiyaColors.pureWhite,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.calendar_today_outlined,
                                      size: 18, color: AafiyaColors.healthBlue),
                                  const SizedBox(width: 10),
                                  Text(
                                    formattedDate,
                                    style: AafiyaTypography.bodyLarge.copyWith(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              const Icon(Icons.arrow_drop_down_rounded,
                                  color: AafiyaColors.secondaryText),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Time Slot Selection Section
                      Text(
                        strings.selectTimeSlotLabel,
                        style: AafiyaTypography.titleMedium.copyWith(fontSize: 14),
                      ),
                      const SizedBox(height: 8),

                      if (_isLoadingSlots)
                        Padding(
                          key: const Key('slots_loading_indicator'),
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: AafiyaColors.healthBlue,
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  strings.loadingSlotsPrompt,
                                  style: AafiyaTypography.caption.copyWith(
                                    color: AafiyaColors.secondaryText,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      else if (_slotsError != null)
                        Container(
                          key: const Key('slots_error_view'),
                          padding: AafiyaSpacing.insetAllMd,
                          decoration: BoxDecoration(
                            color: AafiyaColors.error.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(AafiyaRadius.md),
                            border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded,
                                  color: AafiyaColors.error, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _slotsError!,
                                  style: AafiyaTypography.bodyMedium.copyWith(
                                    color: AafiyaColors.error,
                                  ),
                                ),
                              ),
                              TextButton(
                                key: const Key('retry_slots_button'),
                                onPressed: _fetchSlots,
                                child: Text(strings.retry),
                              ),
                            ],
                          ),
                        )
                      else if (_slots.isEmpty)
                        Container(
                          key: const Key('no_slots_available_view'),
                          padding: AafiyaSpacing.insetAllLg,
                          decoration: BoxDecoration(
                            color: AafiyaColors.lightBackground,
                            borderRadius: BorderRadius.circular(AafiyaRadius.md),
                            border: Border.all(color: AafiyaColors.border),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.event_busy_rounded,
                                  color: AafiyaColors.secondaryText, size: 20),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  strings.noSlotsAvailable,
                                  style: AafiyaTypography.bodyMedium.copyWith(
                                    color: AafiyaColors.secondaryText,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _slots.map((slot) {
                            final isSelected = _selectedSlot?.timeSlot == slot.timeSlot;
                            final isAvailable = slot.isAvailable && slot.available > 0;

                            Color bgColor = AafiyaColors.pureWhite;
                            Color borderColor = AafiyaColors.border;
                            Color textColor = AafiyaColors.primaryText;

                            if (isSelected) {
                              bgColor = AafiyaColors.healthBlue.withValues(alpha: 0.12);
                              borderColor = AafiyaColors.healthBlue;
                              textColor = AafiyaColors.healthBlue;
                            } else if (!isAvailable) {
                              bgColor = AafiyaColors.lightBackground;
                              borderColor = AafiyaColors.border.withValues(alpha: 0.5);
                              textColor = AafiyaColors.secondaryText;
                            }

                            return InkWell(
                              key: Key('slot_chip_${slot.timeSlot}'),
                              onTap: isAvailable && !_isSubmitting
                                  ? () {
                                      setState(() {
                                        _selectedSlot = slot;
                                        _submitError = null;
                                      });
                                    }
                                  : null,
                              borderRadius: BorderRadius.circular(AafiyaRadius.md),
                              child: Container(
                                width: (MediaQuery.of(context).size.width - 56) / 3,
                                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                                decoration: BoxDecoration(
                                  color: bgColor,
                                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                                  border: Border.all(
                                    color: borderColor,
                                    width: isSelected ? 2.0 : 1.0,
                                  ),
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      slot.timeSlot,
                                      style: AafiyaTypography.bodyMedium.copyWith(
                                        fontWeight:
                                            isSelected ? FontWeight.bold : FontWeight.w600,
                                        color: textColor,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      isAvailable
                                          ? '${slot.available} ${strings.isArabic ? "متاح" : "avail"}'
                                          : strings.slotFullBadge,
                                      style: AafiyaTypography.caption.copyWith(
                                        color: isAvailable
                                            ? AafiyaColors.healingGreen
                                            : AafiyaColors.error,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 20),

                      // Optional Notes Field
                      Text(
                        strings.bookingNotesLabel,
                        style: AafiyaTypography.titleMedium.copyWith(fontSize: 14),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        key: const Key('reschedule_notes_field'),
                        controller: _notesController,
                        maxLines: 2,
                        enabled: !_isSubmitting,
                        decoration: InputDecoration(
                          hintText: strings.bookingNotesHint,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AafiyaRadius.md),
                            borderSide: const BorderSide(color: AafiyaColors.border),
                          ),
                          filled: true,
                          fillColor: AafiyaColors.pureWhite,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Submission Error Banner
                      if (_submitError != null) ...[
                        Container(
                          key: const Key('reschedule_error_banner'),
                          padding: AafiyaSpacing.insetAllMd,
                          decoration: BoxDecoration(
                            color: AafiyaColors.error.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(AafiyaRadius.md),
                            border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded,
                                  color: AafiyaColors.error, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _submitError!,
                                  style: AafiyaTypography.bodyMedium.copyWith(
                                    color: AafiyaColors.error,
                                    height: 1.3,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Action Buttons
                      AafiyaButton(
                        key: const Key('confirm_reschedule_button'),
                        label: strings.confirmRescheduleAction,
                        icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
                        onPressed: (_selectedSlot == null || _isSubmitting)
                            ? null
                            : _confirmReschedule,
                        isLoading: _isSubmitting,
                        variant: AafiyaButtonVariant.primary,
                      ),
                      const SizedBox(height: 10),

                      AafiyaButton(
                        label: strings.cancel,
                        onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                        variant: AafiyaButtonVariant.outline,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

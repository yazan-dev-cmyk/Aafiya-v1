import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/bc_booking_ticket_sheet.dart';
import '../widgets/slot_selection_grid.dart';

/// Screen displaying the institutional appointment bookings ledger for the Booking Center.
/// Allows filtering by status (All, Pending, Confirmed, Attended, Cancelled),
/// viewing appointment tickets, and executing operational cancellation and rescheduling.
class BcAppointmentsListScreen extends StatefulWidget {
  const BcAppointmentsListScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.apiClient,
    this.bookingCenterService,
    this.onQuotaNeedsRefresh,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final ApiClient? apiClient;
  final BookingCenterService? bookingCenterService;
  final VoidCallback? onQuotaNeedsRefresh;

  @override
  State<BcAppointmentsListScreen> createState() =>
      _BcAppointmentsListScreenState();
}

class _BcAppointmentsListScreenState extends State<BcAppointmentsListScreen> {
  late final BookingCenterService _service;

  String? _selectedStatus; // null means 'All'
  bool _isLoading = true;
  String? _errorMessage;
  List<Appointment> _appointments = [];

  @override
  void initState() {
    super.initState();
    final client = widget.apiClient ?? widget.sessionManager.apiClient;
    _service =
        widget.bookingCenterService ?? BookingCenterService(apiClient: client);
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _service.getAppointments(status: _selectedStatus);
    if (!mounted) return;

    setState(() {
      _isLoading = false;
      switch (result) {
        case ApiSuccess(:final data):
          _appointments = data;
          _errorMessage = null;
        case ApiFailure(:final exception):
          _errorMessage = exception.message;
          _appointments = [];
      }
    });
  }

  Color _getStatusColor(AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.pending => AafiyaColors.warning,
      AppointmentStatus.confirmed => AafiyaColors.healthBlue,
      AppointmentStatus.attended => AafiyaColors.healingGreen,
      AppointmentStatus.noShow => AafiyaColors.secondaryText,
      AppointmentStatus.cancelled || AppointmentStatus.rejected => AafiyaColors.error,
      AppointmentStatus.expired || AppointmentStatus.rescheduled => AafiyaColors.secondaryText,
      AppointmentStatus.unknown => AafiyaColors.secondaryText,
    };
  }

  String _getStatusLabel(LocalizedStrings strings, AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.pending => strings.statusPending,
      AppointmentStatus.confirmed => strings.statusConfirmed,
      AppointmentStatus.attended => strings.statusAttended,
      AppointmentStatus.noShow => strings.statusNoShow,
      AppointmentStatus.cancelled => strings.statusCancelled,
      AppointmentStatus.rejected => strings.statusRejected,
      AppointmentStatus.expired => 'منتهي',
      AppointmentStatus.rescheduled => 'مُعاد جدولته',
      AppointmentStatus.unknown => 'غير محدد',
    };
  }

  // --- Cancellation Flow ---
  Future<void> _showCancelDialog(Appointment appointment) async {
    final strings = LocalizedStrings.of(context);
    final reasonController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.cancel_outlined, color: AafiyaColors.error, size: 26),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                strings.cancelAppointmentTitle,
                style: AafiyaTypography.titleMedium
                    .copyWith(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              strings.cancelAppointmentConfirmPrompt,
              style: AafiyaTypography.bodyMedium,
            ),
            const SizedBox(height: 12),
            Text(
              'المرجع: ${appointment.bookingReference}',
              style: AafiyaTypography.caption
                  .copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: InputDecoration(
                labelText: strings.cancellationReasonPrompt,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.error,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(strings.confirmCancelAction),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    if (!mounted) return;
    setState(() {
      _isLoading = true;
    });

    final result = await _service.cancelAppointment(
      appointmentId: appointment.id,
      reason: reasonController.text.trim().isNotEmpty
          ? reasonController.text.trim()
          : null,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.cancelSuccessMessage),
            backgroundColor: AafiyaColors.healingGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onQuotaNeedsRefresh?.call();
        _loadAppointments();
      case ApiFailure(:final exception):
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exception.message),
            backgroundColor: AafiyaColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }

  // --- Rescheduling Flow ---
  Future<void> _showRescheduleSheet(Appointment appointment) async {
    final strings = LocalizedStrings.of(context);

    DateTime newDate = DateTime.now();
    final clinicId = appointment.clinic.id;
    final doctorId = appointment.doctor.id;

    if (clinicId == null || doctorId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('بيانات العيادة أو الطبيب غير مكتملة لإعادة الجدولة.'),
          backgroundColor: AafiyaColors.error,
        ),
      );
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _RescheduleSheet(
        appointment: appointment,
        service: _service,
        strings: strings,
        initialDate: newDate,
        clinicId: clinicId,
        doctorId: doctorId,
        onRescheduled: () {
          _loadAppointments();
          widget.onQuotaNeedsRefresh?.call();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.centerAppointmentsTitle,
        leading: BackButton(
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Filter Chips Bar
          _buildFilterBar(strings),
          const Divider(height: 1),

          // Main Appointments List
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadAppointments,
              child: _buildBody(strings),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(LocalizedStrings strings) {
    final filters = <String?, String>{
      null: strings.filterAll,
      'pending': strings.statusPending,
      'confirmed': strings.statusConfirmed,
      'attended': strings.statusAttended,
      'cancelled': strings.statusCancelled,
    };

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: filters.entries.map((entry) {
          final isSelected = _selectedStatus == entry.key;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(entry.value),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  _selectedStatus = selected ? entry.key : null;
                });
                _loadAppointments();
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBody(LocalizedStrings strings) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded,
                  color: AafiyaColors.error, size: 48),
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: AafiyaTypography.bodyMedium,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadAppointments,
                child: Text(strings.retry),
              ),
            ],
          ),
        ),
      );
    }

    if (_appointments.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.event_note_rounded,
                  color: AafiyaColors.secondaryText, size: 48),
              const SizedBox(height: 12),
              Text(
                strings.noAppointmentsFound,
                style: AafiyaTypography.titleMedium.copyWith(
                  color: AafiyaColors.secondaryText,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _appointments.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final appointment = _appointments[index];
        final statusColor = _getStatusColor(appointment.status);
        final statusLabel = _getStatusLabel(strings, appointment.status);
        final canModify = appointment.status.isActive;

        return AafiyaCard(
          child: InkWell(
            onTap: () {
              BcBookingTicketSheet.show(context, appointment: appointment);
            },
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top row: Reference and Status badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        appointment.bookingReference,
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AafiyaColors.primaryText,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          statusLabel,
                          style: AafiyaTypography.caption.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Patient Info
                  Row(
                    children: [
                      const Icon(Icons.person_outline_rounded,
                          size: 16, color: AafiyaColors.secondaryText),
                      const SizedBox(width: 6),
                      Text(
                        appointment.patient.name ?? 'غير محدد',
                        style: AafiyaTypography.bodyMedium
                            .copyWith(fontWeight: FontWeight.w600),
                      ),
                      if (appointment.patient.phone != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          '(${appointment.patient.phone})',
                          style: AafiyaTypography.caption
                              .copyWith(color: AafiyaColors.secondaryText),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Doctor & Clinic Info
                  Row(
                    children: [
                      const Icon(Icons.medical_services_outlined,
                          size: 16, color: AafiyaColors.secondaryText),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '${appointment.doctor.name ?? "غير محدد"} • ${appointment.clinic.name ?? ""}',
                          style: AafiyaTypography.caption,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Date & Time
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded,
                          size: 16, color: AafiyaColors.healthBlue),
                      const SizedBox(width: 6),
                      Text(
                        '${appointment.appointmentDate ?? ""}  ${appointment.timeSlot ?? ""}',
                        style: AafiyaTypography.bodyMedium.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AafiyaColors.healthBlue,
                        ),
                      ),
                    ],
                  ),

                  // Action Buttons (Cancel / Reschedule) for active appointments
                  if (canModify) ...[
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => _showCancelDialog(appointment),
                          icon: const Icon(Icons.close_rounded,
                              size: 16, color: AafiyaColors.error),
                          label: Text(
                            strings.cancelAppointmentTitle,
                            style: const TextStyle(color: AafiyaColors.error),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AafiyaColors.error),
                            minimumSize: Size.zero,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: () => _showRescheduleSheet(appointment),
                          icon: const Icon(Icons.schedule_rounded, size: 16),
                          label: Text(strings.rescheduleAppointmentTitle),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AafiyaColors.healthBlue,
                            foregroundColor: AafiyaColors.pureWhite,
                            minimumSize: Size.zero,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Internal bottom sheet for in-place appointment rescheduling.
class _RescheduleSheet extends StatefulWidget {
  const _RescheduleSheet({
    required this.appointment,
    required this.service,
    required this.strings,
    required this.initialDate,
    required this.clinicId,
    required this.doctorId,
    required this.onRescheduled,
  });

  final Appointment appointment;
  final BookingCenterService service;
  final LocalizedStrings strings;
  final DateTime initialDate;
  final String clinicId;
  final String doctorId;
  final VoidCallback onRescheduled;

  @override
  State<_RescheduleSheet> createState() => _RescheduleSheetState();
}

class _RescheduleSheetState extends State<_RescheduleSheet> {
  late DateTime _selectedDate;
  bool _isLoadingSlots = false;
  List<AppointmentSlot> _slots = [];
  AppointmentSlot? _selectedSlot;
  String? _slotsError;
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  String get _formattedDate =>
      '${_selectedDate.year.toString().padLeft(4, '0')}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.initialDate;
    _loadSlots();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadSlots() async {
    setState(() {
      _isLoadingSlots = true;
      _slotsError = null;
      _selectedSlot = null;
    });

    final result = await widget.service.getAvailableSlots(
      clinicId: widget.clinicId,
      doctorId: widget.doctorId,
      date: _formattedDate,
    );

    if (!mounted) return;

    setState(() {
      _isLoadingSlots = false;
      switch (result) {
        case ApiSuccess(:final data):
          _slots = data;
          _slotsError = null;
        case ApiFailure(:final exception):
          _slotsError = exception.message;
          _slots = [];
      }
    });
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isBefore(today) ? today : _selectedDate,
      firstDate: today,
      lastDate: today.add(const Duration(days: 90)),
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _loadSlots();
    }
  }

  Future<void> _handleReschedule() async {
    if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.strings.selectSlotPrompt),
          backgroundColor: AafiyaColors.error,
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final result = await widget.service.rescheduleAppointment(
      appointmentId: widget.appointment.id,
      appointmentDate: _formattedDate,
      timeSlot: _selectedSlot!.timeSlot,
      notes: _notesController.text.trim().isNotEmpty
          ? _notesController.text.trim()
          : null,
    );

    if (!mounted) return;

    setState(() {
      _isSubmitting = false;
    });

    switch (result) {
      case ApiSuccess():
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.strings.rescheduleSuccessMessage),
            backgroundColor: AafiyaColors.healingGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onRescheduled();
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

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AafiyaColors.pureWhite,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AafiyaColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded,
                        color: AafiyaColors.healthBlue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.strings.rescheduleAppointmentTitle,
                        style: AafiyaTypography.titleLarge
                            .copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Date bar
                      AafiyaCard(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.strings.selectDatePrompt,
                                  style: AafiyaTypography.caption.copyWith(
                                      color: AafiyaColors.secondaryText),
                                ),
                                Text(
                                  _formattedDate,
                                  style: AafiyaTypography.titleMedium
                                      .copyWith(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            OutlinedButton(
                              onPressed: _pickDate,
                              child: const Text('تغيير التاريخ'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      Text(
                        widget.strings.selectSlotPrompt,
                        style: AafiyaTypography.titleMedium
                            .copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),

                      if (_slotsError != null) ...[
                        Text(
                          _slotsError!,
                          style: AafiyaTypography.caption
                              .copyWith(color: AafiyaColors.error),
                        ),
                        const SizedBox(height: 8),
                      ],

                      SlotSelectionGrid(
                        slots: _slots,
                        selectedSlot: _selectedSlot?.timeSlot,
                        isLoading: _isLoadingSlots,
                        onSlotSelected: (slot) {
                          setState(() {
                            _selectedSlot = slot;
                          });
                        },
                      ),
                      const SizedBox(height: 16),

                      TextField(
                        controller: _notesController,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: widget.strings.optionalNotes,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      ElevatedButton(
                        onPressed: _isSubmitting ? null : _handleReschedule,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AafiyaColors.healthBlue,
                          foregroundColor: AafiyaColors.pureWhite,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AafiyaColors.pureWhite,
                                ),
                              )
                            : Text(
                                widget.strings.confirmRescheduleAction,
                                style: AafiyaTypography.bodyMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AafiyaColors.pureWhite,
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

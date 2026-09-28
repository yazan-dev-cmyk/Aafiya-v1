import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/slot_selection_grid.dart';

/// AAFIYA Pro — Clinic Assistant In-Clinic Appointment Booking Screen (TASK-05-02).
///
/// Implements direct in-clinic appointment scheduling for:
/// 1. Return-visit patients (`initialPatient` prefilled from clinic directory lookup).
/// 2. Walk-in patients (direct patient details entry).
///
/// Features:
/// - Selecting active clinic doctor (`GET /api/v1/clinics/{id}`)
/// - Selecting appointment date (restricted to >= today)
/// - Real-time hourly capacity and slot selection (`GET /api/v1/appointments/slots`)
/// - Direct booking submission (`POST /api/v1/appointments`)
/// - Handles 422 capacity conflicts and refreshes slots dynamically.
class AssistantBookingScreen extends StatefulWidget {
  const AssistantBookingScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.apiClient,
    this.bookingService,
    this.initialPatient,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final ApiClient? apiClient;
  final AssistantBookingService? bookingService;
  final PatientSearchResult? initialPatient;

  @override
  State<AssistantBookingScreen> createState() => _AssistantBookingScreenState();
}

class _AssistantBookingScreenState extends State<AssistantBookingScreen> {
  late final ApiClient _apiClient;
  late final AssistantBookingService _bookingService;

  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _mrnController;
  late final TextEditingController _notesController;

  bool _isLoadingDoctors = false;
  List<ClinicDoctorStaff> _doctors = [];
  ClinicDoctorStaff? _selectedDoctor;
  String? _doctorsError;

  DateTime _selectedDate = DateTime.now();
  bool _isLoadingSlots = false;
  List<AppointmentSlot> _slots = [];
  AppointmentSlot? _selectedSlot;
  String? _slotsError;

  bool _isSubmitting = false;

  String get _formattedDate =>
      '${_selectedDate.year.toString().padLeft(4, '0')}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

  bool get _isReturnVisit => widget.initialPatient != null;

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? widget.sessionManager.apiClient;
    _bookingService = widget.bookingService ?? AssistantBookingService(apiClient: _apiClient);

    _nameController = TextEditingController(text: widget.initialPatient?.fullName ?? '');
    _phoneController = TextEditingController(text: widget.initialPatient?.phone ?? '');
    _mrnController = TextEditingController(text: widget.initialPatient?.mrn ?? '');
    _notesController = TextEditingController();

    _loadDoctors();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _mrnController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  String _getEffectiveClinicId() {
    final sessionClinicId = widget.sessionManager.activeClinicId;
    if (sessionClinicId != null && sessionClinicId.trim().isNotEmpty) {
      return sessionClinicId.trim();
    }
    final clientClinicId = _apiClient.activeClinicId;
    if (clientClinicId != null && clientClinicId.trim().isNotEmpty) {
      return clientClinicId.trim();
    }
    return '';
  }

  Future<void> _loadDoctors() async {
    final clinicId = _getEffectiveClinicId();
    if (clinicId.isEmpty) {
      setState(() {
        _doctorsError = 'No active clinic associated with this session.';
      });
      return;
    }

    setState(() {
      _isLoadingDoctors = true;
      _doctorsError = null;
    });

    final result = await _bookingService.getClinicDoctors(clinicId);

    if (!mounted) return;

    setState(() {
      _isLoadingDoctors = false;
      switch (result) {
        case ApiSuccess(:final data):
          _doctors = data;
          if (_doctors.isNotEmpty) {
            _selectedDoctor = _doctors.first;
            _loadSlots();
          }
        case ApiFailure(:final exception):
          _doctorsError = exception.message;
          _doctors = [];
      }
    });
  }

  Future<void> _loadSlots() async {
    final clinicId = _getEffectiveClinicId();
    if (clinicId.isEmpty || _selectedDoctor == null) return;

    setState(() {
      _isLoadingSlots = true;
      _slotsError = null;
      _selectedSlot = null;
    });

    final result = await _bookingService.getAvailableSlots(
      clinicId: clinicId,
      doctorId: _selectedDoctor!.id,
      date: _formattedDate,
    );

    if (!mounted) return;

    setState(() {
      _isLoadingSlots = false;
      switch (result) {
        case ApiSuccess(:final data):
          _slots = data;
        case ApiFailure(:final exception):
          _slotsError = exception.message;
          _slots = [];
      }
    });
  }

  Future<void> _selectDate() async {
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

  Future<void> _handleSubmit() async {
    final strings = LocalizedStrings.of(context);

    if (!widget.user.hasPermission('booking.create')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.queueUnauthorizedMessage),
          backgroundColor: AafiyaColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_selectedDoctor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.selectDoctorLabel),
          backgroundColor: AafiyaColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.selectTimeSlotLabel),
          backgroundColor: AafiyaColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    final clinicId = _getEffectiveClinicId();
    if (clinicId.isEmpty) return;

    setState(() {
      _isSubmitting = true;
    });

    final result = await _bookingService.createAppointment(
      clinicId: clinicId,
      doctorId: _selectedDoctor!.id,
      appointmentDate: _formattedDate,
      timeSlot: _selectedSlot!.timeSlot,
      patientName: _nameController.text.trim(),
      patientPhone: _phoneController.text.trim(),
      patientId: widget.initialPatient?.id,
      patientMrn: _mrnController.text.trim().isNotEmpty ? _mrnController.text.trim() : null,
      notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
    );

    if (!mounted) return;

    setState(() {
      _isSubmitting = false;
    });

    switch (result) {
      case ApiSuccess(:final data):
        _showSuccessDialog(data);
      case ApiFailure(:final exception):
        final message = exception.message.toLowerCase();
        if (message.contains('slot') || message.contains('capacity') || message.contains('complet') || message.contains('ممتلئ')) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(strings.slotAlreadyFullError),
              backgroundColor: AafiyaColors.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
          _loadSlots();
        } else if (message.contains('duplicate') || message.contains('already has')) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(strings.duplicateBookingError),
              backgroundColor: AafiyaColors.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(exception.message),
              backgroundColor: AafiyaColors.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
    }
  }

  void _showSuccessDialog(Appointment appointment) {
    final strings = LocalizedStrings.of(context);

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AafiyaRadius.lg)),
        title: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: AafiyaColors.healingGreen, size: 28),
            const SizedBox(width: AafiyaSpacing.sm),
            Expanded(
              child: Text(
                strings.bookingSuccessTitle,
                style: AafiyaTypography.titleMedium.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              strings.bookingSuccessMessage,
              style: AafiyaTypography.bodyMedium,
            ),
            const SizedBox(height: AafiyaSpacing.md),
            Container(
              padding: const EdgeInsets.all(AafiyaSpacing.md),
              decoration: BoxDecoration(
                color: AafiyaColors.lightBackground,
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                border: Border.all(color: AafiyaColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (appointment.bookingReference.isNotEmpty) ...[
                    Text(
                      strings.bookingReferenceLabel,
                      style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
                    ),
                    Text(
                      appointment.bookingReference,
                      style: AafiyaTypography.bodyLarge.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AafiyaColors.healingGreen,
                        letterSpacing: 1.1,
                      ),
                    ),
                    const Divider(height: AafiyaSpacing.md, color: AafiyaColors.border),
                  ],
                  _buildDetailRow(strings.selectDoctorLabel, _selectedDoctor?.name ?? ''),
                  const SizedBox(height: 4),
                  _buildDetailRow(strings.selectDateLabel, _formattedDate),
                  const SizedBox(height: 4),
                  _buildDetailRow(strings.selectTimeSlotLabel, _selectedSlot?.timeSlot ?? ''),
                  const SizedBox(height: 4),
                  _buildDetailRow(strings.patientNameLabel, _nameController.text.trim()),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _resetForAnotherBooking();
            },
            child: Text(strings.bookAnotherAction),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.healingGreen,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop(true);
            },
            child: Text(strings.backToQueueAction),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
        ),
        Text(
          value,
          style: AafiyaTypography.caption.copyWith(fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  void _resetForAnotherBooking() {
    setState(() {
      _selectedSlot = null;
      if (!_isReturnVisit) {
        _nameController.clear();
        _phoneController.clear();
        _mrnController.clear();
      }
      _notesController.clear();
    });
    _loadSlots();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    final canCreateBooking = widget.user.hasPermission('booking.create');
    if (!canCreateBooking) {
      return Scaffold(
        appBar: AafiyaAppBar(
          title: strings.assistantBookingTitle,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: AafiyaSpacing.insetScreen,
            child: AafiyaErrorView(
              title: strings.errorTitle,
              message: strings.queueUnauthorizedMessage,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.assistantBookingTitle,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: AafiyaSpacing.insetScreen,
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Badge indicating Return Visit vs Walk-in
              _buildTypeBadge(strings),
              const SizedBox(height: AafiyaSpacing.md),

              // Section 1: Doctor Selection
              _buildDoctorSelector(strings),
              const SizedBox(height: AafiyaSpacing.md),

              // Section 2: Date Picker
              _buildDatePicker(strings),
              const SizedBox(height: AafiyaSpacing.md),

              // Section 3: Time Slot Grid
              _buildSlotSection(strings),
              const SizedBox(height: AafiyaSpacing.lg),

              // Section 4: Patient Info Form
              _buildPatientForm(strings),
              const SizedBox(height: AafiyaSpacing.xl),

              // Section 5: Submit Button
              ElevatedButton(
                key: const ValueKey('confirm_booking_button'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AafiyaColors.healingGreen,
                  foregroundColor: AafiyaColors.pureWhite,
                  padding: const EdgeInsets.symmetric(vertical: AafiyaSpacing.md),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AafiyaRadius.md),
                  ),
                ),
                onPressed: _isSubmitting ? null : _handleSubmit,
                child: _isSubmitting
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AafiyaColors.pureWhite,
                            ),
                          ),
                          const SizedBox(width: AafiyaSpacing.sm),
                          Text(strings.bookingInProgress),
                        ],
                      )
                    : Text(
                        strings.confirmBookingButton,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.pureWhite,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
              const SizedBox(height: AafiyaSpacing.xxl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeBadge(LocalizedStrings strings) {
    final isReturn = _isReturnVisit;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AafiyaSpacing.md, vertical: 8),
      decoration: BoxDecoration(
        color: isReturn
            ? AafiyaColors.healthBlue.withValues(alpha: 0.1)
            : AafiyaColors.healingGreen.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        border: Border.all(
          color: isReturn ? AafiyaColors.healthBlue : AafiyaColors.healingGreen,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isReturn ? Icons.repeat_rounded : Icons.person_add_alt_1_rounded,
            color: isReturn ? AafiyaColors.healthBlue : AafiyaColors.healingGreen,
            size: 20,
          ),
          const SizedBox(width: AafiyaSpacing.sm),
          Text(
            isReturn ? strings.returnVisitPatientBadge : strings.walkInPatientBadge,
            style: AafiyaTypography.bodyMedium.copyWith(
              color: isReturn ? AafiyaColors.healthBlue : AafiyaColors.healingGreen,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDoctorSelector(LocalizedStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          strings.selectDoctorLabel,
          style: AafiyaTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: AafiyaSpacing.xs),
        if (_isLoadingDoctors)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: AafiyaSpacing.sm),
            child: LinearProgressIndicator(color: AafiyaColors.healingGreen),
          )
        else if (_doctorsError != null)
          Container(
            padding: const EdgeInsets.all(AafiyaSpacing.sm),
            decoration: BoxDecoration(
              color: AafiyaColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AafiyaColors.error, size: 18),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _doctorsError!,
                    style: AafiyaTypography.caption.copyWith(color: AafiyaColors.error),
                  ),
                ),
                TextButton(
                  onPressed: _loadDoctors,
                  child: Text(strings.retry),
                ),
              ],
            ),
          )
        else if (_doctors.isEmpty)
          Text(
            strings.noDoctorsAvailable,
            style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
          )
        else
          DropdownButtonFormField<ClinicDoctorStaff>(
            key: ValueKey('doctor_dropdown_${_selectedDoctor?.id}'),
            initialValue: _selectedDoctor,
            isExpanded: true,
            decoration: InputDecoration(
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: AafiyaSpacing.md,
                vertical: AafiyaSpacing.sm,
              ),
            ),
            items: _doctors.map((doc) {
              return DropdownMenuItem<ClinicDoctorStaff>(
                value: doc,
                child: Text(doc.name),
              );
            }).toList(),
            onChanged: (doctor) {
              if (doctor != null && doctor != _selectedDoctor) {
                setState(() {
                  _selectedDoctor = doctor;
                });
                _loadSlots();
              }
            },
          ),
      ],
    );
  }

  Widget _buildDatePicker(LocalizedStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          strings.selectDateLabel,
          style: AafiyaTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: AafiyaSpacing.xs),
        InkWell(
          key: const ValueKey('date_picker_button'),
          onTap: _selectDate,
          borderRadius: BorderRadius.circular(AafiyaRadius.md),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AafiyaSpacing.md,
              vertical: AafiyaSpacing.md,
            ),
            decoration: BoxDecoration(
              border: Border.all(color: AafiyaColors.border),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_rounded,
                      size: 18,
                      color: AafiyaColors.healingGreen,
                    ),
                    const SizedBox(width: AafiyaSpacing.sm),
                    Text(
                      _formattedDate,
                      style: AafiyaTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const Icon(
                  Icons.arrow_drop_down_rounded,
                  color: AafiyaColors.secondaryText,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSlotSection(LocalizedStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          strings.selectTimeSlotLabel,
          style: AafiyaTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: AafiyaSpacing.xs),
        if (_slotsError != null)
          Container(
            padding: const EdgeInsets.all(AafiyaSpacing.sm),
            decoration: BoxDecoration(
              color: AafiyaColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AafiyaColors.error, size: 18),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _slotsError!,
                    style: AafiyaTypography.caption.copyWith(color: AafiyaColors.error),
                  ),
                ),
                TextButton(
                  onPressed: _loadSlots,
                  child: Text(strings.retry),
                ),
              ],
            ),
          )
        else
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
      ],
    );
  }

  Widget _buildPatientForm(LocalizedStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Patient Name
        TextFormField(
          key: const ValueKey('patient_name_field'),
          controller: _nameController,
          decoration: InputDecoration(
            labelText: strings.patientNameLabel,
            prefixIcon: const Icon(Icons.person_rounded, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AafiyaRadius.md)),
          ),
          validator: (val) {
            if (val == null || val.trim().isEmpty) {
              return strings.patientNameRequired;
            }
            if (val.trim().length < 2) {
              return strings.patientNameRequired;
            }
            return null;
          },
        ),
        const SizedBox(height: AafiyaSpacing.md),

        // Patient Phone
        TextFormField(
          key: const ValueKey('patient_phone_field'),
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: strings.patientPhoneRequired,
            prefixIcon: const Icon(Icons.phone_rounded, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AafiyaRadius.md)),
          ),
          validator: (val) {
            if (val == null || val.trim().isEmpty) {
              return strings.patientPhoneRequired;
            }
            final cleaned = val.replaceAll(RegExp(r'[\s\-\(\)]'), '');
            if (cleaned.length < 9) {
              return strings.patientPhoneInvalid;
            }
            return null;
          },
        ),
        const SizedBox(height: AafiyaSpacing.md),

        // MRN (optional or prefilled)
        TextFormField(
          key: const ValueKey('patient_mrn_field'),
          controller: _mrnController,
          readOnly: _isReturnVisit,
          decoration: InputDecoration(
            labelText: strings.patientMrnLabel,
            prefixIcon: const Icon(Icons.badge_rounded, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AafiyaRadius.md)),
            helperText: _isReturnVisit ? strings.returnVisitPatientBadge : null,
          ),
        ),
        const SizedBox(height: AafiyaSpacing.md),

        // Notes
        TextFormField(
          key: const ValueKey('booking_notes_field'),
          controller: _notesController,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: strings.bookingNotesLabel,
            hintText: strings.bookingNotesHint,
            prefixIcon: const Icon(Icons.note_alt_outlined, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AafiyaRadius.md)),
          ),
        ),
      ],
    );
  }
}

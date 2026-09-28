import 'dart:async';
import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/bc_booking_ticket_sheet.dart';
import '../widgets/slot_selection_grid.dart';
import 'bc_quota_screen.dart';

/// AAFIYA Pro — Booking Center Operational Appointment Booking Flow (TASK-05-04).
///
/// Implements a controlled 4-step wizard:
/// 1. Patient Selection: Registered Patient Directory Lookup vs Guest Patient Form.
/// 2. Doctor & Clinic Discovery: Search doctors, inspect specialty/verification, select clinic.
/// 3. Date & Slot Capacity: Real-time slot availability via [SlotSelectionGrid].
/// 4. Review & Confirmation: Quota lifecycle transparency, submit to backend, ticket presentation.
class BcAppointmentBookingScreen extends StatefulWidget {
  const BcAppointmentBookingScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.apiClient,
    this.bookingCenterService,
    this.initialQuotaBalance,
    this.onBookingSuccess,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final ApiClient? apiClient;
  final BookingCenterService? bookingCenterService;
  final int? initialQuotaBalance;
  final ValueChanged<Appointment>? onBookingSuccess;

  @override
  State<BcAppointmentBookingScreen> createState() =>
      _BcAppointmentBookingScreenState();
}

class _BcAppointmentBookingScreenState extends State<BcAppointmentBookingScreen> {
  late final ApiClient _apiClient;
  late final BookingCenterService _service;

  int _currentStep = 0;

  // Step 1: Patient
  bool _isRegisteredPatient = true;
  final _patientSearchController = TextEditingController();
  Timer? _searchDebounce;
  bool _isSearchingPatients = false;
  List<PatientSearchResult> _patientResults = [];
  String? _patientSearchError;
  PatientSearchResult? _selectedPatient;

  final _guestFormKey = GlobalKey<FormState>();
  final _guestNameController = TextEditingController();
  final _guestPhoneController = TextEditingController();
  final _guestMrnController = TextEditingController();
  final _notesController = TextEditingController();

  // Step 2: Doctor & Clinic
  final _doctorSearchController = TextEditingController();
  bool _isSearchingDoctors = false;
  List<Doctor> _doctors = [];
  String? _doctorsError;
  Doctor? _selectedDoctor;
  DoctorClinicAffiliation? _selectedClinic;

  // Step 3: Date & Slot
  DateTime _selectedDate = DateTime.now();
  bool _isLoadingSlots = false;
  List<AppointmentSlot> _slots = [];
  AppointmentSlot? _selectedSlot;
  String? _slotsError;

  // Step 4: Submission & Quota
  int? _quotaBalance;
  bool _isSubmitting = false;

  String get _formattedDate =>
      '${_selectedDate.year.toString().padLeft(4, '0')}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? widget.sessionManager.apiClient;
    _service =
        widget.bookingCenterService ?? BookingCenterService(apiClient: _apiClient);
    _quotaBalance = widget.initialQuotaBalance;
    _fetchQuota();
    _loadDoctors();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _patientSearchController.dispose();
    _guestNameController.dispose();
    _guestPhoneController.dispose();
    _guestMrnController.dispose();
    _notesController.dispose();
    _doctorSearchController.dispose();
    super.dispose();
  }

  Future<void> _fetchQuota() async {
    final result = await _service.getQuotaBalance();
    if (!mounted) return;
    if (result is ApiSuccess<BookingCenterQuota>) {
      setState(() {
        _quotaBalance = result.data.quotaBalance;
      });
    }
  }

  // --- Step 1: Patient Search ---
  void _onPatientSearchChanged(String query) {
    _searchDebounce?.cancel();
    final trimmed = query.trim();
    if (trimmed.length < 2) {
      setState(() {
        _patientResults = [];
        _patientSearchError = null;
        _isSearchingPatients = false;
      });
      return;
    }

    _searchDebounce = Timer(const Duration(milliseconds: 350), () async {
      if (!mounted) return;
      setState(() {
        _isSearchingPatients = true;
        _patientSearchError = null;
      });

      final result = await _service.searchPatients(query: trimmed);
      if (!mounted) return;

      setState(() {
        _isSearchingPatients = false;
        switch (result) {
          case ApiSuccess(:final data):
            _patientResults = data;
            _patientSearchError = null;
          case ApiFailure(:final exception):
            _patientSearchError = exception.message;
            _patientResults = [];
        }
      });
    });
  }

  // --- Step 2: Doctor Search ---
  Future<void> _loadDoctors([String? query]) async {
    setState(() {
      _isSearchingDoctors = true;
      _doctorsError = null;
    });

    final result = await _service.searchDoctors(search: query);
    if (!mounted) return;

    setState(() {
      _isSearchingDoctors = false;
      switch (result) {
        case ApiSuccess(:final data):
          _doctors = data;
          _doctorsError = null;
        case ApiFailure(:final exception):
          _doctorsError = exception.message;
          _doctors = [];
      }
    });
  }

  // --- Step 3: Slots ---
  Future<void> _loadSlots() async {
    if (_selectedDoctor == null || _selectedClinic == null) return;

    setState(() {
      _isLoadingSlots = true;
      _slotsError = null;
      _selectedSlot = null;
    });

    final result = await _service.getAvailableSlots(
      clinicId: _selectedClinic!.id,
      doctorId: _selectedDoctor!.id,
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
        _selectedSlot = null;
      });
      _loadSlots();
    }
  }

  // --- Step 4: Submission ---
  Future<void> _handleSubmit() async {
    final strings = LocalizedStrings.of(context);

    // Validation
    final patientName = _isRegisteredPatient
        ? _selectedPatient?.fullName ?? ''
        : _guestNameController.text.trim();
    final patientPhone = _isRegisteredPatient
        ? _selectedPatient?.phone ?? ''
        : _guestPhoneController.text.trim();
    final patientMrn = _isRegisteredPatient
        ? _selectedPatient?.mrn
        : _guestMrnController.text.trim().isNotEmpty
            ? _guestMrnController.text.trim()
            : null;
    final patientId = _isRegisteredPatient ? _selectedPatient?.id : null;

    if (patientName.isEmpty || patientPhone.isEmpty) {
      _showErrorSnackbar(strings.fieldRequired);
      return;
    }

    if (_selectedDoctor == null || _selectedClinic == null) {
      _showErrorSnackbar(strings.selectClinicPrompt);
      return;
    }

    if (_selectedSlot == null) {
      _showErrorSnackbar(strings.selectSlotPrompt);
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final result = await _service.createAppointment(
      clinicId: _selectedClinic!.id,
      doctorId: _selectedDoctor!.id,
      appointmentDate: _formattedDate,
      timeSlot: _selectedSlot!.timeSlot,
      patientName: patientName,
      patientPhone: patientPhone,
      patientId: patientId,
      patientMrn: patientMrn,
      notes: _notesController.text.trim().isNotEmpty
          ? _notesController.text.trim()
          : null,
    );

    if (!mounted) return;

    setState(() {
      _isSubmitting = false;
    });

    switch (result) {
      case ApiSuccess(:final data):
        widget.onBookingSuccess?.call(data);
        _showSuccessSheet(data);
      case ApiFailure(:final exception):
        final msg = exception.message.toLowerCase();
        if (msg.contains('quota') || msg.contains('حصة') || msg.contains('وحدات')) {
          _showQuotaErrorDialog();
          _fetchQuota();
        } else if (msg.contains('capacity') || msg.contains('ممتلئ') || msg.contains('السعة')) {
          _showErrorSnackbar(strings.slotAlreadyFullError);
          _loadSlots();
        } else if (msg.contains('duplicate') || msg.contains('نشط بالفعل') || msg.contains('patient_phone')) {
          _showErrorSnackbar(strings.duplicateBookingError);
        } else {
          _showErrorSnackbar(exception.message);
        }
    }
  }

  void _showErrorSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AafiyaColors.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showQuotaErrorDialog() {
    final strings = LocalizedStrings.of(context);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                color: AafiyaColors.warning, size: 28),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                strings.insufficientQuotaBookingError,
                style: AafiyaTypography.titleMedium
                    .copyWith(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          strings.rechargeQuotaPrompt,
          style: AafiyaTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => BcQuotaScreen(
                    sessionManager: widget.sessionManager,
                    user: widget.user,
                    bookingCenterService: _service,
                    apiClient: widget.apiClient,
                    onBackToDashboard: () => Navigator.of(context).pop(),
                  ),
                ),
              ).then((_) => _fetchQuota());
            },
            child: Text(strings.purchaseRequest),
          ),
        ],
      ),
    );
  }

  void _showSuccessSheet(Appointment appointment) {
    BcBookingTicketSheet.show(
      context,
      appointment: appointment,
      onBookAnother: () {
        setState(() {
          _currentStep = 0;
          _selectedPatient = null;
          _guestNameController.clear();
          _guestPhoneController.clear();
          _guestMrnController.clear();
          _notesController.clear();
          _selectedSlot = null;
        });
        _fetchQuota();
      },
    );
  }

  void _nextStep() {
    final strings = LocalizedStrings.of(context);
    if (_currentStep == 0) {
      if (_isRegisteredPatient && _selectedPatient == null) {
        _showErrorSnackbar(strings.searchPatientPlaceholder);
        return;
      }
      if (!_isRegisteredPatient && !_guestFormKey.currentState!.validate()) {
        return;
      }
    } else if (_currentStep == 1) {
      if (_selectedDoctor == null) {
        _showErrorSnackbar(strings.searchDoctorPlaceholder);
        return;
      }
      if (_selectedClinic == null) {
        _showErrorSnackbar(strings.selectClinicPrompt);
        return;
      }
      _loadSlots();
    } else if (_currentStep == 2) {
      if (_selectedSlot == null) {
        _showErrorSnackbar(strings.selectSlotPrompt);
        return;
      }
    }

    setState(() {
      _currentStep = (_currentStep + 1).clamp(0, 3);
    });
  }

  void _previousStep() {
    setState(() {
      _currentStep = (_currentStep - 1).clamp(0, 3);
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.newBookingAction,
        leading: BackButton(
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Step Progress Indicator
          _buildStepHeader(strings),
          const Divider(height: 1),

          // Step Body
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: switch (_currentStep) {
                0 => _buildStep1Patient(strings),
                1 => _buildStep2DoctorClinic(strings),
                2 => _buildStep3DateSlot(strings),
                3 => _buildStep4Review(strings),
                _ => const SizedBox.shrink(),
              },
            ),
          ),

          // Bottom Step Navigation Bar
          _buildBottomNavigation(strings),
        ],
      ),
    );
  }

  Widget _buildStepHeader(LocalizedStrings strings) {
    final steps = [
      strings.patientStepTitle,
      strings.doctorClinicStepTitle,
      strings.dateTimeStepTitle,
      strings.reviewStepTitle,
    ];

    return Container(
      color: AafiyaColors.pureWhite,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: List.generate(steps.length, (index) {
          final isCompleted = _currentStep > index;
          final isCurrent = _currentStep == index;

          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: isCompleted
                              ? AafiyaColors.healingGreen
                              : isCurrent
                                  ? AafiyaColors.healthBlue
                                  : AafiyaColors.lightBackground,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isCurrent
                                ? AafiyaColors.healthBlue
                                : AafiyaColors.border,
                            width: 1.5,
                          ),
                        ),
                        child: Center(
                          child: isCompleted
                              ? const Icon(Icons.check_rounded,
                                  size: 16, color: AafiyaColors.pureWhite)
                              : Text(
                                  '${index + 1}',
                                  style: AafiyaTypography.caption.copyWith(
                                    color: isCurrent
                                        ? AafiyaColors.pureWhite
                                        : AafiyaColors.secondaryText,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        steps[index],
                        style: AafiyaTypography.caption.copyWith(
                          fontSize: 11,
                          fontWeight:
                              isCurrent ? FontWeight.bold : FontWeight.normal,
                          color: isCurrent
                              ? AafiyaColors.healthBlue
                              : AafiyaColors.secondaryText,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                if (index < steps.length - 1)
                  Container(
                    width: 12,
                    height: 2,
                    margin: const EdgeInsets.only(bottom: 18),
                    color: isCompleted
                        ? AafiyaColors.healingGreen
                        : AafiyaColors.border,
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  // --- STEP 1: PATIENT ---
  Widget _buildStep1Patient(LocalizedStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Toggle: Registered vs Guest
        Row(
          children: [
            Expanded(
              child: ChoiceChip(
                label: Center(child: Text(strings.registeredPatientTab)),
                selected: _isRegisteredPatient,
                onSelected: (val) {
                  setState(() {
                    _isRegisteredPatient = true;
                  });
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ChoiceChip(
                label: Center(child: Text(strings.guestPatientTab)),
                selected: !_isRegisteredPatient,
                onSelected: (val) {
                  setState(() {
                    _isRegisteredPatient = false;
                  });
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        if (_isRegisteredPatient) ...[
          if (_selectedPatient == null) ...[
            TextField(
              controller: _patientSearchController,
              onChanged: _onPatientSearchChanged,
              decoration: InputDecoration(
                hintText: strings.searchPatientPlaceholder,
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _isSearchingPatients
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 12),

            if (_patientSearchError != null)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AafiyaColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _patientSearchError!,
                  style: AafiyaTypography.caption
                      .copyWith(color: AafiyaColors.error),
                ),
              ),

            if (_patientResults.isEmpty &&
                !_isSearchingPatients &&
                _patientSearchController.text.trim().length >= 2)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    strings.noPatientsFound,
                    style: AafiyaTypography.bodyMedium
                        .copyWith(color: AafiyaColors.secondaryText),
                  ),
                ),
              ),

            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _patientResults.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final pat = _patientResults[index];
                return AafiyaCard(
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: AafiyaColors.lightBackground,
                      child: Icon(Icons.person_rounded,
                          color: AafiyaColors.healthBlue),
                    ),
                    title: Text(
                      pat.fullName,
                      style: AafiyaTypography.titleMedium
                          .copyWith(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      'MRN: ${pat.mrn} • ${pat.phone ?? ""}',
                      style: AafiyaTypography.caption,
                    ),
                    trailing: const Icon(Icons.check_circle_outline_rounded,
                        color: AafiyaColors.healthBlue),
                    onTap: () {
                      setState(() {
                        _selectedPatient = pat;
                      });
                    },
                  ),
                );
              },
            ),
          ] else ...[
            // Selected Patient Card
            AafiyaCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        strings.selectedPatientLabel,
                        style: AafiyaTypography.caption
                            .copyWith(color: AafiyaColors.secondaryText),
                      ),
                      TextButton.icon(
                        onPressed: () {
                          setState(() {
                            _selectedPatient = null;
                          });
                        },
                        icon: const Icon(Icons.edit_outlined, size: 16),
                        label: Text(strings.changePatientAction),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _selectedPatient!.fullName,
                    style: AafiyaTypography.titleLarge
                        .copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'MRN: ${_selectedPatient!.mrn}',
                    style: AafiyaTypography.bodyMedium
                        .copyWith(color: AafiyaColors.secondaryText),
                  ),
                  if (_selectedPatient!.phone != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      '${strings.phoneLabel}: ${_selectedPatient!.phone}',
                      style: AafiyaTypography.bodyMedium,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ] else ...[
          // Guest Patient Form
          Form(
            key: _guestFormKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  controller: _guestNameController,
                  decoration: InputDecoration(
                    labelText: strings.fullNameLabel,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return strings.fieldRequired;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _guestPhoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: strings.phoneLabel,
                    hintText: '0555123456',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return strings.fieldRequired;
                    }
                    final clean = val.trim();
                    if (clean.length < 9) {
                      return strings.invalidPhone;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _guestMrnController,
                  decoration: InputDecoration(
                    labelText: 'رقم الملف الطبي MRN (اختياري)',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),

        // Optional Notes Field
        TextField(
          controller: _notesController,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: strings.optionalNotes,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
      ],
    );
  }

  // --- STEP 2: DOCTOR & CLINIC ---
  Widget _buildStep2DoctorClinic(LocalizedStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _doctorSearchController,
          onSubmitted: (q) => _loadDoctors(q),
          decoration: InputDecoration(
            hintText: strings.searchDoctorPlaceholder,
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: IconButton(
              icon: const Icon(Icons.arrow_forward_rounded),
              onPressed: () => _loadDoctors(_doctorSearchController.text),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
        const SizedBox(height: 12),

        if (_isSearchingDoctors)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator()),
          ),

        if (_doctorsError != null)
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AafiyaColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _doctorsError!,
              style:
                  AafiyaTypography.caption.copyWith(color: AafiyaColors.error),
            ),
          ),

        if (_doctors.isEmpty && !_isSearchingDoctors)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Text(
                strings.noDoctorsFound,
                style: AafiyaTypography.bodyMedium
                    .copyWith(color: AafiyaColors.secondaryText),
              ),
            ),
          ),

        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _doctors.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final doc = _doctors[index];
            final isSelected = _selectedDoctor?.id == doc.id;

            return AafiyaCard(
              backgroundColor: isSelected
                  ? AafiyaColors.healthBlue.withValues(alpha: 0.05)
                  : AafiyaColors.pureWhite,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AafiyaColors.healthBlue
                              .withValues(alpha: 0.15),
                          child: const Icon(Icons.medical_services_rounded,
                              color: AafiyaColors.healthBlue),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    doc.name,
                                    style: AafiyaTypography.titleMedium
                                        .copyWith(fontWeight: FontWeight.bold),
                                  ),
                                  if (doc.isVerified) ...[
                                    const SizedBox(width: 4),
                                    const Icon(Icons.verified_rounded,
                                        size: 16,
                                        color: AafiyaColors.healthBlue),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                doc.specialty,
                                style: AafiyaTypography.caption.copyWith(
                                    color: AafiyaColors.secondaryText),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          key: Key('doctor_radio_${doc.id}'),
                          icon: Icon(
                            isSelected
                                ? Icons.radio_button_checked_rounded
                                : Icons.radio_button_off_rounded,
                            color: isSelected
                                ? AafiyaColors.healthBlue
                                : AafiyaColors.secondaryText,
                          ),
                          onPressed: () {
                            setState(() {
                              _selectedDoctor = doc;
                              if (doc.clinics.isNotEmpty) {
                                _selectedClinic = doc.clinics.first;
                              } else {
                                _selectedClinic = null;
                              }
                            });
                          },
                        ),
                      ],
                    ),

                    // Clinics Affiliations
                    if (isSelected && doc.clinics.isNotEmpty) ...[
                      const Divider(height: 16),
                      Text(
                        strings.selectClinicPrompt,
                        style: AafiyaTypography.caption
                            .copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        children: doc.clinics.map((clinic) {
                          final isClinicSelected =
                              _selectedClinic?.id == clinic.id;
                          return ChoiceChip(
                            label: Text(
                                '${clinic.name} (${clinic.wilaya ?? ""})'),
                            selected: isClinicSelected,
                            onSelected: (val) {
                              setState(() {
                                _selectedClinic = clinic;
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  // --- STEP 3: DATE & SLOT CAPACITY ---
  Widget _buildStep3DateSlot(LocalizedStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Date Selector Bar
        AafiyaCard(
          padding: const EdgeInsets.all(12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.calendar_month_rounded,
                      color: AafiyaColors.healthBlue),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        strings.selectDatePrompt,
                        style: AafiyaTypography.caption
                            .copyWith(color: AafiyaColors.secondaryText),
                      ),
                      Text(
                        _formattedDate,
                        style: AafiyaTypography.titleMedium
                            .copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
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
          strings.selectSlotPrompt,
          style: AafiyaTypography.titleMedium
              .copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),

        if (_slotsError != null) ...[
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AafiyaColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded,
                    color: AafiyaColors.error, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _slotsError!,
                    style: AafiyaTypography.caption
                        .copyWith(color: AafiyaColors.error),
                  ),
                ),
                TextButton(
                  onPressed: _loadSlots,
                  child: Text(strings.retry),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Slot Selection Grid
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

  // --- STEP 4: REVIEW & SUBMIT ---
  Widget _buildStep4Review(LocalizedStrings strings) {
    final patientName = _isRegisteredPatient
        ? _selectedPatient?.fullName ?? ''
        : _guestNameController.text.trim();
    final patientPhone = _isRegisteredPatient
        ? _selectedPatient?.phone ?? ''
        : _guestPhoneController.text.trim();

    final isZeroQuota = (_quotaBalance ?? 1) <= 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Quota Warning if 0
        if (isZeroQuota) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AafiyaColors.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: AafiyaColors.warning.withValues(alpha: 0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded,
                        color: AafiyaColors.warning, size: 24),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        strings.zeroQuotaWarning,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AafiyaColors.warning,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  strings.rechargeQuotaPrompt,
                  style: AafiyaTypography.caption,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Canonical Quota Notice Banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AafiyaColors.healthBlue.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color: AafiyaColors.healthBlue.withValues(alpha: 0.25)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline_rounded,
                  color: AafiyaColors.healthBlue, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strings.bookingNoticeTitle,
                      style: AafiyaTypography.bodyMedium.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AafiyaColors.healthBlue,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      strings.bookingNoticeBody,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.primaryText,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Summary Card
        AafiyaCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ملخص الموعد المطلوب',
                style: AafiyaTypography.titleMedium
                    .copyWith(fontWeight: FontWeight.bold),
              ),
              const Divider(height: 16),
              _buildSummaryRow(
                icon: Icons.person_rounded,
                label: 'المريض',
                value: patientName,
                extra: 'الهاتف: $patientPhone',
              ),
              const Divider(height: 16),
              _buildSummaryRow(
                icon: Icons.medical_services_rounded,
                label: 'الطبيب المعالج',
                value: _selectedDoctor?.name ?? '',
                extra: _selectedDoctor?.specialty,
              ),
              const Divider(height: 16),
              _buildSummaryRow(
                icon: Icons.local_hospital_rounded,
                label: 'العيادة',
                value: _selectedClinic?.name ?? '',
                extra: _selectedClinic?.wilaya,
              ),
              const Divider(height: 16),
              _buildSummaryRow(
                icon: Icons.access_time_filled_rounded,
                label: 'تاريخ وفترة الموعد',
                value: _formattedDate,
                extra: 'الفترة: ${_selectedSlot?.timeSlot ?? ""}',
              ),
              if (_notesController.text.trim().isNotEmpty) ...[
                const Divider(height: 16),
                _buildSummaryRow(
                  icon: Icons.notes_rounded,
                  label: 'ملاحظات',
                  value: _notesController.text.trim(),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow({
    required IconData icon,
    required String label,
    required String value,
    String? extra,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AafiyaColors.healthBlue),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AafiyaTypography.caption
                    .copyWith(color: AafiyaColors.secondaryText),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: AafiyaTypography.bodyMedium
                    .copyWith(fontWeight: FontWeight.w600),
              ),
              if (extra != null && extra.isNotEmpty) ...[
                const SizedBox(height: 1),
                Text(
                  extra,
                  style: AafiyaTypography.caption
                      .copyWith(color: AafiyaColors.secondaryText),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  // --- Bottom Navigation ---
  Widget _buildBottomNavigation(LocalizedStrings strings) {
    final isLastStep = _currentStep == 3;

    return Container(
      color: AafiyaColors.pureWhite,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: SafeArea(
        child: Row(
          children: [
            if (_currentStep > 0) ...[
              OutlinedButton(
                key: const Key('wizard_back_button'),
                onPressed: _isSubmitting ? null : _previousStep,
                style: OutlinedButton.styleFrom(
                  minimumSize: Size.zero,
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(strings.previousStepAction),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: ElevatedButton(
                key: const Key('wizard_next_button'),
                onPressed: _isSubmitting
                    ? null
                    : isLastStep
                        ? _handleSubmit
                        : _nextStep,
                style: ElevatedButton.styleFrom(
                  backgroundColor: isLastStep
                      ? AafiyaColors.healingGreen
                      : AafiyaColors.healthBlue,
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
                        isLastStep
                            ? strings.confirmAndBookAction
                            : strings.nextStepAction,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AafiyaColors.pureWhite,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

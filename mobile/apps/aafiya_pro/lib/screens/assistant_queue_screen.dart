import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/check_in_sheet.dart';
import '../widgets/assistant_patient_search_sheet.dart';
import '../widgets/queue_patient_tile.dart';
import 'patient_summary_sheet.dart';
import 'assistant_booking_screen.dart';

enum AssistantQueueSubTab {
  waitingRoom,
  expectedCheckIn,
  pendingConfirmation,
}

enum AssistantDateFilterMode {
  today,
  specificDate,
  dateRange,
  allDates,
}

/// Live Waiting Room Queue & Operational Check-In / Attendance View for Doctor Assistants.
///
/// Features:
/// 1. Waiting Room: Patients who arrived and are physically in the waiting room (`status = attended`).
/// 2. Expected Arrivals: Patients with confirmed appointments awaiting arrival (`status = confirmed`).
/// 3. Pending Confirmation: Pending appointments requiring director/assistant confirmation (`status = pending`).
/// 4. Attendance Action: Mark confirmed patient as attended (`POST /api/v1/appointments/{id}/attend`).
/// 5. Confirmation Action: Confirm pending appointment (`POST /api/v1/appointments/{id}/confirm`).
/// 6. No-Show Action: Mark confirmed patient as no-show (`POST /api/v1/appointments/{id}/no-show`).
/// 7. Quick Check-In: Single-use QR token check-in (`POST /api/v1/appointments/check-in`).
/// 8. Clinic Patient Search: Lookup registered patients within clinic boundaries (`GET /api/v1/patients`).
/// 9. Server-Side Date & Doctor Filtering.
class AssistantQueueScreen extends StatefulWidget {
  const AssistantQueueScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.queueService,
    this.apiClient,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final AssistantQueueService? queueService;
  final ApiClient? apiClient;

  @override
  State<AssistantQueueScreen> createState() => _AssistantQueueScreenState();
}

class _AssistantQueueScreenState extends State<AssistantQueueScreen> {
  late final AssistantQueueService _queueService;
  late final ApiClient _apiClient;
  final ScrollController _scrollController = ScrollController();

  AssistantQueueSubTab _activeTab = AssistantQueueSubTab.waitingRoom;

  // Waiting Room state (status = attended)
  bool _isLoadingWaitingRoom = false;
  List<Appointment> _waitingRoomItems = [];
  int _waitingRoomPage = 1;
  bool _hasMoreWaitingRoom = false;
  String? _waitingRoomError;

  // Expected Check-In state (status = confirmed)
  bool _isLoadingExpected = false;
  List<Appointment> _expectedItems = [];
  int _expectedPage = 1;
  bool _hasMoreExpected = false;
  String? _expectedError;

  // Pending Confirmation state (status = pending)
  bool _isLoadingPending = false;
  List<Appointment> _pendingItems = [];
  int _pendingPage = 1;
  bool _hasMorePending = false;
  String? _pendingError;

  // Date Filtering state
  AssistantDateFilterMode _dateFilterMode = AssistantDateFilterMode.today;
  DateTime? _specificDate;
  DateTimeRange? _dateRange;

  // Doctor Filtering state
  static const String _allDoctorsSentinel = '__ALL_DOCTORS__';
  List<ClinicDoctorStaff> _clinicDoctors = [];
  String? _selectedDoctorId;

  // Mutating appointment ID (prevents double-tap)
  String? _processingAppointmentId;

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? widget.sessionManager.apiClient;
    _queueService = widget.queueService ?? AssistantQueueService(apiClient: _apiClient);

    _scrollController.addListener(_onScroll);

    if (widget.user.hasPermission('booking.manage_queue')) {
      _loadClinicDoctors();
      _loadQueueData();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
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
    final userClinicId = widget.user.clinic?.id;
    if (userClinicId != null && userClinicId.trim().isNotEmpty) {
      return userClinicId.trim();
    }
    return '';
  }

  Future<void> _loadClinicDoctors() async {
    final clinicId = _getEffectiveClinicId();
    if (clinicId.isEmpty) return;

    final bookingService = AssistantBookingService(apiClient: _apiClient);
    final result = await bookingService.getClinicDoctors(clinicId);

    if (!mounted) return;

    if (result is ApiSuccess<List<ClinicDoctorStaff>>) {
      setState(() {
        _clinicDoctors = result.data;
      });
    }
  }

  String _formatDate(DateTime dt) =>
      '${dt.year.toString().padLeft(4, '0')}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';

  (String? appointmentDate, String? fromDate, String? toDate) _getDateFilterParams() {
    switch (_dateFilterMode) {
      case AssistantDateFilterMode.today:
        return (_formatDate(DateTime.now()), null, null);
      case AssistantDateFilterMode.specificDate:
        return (_formatDate(_specificDate ?? DateTime.now()), null, null);
      case AssistantDateFilterMode.dateRange:
        if (_dateRange != null) {
          return (null, _formatDate(_dateRange!.start), _formatDate(_dateRange!.end));
        }
        return (_formatDate(DateTime.now()), null, null);
      case AssistantDateFilterMode.allDates:
        return (null, null, null);
    }
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final threshold = _scrollController.position.maxScrollExtent - 200;
    if (_scrollController.position.pixels >= threshold) {
      if (_activeTab == AssistantQueueSubTab.waitingRoom &&
          !_isLoadingWaitingRoom &&
          _hasMoreWaitingRoom) {
        _loadMoreWaitingRoom();
      } else if (_activeTab == AssistantQueueSubTab.expectedCheckIn &&
          !_isLoadingExpected &&
          _hasMoreExpected) {
        _loadMoreExpected();
      } else if (_activeTab == AssistantQueueSubTab.pendingConfirmation &&
          !_isLoadingPending &&
          _hasMorePending) {
        _loadMorePending();
      }
    }
  }

  Future<void> _loadQueueData() async {
    if (!widget.user.hasPermission('booking.manage_queue')) return;

    setState(() {
      _isLoadingWaitingRoom = true;
      _isLoadingExpected = true;
      _isLoadingPending = true;
      _waitingRoomError = null;
      _expectedError = null;
      _pendingError = null;
      _waitingRoomPage = 1;
      _expectedPage = 1;
      _pendingPage = 1;
    });

    final (appDate, fromDate, toDate) = _getDateFilterParams();
    final docId = _selectedDoctorId;

    final results = await Future.wait([
      _queueService.fetchQueue(
        appointmentDate: appDate,
        fromDate: fromDate,
        toDate: toDate,
        doctorId: docId,
        status: 'attended',
        page: 1,
        perPage: 15,
      ),
      _queueService.fetchQueue(
        appointmentDate: appDate,
        fromDate: fromDate,
        toDate: toDate,
        doctorId: docId,
        status: 'confirmed',
        page: 1,
        perPage: 15,
      ),
      _queueService.fetchQueue(
        appointmentDate: appDate,
        fromDate: fromDate,
        toDate: toDate,
        doctorId: docId,
        status: 'pending',
        page: 1,
        perPage: 15,
      ),
    ]);

    if (!mounted) return;

    final waitingResult = results[0];
    final expectedResult = results[1];
    final pendingResult = results[2];

    setState(() {
      _isLoadingWaitingRoom = false;
      _isLoadingExpected = false;
      _isLoadingPending = false;

      switch (waitingResult) {
        case ApiSuccess(:final data):
          _waitingRoomItems = List<Appointment>.from(data.items);
          _hasMoreWaitingRoom = data.hasMore;
        case ApiFailure(:final exception):
          _waitingRoomError = exception.message;
          _waitingRoomItems = [];
      }

      switch (expectedResult) {
        case ApiSuccess(:final data):
          _expectedItems = List<Appointment>.from(data.items);
          _hasMoreExpected = data.hasMore;
        case ApiFailure(:final exception):
          _expectedError = exception.message;
          _expectedItems = [];
      }

      switch (pendingResult) {
        case ApiSuccess(:final data):
          _pendingItems = List<Appointment>.from(data.items);
          _hasMorePending = data.hasMore;
        case ApiFailure(:final exception):
          _pendingError = exception.message;
          _pendingItems = [];
      }
    });
  }

  Future<void> _loadMoreWaitingRoom() async {
    if (_isLoadingWaitingRoom || !_hasMoreWaitingRoom) return;

    setState(() {
      _isLoadingWaitingRoom = true;
    });

    final (appDate, fromDate, toDate) = _getDateFilterParams();
    final docId = _selectedDoctorId;
    final nextPage = _waitingRoomPage + 1;

    final result = await _queueService.fetchQueue(
      appointmentDate: appDate,
      fromDate: fromDate,
      toDate: toDate,
      doctorId: docId,
      status: 'attended',
      page: nextPage,
      perPage: 15,
    );

    if (!mounted) return;

    setState(() {
      _isLoadingWaitingRoom = false;
      switch (result) {
        case ApiSuccess(:final data):
          _waitingRoomPage = nextPage;
          _waitingRoomItems.addAll(data.items);
          _hasMoreWaitingRoom = data.hasMore;
        case ApiFailure(:final exception):
          _waitingRoomError = exception.message;
      }
    });
  }

  Future<void> _loadMoreExpected() async {
    if (_isLoadingExpected || !_hasMoreExpected) return;

    setState(() {
      _isLoadingExpected = true;
    });

    final (appDate, fromDate, toDate) = _getDateFilterParams();
    final docId = _selectedDoctorId;
    final nextPage = _expectedPage + 1;

    final result = await _queueService.fetchQueue(
      appointmentDate: appDate,
      fromDate: fromDate,
      toDate: toDate,
      doctorId: docId,
      status: 'confirmed',
      page: nextPage,
      perPage: 15,
    );

    if (!mounted) return;

    setState(() {
      _isLoadingExpected = false;
      switch (result) {
        case ApiSuccess(:final data):
          _expectedPage = nextPage;
          _expectedItems.addAll(data.items);
          _hasMoreExpected = data.hasMore;
        case ApiFailure(:final exception):
          _expectedError = exception.message;
      }
    });
  }

  Future<void> _loadMorePending() async {
    if (_isLoadingPending || !_hasMorePending) return;

    setState(() {
      _isLoadingPending = true;
    });

    final (appDate, fromDate, toDate) = _getDateFilterParams();
    final docId = _selectedDoctorId;
    final nextPage = _pendingPage + 1;

    final result = await _queueService.fetchQueue(
      appointmentDate: appDate,
      fromDate: fromDate,
      toDate: toDate,
      doctorId: docId,
      status: 'pending',
      page: nextPage,
      perPage: 15,
    );

    if (!mounted) return;

    setState(() {
      _isLoadingPending = false;
      switch (result) {
        case ApiSuccess(:final data):
          _pendingPage = nextPage;
          _pendingItems.addAll(data.items);
          _hasMorePending = data.hasMore;
        case ApiFailure(:final exception):
          _pendingError = exception.message;
      }
    });
  }

  Future<void> _handleAttend(Appointment app) async {
    final strings = LocalizedStrings.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(strings.confirmAttendanceTitle),
        content: Text(
          '${strings.confirmAttendancePrompt}\n\n${strings.patientNameLabel}: ${app.patient.name ?? ""}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.healingGreen,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(strings.markAttendedAction),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _processingAppointmentId = app.id;
    });

    final result = await _queueService.attendAppointment(app.id);

    if (!mounted) return;

    setState(() {
      _processingAppointmentId = null;
    });

    switch (result) {
      case ApiSuccess(:final data):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.attendanceSuccessMessage),
            backgroundColor: AafiyaColors.healingGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() {
          _expectedItems.removeWhere((item) => item.id == app.id);
          _waitingRoomItems.insert(0, data);
        });

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

  Future<void> _handleConfirm(Appointment app) async {
    final strings = LocalizedStrings.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(strings.confirmAppointmentTitle),
        content: Text(
          '${strings.confirmAppointmentPrompt}\n\n${strings.patientNameLabel}: ${app.patient.name ?? ""}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.healingGreen,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(strings.confirmAppointmentAction),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _processingAppointmentId = app.id;
    });

    final result = await _queueService.confirmAppointment(app.id);

    if (!mounted) return;

    setState(() {
      _processingAppointmentId = null;
    });

    switch (result) {
      case ApiSuccess(:final data):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.appointmentConfirmedSuccess),
            backgroundColor: AafiyaColors.healingGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() {
          _pendingItems.removeWhere((item) => item.id == app.id);
          _expectedItems.insert(0, data);
        });

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

  Future<void> _handleNoShow(Appointment app) async {
    final strings = LocalizedStrings.of(context);

    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => _NoShowDialog(
        strings: strings,
        patientName: app.patient.name ?? '',
      ),
    );

    if (reason == null || !mounted) return;

    setState(() {
      _processingAppointmentId = app.id;
    });

    final result = await _queueService.markNoShow(app.id, reason: reason);

    if (!mounted) return;

    setState(() {
      _processingAppointmentId = null;
    });

    switch (result) {
      case ApiSuccess():
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.noShowSuccessMessage),
            backgroundColor: AafiyaColors.secondaryText,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() {
          _expectedItems.removeWhere((item) => item.id == app.id);
        });

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

  Future<void> _pickSpecificDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _specificDate ?? now,
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now.add(const Duration(days: 365)),
    );

    if (picked != null && mounted) {
      setState(() {
        _specificDate = picked;
        _dateRange = null;
        _dateFilterMode = AssistantDateFilterMode.specificDate;
      });
      _loadQueueData();
    }
  }

  Future<void> _pickDateRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      initialDateRange: _dateRange ??
          DateTimeRange(
            start: now,
            end: now.add(const Duration(days: 7)),
          ),
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now.add(const Duration(days: 365)),
    );

    if (picked != null && mounted) {
      setState(() {
        _dateRange = picked;
        _specificDate = null;
        _dateFilterMode = AssistantDateFilterMode.dateRange;
      });
      _loadQueueData();
    }
  }

  String _getDateFilterLabel(LocalizedStrings strings) {
    switch (_dateFilterMode) {
      case AssistantDateFilterMode.today:
        return strings.filterToday;
      case AssistantDateFilterMode.specificDate:
        return _specificDate != null ? _formatDate(_specificDate!) : strings.filterSpecificDate;
      case AssistantDateFilterMode.dateRange:
        return _dateRange != null
            ? '${_formatDate(_dateRange!.start)} - ${_formatDate(_dateRange!.end)}'
            : strings.filterDateRange;
      case AssistantDateFilterMode.allDates:
        return strings.filterAllDates;
    }
  }

  Widget _buildDoctorFilter(LocalizedStrings strings) {
    final selectedDoc = _clinicDoctors.where((d) => d.id == _selectedDoctorId).firstOrNull;
    final label = selectedDoc?.name ?? strings.filterAllDoctors;

    return PopupMenuButton<String>(
      key: const ValueKey('doctor_filter_button'),
      tooltip: strings.doctorFilterLabel,
      initialValue: _selectedDoctorId ?? _allDoctorsSentinel,
      onSelected: (val) {
        final docId = val == _allDoctorsSentinel ? null : val;
        if (_selectedDoctorId != docId) {
          setState(() {
            _selectedDoctorId = docId;
          });
          _loadQueueData();
        }
      },
      itemBuilder: (ctx) => [
        PopupMenuItem<String>(
          value: _allDoctorsSentinel,
          child: Row(
            children: [
              Icon(
                Icons.people_outline,
                size: 18,
                color: _selectedDoctorId == null ? AafiyaColors.healthBlue : AafiyaColors.secondaryText,
              ),
              const SizedBox(width: 8),
              Text(
                strings.filterAllDoctors,
                style: TextStyle(
                  fontWeight: _selectedDoctorId == null ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
        ..._clinicDoctors.map((doc) => PopupMenuItem<String>(
              value: doc.id,
              child: Row(
                children: [
                  Icon(
                    Icons.person_outline,
                    size: 18,
                    color: _selectedDoctorId == doc.id ? AafiyaColors.healthBlue : AafiyaColors.secondaryText,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      doc.name,
                      style: TextStyle(
                        fontWeight: _selectedDoctorId == doc.id ? FontWeight.bold : FontWeight.normal,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            )),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AafiyaColors.lightBackground,
          borderRadius: BorderRadius.circular(AafiyaRadius.md),
          border: Border.all(color: AafiyaColors.border),
        ),
        child: Row(
          children: [
            const Icon(Icons.person_outline, size: 16, color: AafiyaColors.secondaryText),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AafiyaColors.primaryText,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(Icons.arrow_drop_down, size: 18, color: AafiyaColors.secondaryText),
          ],
        ),
      ),
    );
  }

  Widget _buildDateFilter(LocalizedStrings strings) {
    final label = _getDateFilterLabel(strings);

    return PopupMenuButton<String>(
      key: const ValueKey('date_filter_button'),
      tooltip: strings.dateFilterLabel,
      onSelected: (action) async {
        switch (action) {
          case 'today':
            setState(() {
              _dateFilterMode = AssistantDateFilterMode.today;
              _specificDate = null;
              _dateRange = null;
            });
            _loadQueueData();
          case 'specific':
            await _pickSpecificDate();
          case 'range':
            await _pickDateRange();
          case 'all':
            setState(() {
              _dateFilterMode = AssistantDateFilterMode.allDates;
              _specificDate = null;
              _dateRange = null;
            });
            _loadQueueData();
        }
      },
      itemBuilder: (ctx) => [
        PopupMenuItem(
          value: 'today',
          child: Row(
            children: [
              Icon(
                Icons.today,
                size: 18,
                color: _dateFilterMode == AssistantDateFilterMode.today ? AafiyaColors.healthBlue : AafiyaColors.secondaryText,
              ),
              const SizedBox(width: 8),
              Text(strings.filterToday),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'specific',
          child: Row(
            children: [
              Icon(
                Icons.calendar_today,
                size: 18,
                color: _dateFilterMode == AssistantDateFilterMode.specificDate ? AafiyaColors.healthBlue : AafiyaColors.secondaryText,
              ),
              const SizedBox(width: 8),
              Text(strings.filterSpecificDate),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'range',
          child: Row(
            children: [
              Icon(
                Icons.date_range,
                size: 18,
                color: _dateFilterMode == AssistantDateFilterMode.dateRange ? AafiyaColors.healthBlue : AafiyaColors.secondaryText,
              ),
              const SizedBox(width: 8),
              Text(strings.filterDateRange),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'all',
          child: Row(
            children: [
              Icon(
                Icons.all_inclusive,
                size: 18,
                color: _dateFilterMode == AssistantDateFilterMode.allDates ? AafiyaColors.healthBlue : AafiyaColors.secondaryText,
              ),
              const SizedBox(width: 8),
              Text(strings.filterAllDates),
            ],
          ),
        ),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AafiyaColors.lightBackground,
          borderRadius: BorderRadius.circular(AafiyaRadius.md),
          border: Border.all(color: AafiyaColors.border),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_month_outlined, size: 16, color: AafiyaColors.secondaryText),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AafiyaColors.primaryText,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(Icons.arrow_drop_down, size: 18, color: AafiyaColors.secondaryText),
          ],
        ),
      ),
    );
  }

  void _openCheckInSheet() {
    CheckInSheet.show(
      context,
      queueService: _queueService,
      onCheckInSuccess: _loadQueueData,
    );
  }

  void _openPatientSearch() {
    AssistantPatientSearchSheet.show(
      context,
      queueService: _queueService,
      apiClient: _apiClient,
      sessionManager: widget.sessionManager,
      user: widget.user,
      onBookReturnVisit: (patient) => _openNewBooking(patient),
    );
  }

  Future<void> _openNewBooking([PatientSearchResult? initialPatient]) async {
    final booked = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => AssistantBookingScreen(
          sessionManager: widget.sessionManager,
          user: widget.user,
          apiClient: _apiClient,
          initialPatient: initialPatient,
        ),
      ),
    );

    if (booked == true && mounted) {
      _loadQueueData();
    }
  }

  void _openPatientSummary(Appointment app) {
    final patientId = app.patient.id;
    if (patientId == null) return;
    PatientSummarySheet.show(
      context,
      apiClient: _apiClient,
      patientId: patientId,
      patientName: app.patient.name ?? LocalizedStrings.of(context).patientNameLabel,
      mrn: app.patient.mrn,
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    // booking.manage_queue is the mandatory gate for queue management
    if (!widget.user.hasPermission('booking.manage_queue')) {
      return Scaffold(
        appBar: AppBar(
          title: Text(strings.assistantDashboardTitle),
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

    final canConfirmAttendance = widget.user.hasPermission('booking.confirm_attendance');
    final canCreateBooking = widget.user.hasPermission('booking.create');

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _loadQueueData,
        child: Column(
          children: [
            // Top Controls: Sub-Tabs, Filters & Action Buttons
            Container(
              color: AafiyaColors.pureWhite,
              padding: const EdgeInsets.symmetric(
                horizontal: AafiyaSpacing.lg,
                vertical: AafiyaSpacing.sm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    strings.assistantDashboardTitle,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AafiyaSpacing.sm),

                  // Filter Row: Doctor & Date
                  Row(
                    children: [
                      Expanded(child: _buildDoctorFilter(strings)),
                      const SizedBox(width: AafiyaSpacing.sm),
                      Expanded(child: _buildDateFilter(strings)),
                    ],
                  ),
                  const SizedBox(height: AafiyaSpacing.sm),

                  // 3 Sub-Tabs: Waiting Room, Expected Check-In, Pending Confirmation
                  Row(
                    children: [
                      // Sub-Tab: Waiting Room
                      Expanded(
                        child: _buildSubTabButton(
                          title: strings.waitingRoomTab,
                          count: _waitingRoomItems.length,
                          isSelected: _activeTab == AssistantQueueSubTab.waitingRoom,
                          accentColor: AafiyaColors.healingGreen,
                          onTap: () {
                            if (_activeTab != AssistantQueueSubTab.waitingRoom) {
                              setState(() {
                                _activeTab = AssistantQueueSubTab.waitingRoom;
                              });
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Sub-Tab: Expected Check-In
                      Expanded(
                        child: _buildSubTabButton(
                          title: strings.expectedCheckInTab,
                          count: _expectedItems.length,
                          isSelected: _activeTab == AssistantQueueSubTab.expectedCheckIn,
                          accentColor: AafiyaColors.healthBlue,
                          onTap: () {
                            if (_activeTab != AssistantQueueSubTab.expectedCheckIn) {
                              setState(() {
                                _activeTab = AssistantQueueSubTab.expectedCheckIn;
                              });
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Sub-Tab: Pending Confirmation
                      Expanded(
                        child: _buildSubTabButton(
                          title: strings.pendingConfirmationTab,
                          count: _pendingItems.length,
                          isSelected: _activeTab == AssistantQueueSubTab.pendingConfirmation,
                          accentColor: AafiyaColors.warning,
                          onTap: () {
                            if (_activeTab != AssistantQueueSubTab.pendingConfirmation) {
                              setState(() {
                                _activeTab = AssistantQueueSubTab.pendingConfirmation;
                              });
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AafiyaSpacing.sm),

                  // Action Buttons Row: Quick Check-In (gated) & Patient Search
                  Row(
                    children: [
                      if (canConfirmAttendance) ...[
                        // Quick Check-In Button
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AafiyaColors.healingGreen,
                              side: const BorderSide(color: AafiyaColors.healingGreen),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                              ),
                            ),
                            onPressed: _openCheckInSheet,
                            icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
                            label: Text(
                              strings.quickCheckInAction,
                              style: AafiyaTypography.caption.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AafiyaColors.healingGreen,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AafiyaSpacing.sm),
                      ],

                      // Patient Search Button
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AafiyaColors.primaryText,
                            side: const BorderSide(color: AafiyaColors.border),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AafiyaRadius.md),
                            ),
                          ),
                          onPressed: _openPatientSearch,
                          icon: const Icon(Icons.search_rounded, size: 18),
                          label: Text(
                            strings.assistantPatientsTab,
                            style: AafiyaTypography.caption.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  // New Booking Button (gated by booking.create)
                  if (canCreateBooking) ...[
                    const SizedBox(height: AafiyaSpacing.sm),
                    ElevatedButton.icon(
                      key: const ValueKey('new_booking_action_button'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AafiyaColors.healingGreen,
                        foregroundColor: AafiyaColors.pureWhite,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AafiyaRadius.md),
                        ),
                      ),
                      onPressed: () => _openNewBooking(),
                      icon: const Icon(Icons.add_rounded, size: 20),
                      label: Text(
                        strings.newBookingAction,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AafiyaColors.pureWhite,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Queue Content
            Expanded(
              child: _buildQueueContent(strings),
            ),
          ],
        ),
      ),
      floatingActionButton: canConfirmAttendance
          ? FloatingActionButton.extended(
              backgroundColor: AafiyaColors.healingGreen,
              foregroundColor: AafiyaColors.pureWhite,
              icon: const Icon(Icons.qr_code_scanner_rounded),
              label: Text(strings.submitCheckIn),
              onPressed: _openCheckInSheet,
            )
          : null,
    );
  }

  Widget _buildSubTabButton({
    required String title,
    required int count,
    required bool isSelected,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: isSelected ? accentColor.withValues(alpha: 0.1) : AafiyaColors.pureWhite,
      borderRadius: BorderRadius.circular(AafiyaRadius.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 6,
            vertical: AafiyaSpacing.sm,
          ),
          decoration: BoxDecoration(
            border: Border.all(
              color: isSelected ? accentColor : AafiyaColors.border,
              width: isSelected ? 1.5 : 1,
            ),
            borderRadius: BorderRadius.circular(AafiyaRadius.md),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  title,
                  style: AafiyaTypography.bodyMedium.copyWith(
                    color: isSelected ? accentColor : AafiyaColors.primaryText,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 12,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? accentColor : AafiyaColors.lightBackground,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '$count',
                  style: AafiyaTypography.caption.copyWith(
                    color: isSelected ? AafiyaColors.pureWhite : AafiyaColors.secondaryText,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQueueContent(LocalizedStrings strings) {
    if (_activeTab == AssistantQueueSubTab.waitingRoom) {
      if (_isLoadingWaitingRoom && _waitingRoomItems.isEmpty) {
        return const Center(child: CircularProgressIndicator());
      }
      if (_waitingRoomError != null && _waitingRoomItems.isEmpty) {
        return Center(
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: _waitingRoomError!,
            onRetry: _loadQueueData,
            retryLabel: strings.retry,
          ),
        );
      }
      if (_waitingRoomItems.isEmpty) {
        return Center(
          child: Padding(
            padding: AafiyaSpacing.insetScreen,
            child: AafiyaEmptyView(
              icon: Icons.meeting_room_outlined,
              title: strings.waitingRoomTab,
              message: strings.emptyWaitingRoom,
            ),
          ),
        );
      }

      return ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        itemCount: _waitingRoomItems.length + (_isLoadingWaitingRoom ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _waitingRoomItems.length) {
            return const Padding(
              padding: EdgeInsets.all(AafiyaSpacing.md),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            );
          }

          final app = _waitingRoomItems[index];
          return QueuePatientTile(
            key: ValueKey('assistant_waiting_${app.id}'),
            appointment: app,
            queueIndex: index + 1,
            onViewSummary: app.patient.id != null
                ? () => _openPatientSummary(app)
                : null,
          );
        },
      );
    } else if (_activeTab == AssistantQueueSubTab.expectedCheckIn) {
      if (_isLoadingExpected && _expectedItems.isEmpty) {
        return const Center(child: CircularProgressIndicator());
      }
      if (_expectedError != null && _expectedItems.isEmpty) {
        return Center(
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: _expectedError!,
            onRetry: _loadQueueData,
            retryLabel: strings.retry,
          ),
        );
      }
      if (_expectedItems.isEmpty) {
        return Center(
          child: Padding(
            padding: AafiyaSpacing.insetScreen,
            child: AafiyaEmptyView(
              icon: Icons.event_available_outlined,
              title: strings.expectedCheckInTab,
              message: strings.emptyExpectedQueue,
            ),
          ),
        );
      }

      final canConfirmAttendance = widget.user.hasPermission('booking.confirm_attendance');

      return ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        itemCount: _expectedItems.length + (_isLoadingExpected ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _expectedItems.length) {
            return const Padding(
              padding: EdgeInsets.all(AafiyaSpacing.md),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            );
          }

          final app = _expectedItems[index];
          final isProcessingThis = _processingAppointmentId == app.id;

          return QueuePatientTile(
            key: ValueKey('assistant_expected_${app.id}'),
            appointment: app,
            onAttend: canConfirmAttendance ? () => _handleAttend(app) : null,
            onNoShow: canConfirmAttendance ? () => _handleNoShow(app) : null,
            onViewSummary: app.patient.id != null
                ? () => _openPatientSummary(app)
                : null,
            isProcessing: isProcessingThis,
          );
        },
      );
    } else {
      // Pending Confirmation
      if (_isLoadingPending && _pendingItems.isEmpty) {
        return const Center(child: CircularProgressIndicator());
      }
      if (_pendingError != null && _pendingItems.isEmpty) {
        return Center(
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: _pendingError!,
            onRetry: _loadQueueData,
            retryLabel: strings.retry,
          ),
        );
      }
      if (_pendingItems.isEmpty) {
        return Center(
          child: Padding(
            padding: AafiyaSpacing.insetScreen,
            child: AafiyaEmptyView(
              icon: Icons.pending_actions_outlined,
              title: strings.pendingConfirmationTab,
              message: strings.emptyPendingQueue,
            ),
          ),
        );
      }

      final canConfirmBooking = widget.user.hasPermission('booking.confirm');

      return ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        itemCount: _pendingItems.length + (_isLoadingPending ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _pendingItems.length) {
            return const Padding(
              padding: EdgeInsets.all(AafiyaSpacing.md),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            );
          }

          final app = _pendingItems[index];
          final isProcessingThis = _processingAppointmentId == app.id;

          return QueuePatientTile(
            key: ValueKey('assistant_pending_${app.id}'),
            appointment: app,
            onConfirm: canConfirmBooking ? () => _handleConfirm(app) : null,
            onViewSummary: app.patient.id != null
                ? () => _openPatientSummary(app)
                : null,
            isProcessing: isProcessingThis,
          );
        },
      );
    }
  }
}

class _NoShowDialog extends StatefulWidget {
  const _NoShowDialog({
    required this.strings,
    required this.patientName,
  });

  final LocalizedStrings strings;
  final String patientName;

  @override
  State<_NoShowDialog> createState() => _NoShowDialogState();
}

class _NoShowDialogState extends State<_NoShowDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.strings.confirmNoShowTitle),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${widget.strings.confirmNoShowPrompt}\n\n${widget.strings.patientNameLabel}: ${widget.patientName}',
          ),
          const SizedBox(height: AafiyaSpacing.md),
          TextField(
            controller: _controller,
            decoration: InputDecoration(
              labelText: widget.strings.noShowReasonOptional,
              hintText: widget.strings.noShowReasonOptional,
              border: const OutlineInputBorder(),
              isDense: true,
            ),
            maxLines: 2,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: Text(widget.strings.cancel),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AafiyaColors.error,
            foregroundColor: AafiyaColors.pureWhite,
          ),
          onPressed: () => Navigator.of(context).pop(_controller.text.trim()),
          child: Text(widget.strings.markNoShowAction),
        ),
      ],
    );
  }
}

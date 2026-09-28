import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/queue_patient_tile.dart';
import 'patient_summary_sheet.dart';

enum QueueSubTab {
  waitingRoom,
  expectedCheckIn,
}

/// Live Waiting Room Queue & Operational Attendance View for AAFIYA Pro.
///
/// Features:
/// 1. Waiting Room queue: Patients who arrived and are physically in the waiting room (`status = attended`).
/// 2. Expected Check-In queue: Patients with confirmed appointments awaiting arrival (`status = confirmed`).
/// 3. Attendance Action: Mark confirmed patient as attended (`POST /api/v1/appointments/{id}/attend`).
/// 4. No-Show Action: Mark confirmed patient as no-show (`POST /api/v1/appointments/{id}/no-show`).
/// 5. Stale Response Protection on active clinic context switch.
/// 6. Infinite scroll pagination, pull-to-refresh, error handling, and trilingual RTL/LTR localization.
class DoctorQueueScreen extends StatefulWidget {
  const DoctorQueueScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.dashboardService,
    this.apiClient,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final DoctorDashboardService? dashboardService;
  final ApiClient? apiClient;

  @override
  State<DoctorQueueScreen> createState() => _DoctorQueueScreenState();
}

class _DoctorQueueScreenState extends State<DoctorQueueScreen> {
  late final DoctorDashboardService _dashboardService;
  final ScrollController _scrollController = ScrollController();

  QueueSubTab _activeTab = QueueSubTab.waitingRoom;
  String? _lastLoadedClinicId;

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

  // Mutating appointment ID (prevents duplicate submissions)
  String? _processingAppointmentId;

  @override
  void initState() {
    super.initState();
    _dashboardService = widget.dashboardService ??
        DoctorDashboardService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );

    widget.sessionManager.addListener(_onClinicContextChanged);
    _scrollController.addListener(_onScroll);

    _loadQueueData();
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onClinicContextChanged);
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onClinicContextChanged() {
    if (!mounted) return;
    final currentClinicId = widget.sessionManager.activeClinicId;
    if (currentClinicId != _lastLoadedClinicId) {
      _loadQueueData();
    }
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final threshold = _scrollController.position.maxScrollExtent - 200;
    if (_scrollController.position.pixels >= threshold) {
      if (_activeTab == QueueSubTab.waitingRoom &&
          !_isLoadingWaitingRoom &&
          _hasMoreWaitingRoom) {
        _loadMoreWaitingRoom();
      } else if (_activeTab == QueueSubTab.expectedCheckIn &&
          !_isLoadingExpected &&
          _hasMoreExpected) {
        _loadMoreExpected();
      }
    }
  }

  Future<void> _loadQueueData() async {
    final clinicId = widget.sessionManager.activeClinicId;
    _lastLoadedClinicId = clinicId;

    setState(() {
      _isLoadingWaitingRoom = true;
      _isLoadingExpected = true;
      _waitingRoomError = null;
      _expectedError = null;
      _waitingRoomPage = 1;
      _expectedPage = 1;
    });

    // Fetch both queues concurrently
    final results = await Future.wait([
      _dashboardService.fetchTodayAgenda(
        status: 'attended',
        page: 1,
        perPage: 15,
      ),
      _dashboardService.fetchTodayAgenda(
        status: 'confirmed',
        page: 1,
        perPage: 15,
      ),
    ]);

    if (!mounted) return;

    // Stale clinic response guard
    if (widget.sessionManager.activeClinicId != clinicId) {
      return;
    }

    final waitingResult = results[0];
    final expectedResult = results[1];

    setState(() {
      _isLoadingWaitingRoom = false;
      _isLoadingExpected = false;

      // Parse Waiting Room
      switch (waitingResult) {
        case ApiSuccess(:final data):
          _waitingRoomItems = data.items;
          _hasMoreWaitingRoom = data.hasMore;
          _waitingRoomError = null;
        case ApiFailure(:final exception):
          _waitingRoomError = exception.message;
      }

      // Parse Expected Check-in
      switch (expectedResult) {
        case ApiSuccess(:final data):
          _expectedItems = data.items;
          _hasMoreExpected = data.hasMore;
          _expectedError = null;
        case ApiFailure(:final exception):
          _expectedError = exception.message;
      }
    });
  }

  Future<void> _loadMoreWaitingRoom() async {
    if (_isLoadingWaitingRoom || !_hasMoreWaitingRoom) return;

    final clinicId = widget.sessionManager.activeClinicId;
    final nextPage = _waitingRoomPage + 1;

    setState(() => _isLoadingWaitingRoom = true);

    final result = await _dashboardService.fetchTodayAgenda(
      status: 'attended',
      page: nextPage,
      perPage: 15,
    );

    if (!mounted) return;
    if (widget.sessionManager.activeClinicId != clinicId) return;

    setState(() {
      _isLoadingWaitingRoom = false;
      switch (result) {
        case ApiSuccess(:final data):
          _waitingRoomItems = [..._waitingRoomItems, ...data.items];
          _waitingRoomPage = nextPage;
          _hasMoreWaitingRoom = data.hasMore;
        case ApiFailure():
          _hasMoreWaitingRoom = false;
      }
    });
  }

  Future<void> _loadMoreExpected() async {
    if (_isLoadingExpected || !_hasMoreExpected) return;

    final clinicId = widget.sessionManager.activeClinicId;
    final nextPage = _expectedPage + 1;

    setState(() => _isLoadingExpected = true);

    final result = await _dashboardService.fetchTodayAgenda(
      status: 'confirmed',
      page: nextPage,
      perPage: 15,
    );

    if (!mounted) return;
    if (widget.sessionManager.activeClinicId != clinicId) return;

    setState(() {
      _isLoadingExpected = false;
      switch (result) {
        case ApiSuccess(:final data):
          _expectedItems = [..._expectedItems, ...data.items];
          _expectedPage = nextPage;
          _hasMoreExpected = data.hasMore;
        case ApiFailure():
          _hasMoreExpected = false;
      }
    });
  }

  // --- ATTENDANCE ACTIONS ---

  Future<void> _handleAttend(Appointment appointment) async {
    final strings = LocalizedStrings.of(context);

    // 1. Confirm dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(strings.confirmAttendanceTitle),
        content: Text(
          '${strings.confirmAttendancePrompt}\n\n${strings.patientNameLabel}: ${appointment.patient.name ?? ''}\n${strings.timeSlotLabel}: ${appointment.timeSlot ?? ''}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.healingGreen,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(strings.markAttendedAction),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    // 2. Perform API Mutation
    setState(() => _processingAppointmentId = appointment.id);

    final result = await _dashboardService.attendAppointment(appointment.id);

    if (!mounted) return;
    setState(() => _processingAppointmentId = null);

    switch (result) {
      case ApiSuccess():
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.attendanceSuccessMessage),
            backgroundColor: AafiyaColors.healingGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        // Authoritative reload
        _loadQueueData();
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

  Future<void> _handleNoShow(Appointment appointment) async {
    final strings = LocalizedStrings.of(context);

    // 1. Confirm dialog with optional reason
    final reason = await showDialog<String>(
      context: context,
      builder: (dialogContext) => _NoShowDialog(
        strings: strings,
        patientName: appointment.patient.name ?? '',
      ),
    );

    if (reason == null || !mounted) return;

    // 2. Perform API Mutation
    setState(() => _processingAppointmentId = appointment.id);

    final result = await _dashboardService.markNoShow(
      appointment.id,
      reason: reason.isNotEmpty ? reason : null,
    );

    if (!mounted) return;
    setState(() => _processingAppointmentId = null);

    switch (result) {
      case ApiSuccess():
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.noShowSuccessMessage),
            backgroundColor: AafiyaColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
        // Authoritative reload
        _loadQueueData();
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
    final strings = LocalizedStrings.of(context);

    return Column(
      children: [
        // Sub-Tabs Header Bar
        _buildSubTabBar(strings),

        // Queue Content Area
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadQueueData,
            color: AafiyaColors.healthBlue,
            child: _buildQueueContent(strings),
          ),
        ),
      ],
    );
  }

  Widget _buildSubTabBar(LocalizedStrings strings) {
    final waitingCount = _waitingRoomItems.length;
    final expectedCount = _expectedItems.length;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AafiyaSpacing.md,
        vertical: AafiyaSpacing.sm,
      ),
      decoration: const BoxDecoration(
        color: AafiyaColors.pureWhite,
        border: Border(
          bottom: BorderSide(color: AafiyaColors.border, width: 1),
        ),
      ),
      child: Row(
        children: [
          // Waiting Room Sub-Tab
          Expanded(
            child: _buildTabButton(
              title: strings.waitingRoomTab,
              count: waitingCount,
              isSelected: _activeTab == QueueSubTab.waitingRoom,
              accentColor: AafiyaColors.info,
              onTap: () {
                setState(() => _activeTab = QueueSubTab.waitingRoom);
              },
            ),
          ),
          const SizedBox(width: AafiyaSpacing.sm),

          // Expected Check-In Sub-Tab
          Expanded(
            child: _buildTabButton(
              title: strings.expectedCheckInTab,
              count: expectedCount,
              isSelected: _activeTab == QueueSubTab.expectedCheckIn,
              accentColor: AafiyaColors.healthBlue,
              onTap: () {
                setState(() => _activeTab = QueueSubTab.expectedCheckIn);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton({
    required String title,
    required int count,
    required bool isSelected,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: isSelected ? accentColor.withValues(alpha: 0.1) : Colors.transparent,
      borderRadius: BorderRadius.circular(AafiyaRadius.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AafiyaSpacing.sm,
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
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected ? accentColor : AafiyaColors.lightBackground,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '$count',
                  style: AafiyaTypography.caption.copyWith(
                    color: isSelected ? AafiyaColors.pureWhite : AafiyaColors.secondaryText,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
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
    if (_activeTab == QueueSubTab.waitingRoom) {
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
            key: ValueKey('queue_waiting_${app.id}'),
            appointment: app,
            queueIndex: index + 1,
            onViewSummary: app.patient.id != null
                ? () => _openPatientSummary(app)
                : null,
          );
        },
      );
    } else {
      // Expected Arrivals Sub-Tab
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
            key: ValueKey('queue_expected_${app.id}'),
            appointment: app,
            onAttend: () => _handleAttend(app),
            onNoShow: () => _handleNoShow(app),
            onViewSummary: app.patient.id != null
                ? () => _openPatientSummary(app)
                : null,
            isProcessing: isProcessingThis,
          );
        },
      );
    }
  }

  void _openPatientSummary(Appointment app) {
    final patientId = app.patient.id;
    if (patientId == null) return;
    final client = widget.apiClient ?? widget.sessionManager.apiClient;
    PatientSummarySheet.show(
      context,
      apiClient: client,
      patientId: patientId,
      patientName: app.patient.name ?? LocalizedStrings.of(context).patientNameLabel,
      mrn: app.patient.mrn,
    );
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


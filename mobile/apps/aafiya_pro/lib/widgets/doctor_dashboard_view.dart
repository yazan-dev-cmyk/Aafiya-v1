import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import 'clinic_context_selector.dart';
import 'doctor_agenda_tile.dart';
import 'doctor_metric_card.dart';
import '../screens/patient_summary_sheet.dart';

/// Complete Doctor Operational Dashboard View for the current day.
///
/// Features:
/// 1. Operational Statistics (`GET /api/v1/doctor/stats`)
/// 2. Today's Agenda (`GET /api/v1/appointments?appointment_date=...&sort_by=time_slot&sort_order=asc`)
/// 3. Clinic Context Integration & Stale Response Protection
/// 4. Status Filtering & Pagination
/// 5. Pull-to-refresh
/// 6. Trilingual AR/EN/FR layout
class DoctorDashboardView extends StatefulWidget {
  const DoctorDashboardView({
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
  State<DoctorDashboardView> createState() => _DoctorDashboardViewState();
}

class _DoctorDashboardViewState extends State<DoctorDashboardView> {
  late final DoctorDashboardService _service;
  final ScrollController _scrollController = ScrollController();

  DoctorStats? _stats;
  List<Appointment> _appointments = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _errorMessage;

  int _currentPage = 1;
  int _lastPage = 1;
  String _selectedStatus = 'all';

  // Stale-response guard tracking the currently active clinic UUID
  String? _lastLoadedClinicId;

  @override
  void initState() {
    super.initState();
    _service = widget.dashboardService ??
        DoctorDashboardService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );

    widget.sessionManager.addListener(_onClinicContextChanged);
    _scrollController.addListener(_onScroll);
    _loadDashboardData();
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onClinicContextChanged);
    _scrollController.dispose();
    super.dispose();
  }

  void _onClinicContextChanged() {
    final currentClinicId = widget.sessionManager.activeClinicId;
    if (currentClinicId != _lastLoadedClinicId) {
      _loadDashboardData();
    }
  }

  void _onScroll() {
    if (!_scrollController.hasClients || _isLoadingMore || _isLoading) return;
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (_currentPage < _lastPage) {
        _loadMoreAppointments();
      }
    }
  }

  Future<void> _loadDashboardData() async {
    final currentClinicId = widget.sessionManager.activeClinicId;
    _lastLoadedClinicId = currentClinicId;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _currentPage = 1;
    });

    // Fetch stats and agenda in parallel
    final statsFuture = _service.fetchDoctorStats();
    final agendaFuture = _service.fetchTodayAgenda(
      page: 1,
      status: _selectedStatus == 'all' ? null : _selectedStatus,
    );

    final results = await Future.wait([statsFuture, agendaFuture]);

    if (!mounted) return;

    // Stale clinic guard: discard result if user switched clinic while request was in-flight
    if (widget.sessionManager.activeClinicId != currentClinicId) {
      return;
    }

    final statsResult = results[0] as ApiResult<DoctorStats>;
    final agendaResult = results[1] as ApiResult<PaginatedAppointments>;

    String? error;
    DoctorStats? stats;
    List<Appointment> appointments = [];
    int lastPage = 1;

    switch (statsResult) {
      case ApiSuccess(:final data):
        stats = data;
      case ApiFailure(:final exception):
        error = exception.message;
    }

    switch (agendaResult) {
      case ApiSuccess(:final data):
        appointments = data.items;
        lastPage = data.lastPage;
      case ApiFailure(:final exception):
        error ??= exception.message;
    }

    setState(() {
      _stats = stats;
      _appointments = appointments;
      _currentPage = 1;
      _lastPage = lastPage;
      _errorMessage = error;
      _isLoading = false;
    });
  }

  Future<void> _loadMoreAppointments() async {
    final currentClinicId = widget.sessionManager.activeClinicId;
    if (_isLoadingMore || _currentPage >= _lastPage) return;

    setState(() => _isLoadingMore = true);

    final nextPage = _currentPage + 1;
    final result = await _service.fetchTodayAgenda(
      page: nextPage,
      status: _selectedStatus == 'all' ? null : _selectedStatus,
    );

    if (!mounted) return;

    if (widget.sessionManager.activeClinicId != currentClinicId) {
      return;
    }

    if (result case ApiSuccess(:final data)) {
      setState(() {
        _appointments = [..._appointments, ...data.items];
        _currentPage = data.currentPage;
        _lastPage = data.lastPage;
        _isLoadingMore = false;
      });
    } else {
      setState(() => _isLoadingMore = false);
    }
  }

  void _onStatusFilterSelected(String status) {
    if (_selectedStatus == status) return;
    setState(() {
      _selectedStatus = status;
    });
    _loadDashboardData();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: AafiyaSpacing.md),
            Text(
              strings.loadingDashboard,
              style: AafiyaTypography.bodyMedium,
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null && _stats == null) {
      return Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: AafiyaErrorView(
            title: strings.failedToLoadDashboard,
            message: _errorMessage!,
            onRetry: _loadDashboardData,
            retryLabel: strings.retry,
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadDashboardData,
      child: CustomScrollView(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: AafiyaSpacing.insetScreen,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Active Clinic Selector
                  ClinicContextSelector(sessionManager: widget.sessionManager),
                  const SizedBox(height: AafiyaSpacing.md),

                  // 2. Operational KPI Statistics Cards
                  if (_stats != null) ...[
                    Row(
                      children: [
                        DoctorMetricCard(
                          label: strings.todayTotalLabel,
                          count: _stats!.todayTotal,
                          icon: Icons.calendar_today_rounded,
                          color: AafiyaColors.healthBlue,
                        ),
                        const SizedBox(width: AafiyaSpacing.sm),
                        DoctorMetricCard(
                          label: strings.inWaitingRoomLabel,
                          count: _stats!.inWaitingRoom,
                          icon: Icons.meeting_room_rounded,
                          color: AafiyaColors.healingGreen,
                        ),
                      ],
                    ),
                    const SizedBox(height: AafiyaSpacing.sm),
                    Row(
                      children: [
                        DoctorMetricCard(
                          label: strings.pendingCheckInLabel,
                          count: _stats!.pendingCheckIn,
                          icon: Icons.schedule_rounded,
                          color: AafiyaColors.warning,
                        ),
                        const SizedBox(width: AafiyaSpacing.sm),
                        DoctorMetricCard(
                          label: strings.completedTodayLabel,
                          count: _stats!.completedToday,
                          icon: Icons.check_circle_outline_rounded,
                          color: AafiyaColors.success,
                        ),
                        const SizedBox(width: AafiyaSpacing.sm),
                        DoctorMetricCard(
                          label: strings.noShowTodayLabel,
                          count: _stats!.noShowToday,
                          icon: Icons.person_off_outlined,
                          color: AafiyaColors.error,
                        ),
                      ],
                    ),
                    const SizedBox(height: AafiyaSpacing.lg),
                  ],

                  // 3. Agenda Header & Status Filters
                  Text(
                    strings.todayAgendaTitle,
                    style: AafiyaTypography.titleLarge.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AafiyaSpacing.sm),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip('all', strings.filterAll),
                        const SizedBox(width: 6),
                        _buildFilterChip('confirmed', strings.filterConfirmed),
                        const SizedBox(width: 6),
                        _buildFilterChip('attended', strings.filterAttended),
                        const SizedBox(width: 6),
                        _buildFilterChip('no_show', strings.filterNoShow),
                      ],
                    ),
                  ),
                  const SizedBox(height: AafiyaSpacing.sm),
                ],
              ),
            ),
          ),

          // 4. Appointments List or Empty State
          if (_appointments.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: AafiyaSpacing.insetScreen,
                  child: AafiyaEmptyView(
                    icon: Icons.event_note_outlined,
                    title: strings.todayAgendaTitle,
                    message: _selectedStatus == 'all'
                        ? strings.noAppointmentsToday
                        : strings.noAppointmentsFiltered,
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AafiyaSpacing.md),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final appointment = _appointments[index];
                    final client = widget.apiClient ?? widget.sessionManager.apiClient;
                    return DoctorAgendaTile(
                      appointment: appointment,
                      onTap: appointment.patient.id != null
                          ? () => PatientSummarySheet.show(
                                context,
                                apiClient: client,
                                patientId: appointment.patient.id!,
                                patientName: appointment.patient.name ??
                                    LocalizedStrings.of(context).patientNameLabel,
                                mrn: appointment.patient.mrn,
                              )
                          : null,
                    );
                  },
                  childCount: _appointments.length,
                ),
              ),
            ),

          // 5. Pagination Loading Indicator
          if (_isLoadingMore)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(AafiyaSpacing.md),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),

          const SliverToBoxAdapter(
            child: SizedBox(height: AafiyaSpacing.xl),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedStatus == key;
    return FilterChip(
      selected: isSelected,
      label: Text(label),
      labelStyle: AafiyaTypography.caption.copyWith(
        color: isSelected ? AafiyaColors.pureWhite : AafiyaColors.primaryText,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      selectedColor: AafiyaColors.healthBlue,
      backgroundColor: AafiyaColors.lightBackground,
      checkmarkColor: AafiyaColors.pureWhite,
      onSelected: (_) => _onStatusFilterSelected(key),
    );
  }
}

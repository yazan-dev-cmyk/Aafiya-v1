import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Clinic Director Doctor Statistics Screen.
///
/// Features:
/// 1. Authoritative API Integration (`GET /api/v1/clinic/doctor-stats`)
/// 2. Active Clinic Context & Tenant Scoping via `X-Clinic-ID`
/// 3. In-flight Stale Response Guard on Clinic Switch
/// 4. Doctor Filter: "All Doctors" vs Single Doctor (UUID)
/// 5. Date Presets: "Today", "Specific Date", "Date Range" with local validation
/// 6. Primary KPI Deck (5 operational volume metrics)
/// 7. Secondary KPI Deck (5 terminal/status metrics)
/// 8. Focused Selected-Doctor Card with Clear Filter action
/// 9. Doctor Performance Breakdown List (All-Doctors mode)
/// 10. Zero-Record Empty State (Reassuring banner, no false 404)
/// 11. Trilingual Arabic (RTL), French (LTR), and English (LTR) layout
class ClinicDirectorStatsScreen extends StatefulWidget {
  const ClinicDirectorStatsScreen({
    super.key,
    required this.sessionManager,
    this.user,
    this.statsService,
    this.staffService,
    this.apiClient,
    this.onBackToDashboard,
  });

  final AuthSessionManager sessionManager;
  final User? user;
  final ClinicDoctorStatsService? statsService;
  final ClinicStaffService? staffService;
  final ApiClient? apiClient;
  final VoidCallback? onBackToDashboard;

  @override
  State<ClinicDirectorStatsScreen> createState() =>
      _ClinicDirectorStatsScreenState();
}

class _ClinicDirectorStatsScreenState extends State<ClinicDirectorStatsScreen> {
  late final ClinicDoctorStatsService _statsService;
  late final ClinicStaffService _staffService;

  bool _isLoading = true;
  String? _errorMessage;

  ClinicDoctorStatsData? _statsData;
  List<ClinicDoctorStaff> _clinicDoctors = [];

  // Filter States
  String? _selectedDoctorId; // null = All Doctors
  String _datePreset = 'today'; // 'today' | 'specific' | 'range'
  late String _specificDate;
  late String _rangeStart;
  late String _rangeEnd;
  String? _dateRangeError;

  // Stale-response guard tracking the active clinic UUID
  String? _lastLoadedClinicId;

  @override
  void initState() {
    super.initState();
    final apiClient = widget.apiClient ?? widget.sessionManager.apiClient;
    _statsService = widget.statsService ??
        ClinicDoctorStatsService(apiClient: apiClient);
    _staffService = widget.staffService ??
        ClinicStaffService(apiClient: apiClient);

    final today = _formatDate(DateTime.now());
    _specificDate = today;
    _rangeStart = today;
    _rangeEnd = today;

    widget.sessionManager.addListener(_onClinicContextChanged);
    _loadInitialData();
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onClinicContextChanged);
    super.dispose();
  }

  String _formatDate(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  void _onClinicContextChanged() {
    final currentClinicId = widget.sessionManager.activeClinicId;
    if (currentClinicId != _lastLoadedClinicId) {
      setState(() {
        _selectedDoctorId = null;
        _statsData = null;
        _clinicDoctors = [];
      });
      _loadInitialData();
    }
  }

  Future<void> _loadInitialData() async {
    final currentClinicId = widget.sessionManager.activeClinicId;
    if (currentClinicId == null || currentClinicId.isEmpty) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    _loadClinicStaff(currentClinicId);
    _loadStatistics();
  }

  Future<void> _loadClinicStaff(String clinicId) async {
    try {
      final res = await _staffService.fetchClinicStaff(clinicId);
      if (!mounted) return;
      if (widget.sessionManager.activeClinicId != clinicId) return;

      if (res is ApiSuccess<ClinicStaffData>) {
        setState(() {
          _clinicDoctors = res.data.doctors
              .where((d) => d.isActive != false)
              .toList(growable: false);
        });
      }
    } catch (_) {
      // Retain previous or empty doctor roster
    }
  }

  Future<void> _loadStatistics() async {
    final currentClinicId = widget.sessionManager.activeClinicId;
    if (currentClinicId == null || currentClinicId.isEmpty) return;

    _lastLoadedClinicId = currentClinicId;

    String? fromDate;
    String? toDate;

    if (_datePreset == 'today') {
      final today = _formatDate(DateTime.now());
      fromDate = today;
      toDate = today;
      _dateRangeError = null;
    } else if (_datePreset == 'specific') {
      fromDate = _specificDate;
      toDate = _specificDate;
      _dateRangeError = null;
    } else if (_datePreset == 'range') {
      if (_rangeEnd.compareTo(_rangeStart) < 0) {
        final strings = LocalizedStrings.of(context);
        setState(() {
          _dateRangeError = strings.invalidDateRangeError;
        });
        return; // Prevent invalid API call
      }
      fromDate = _rangeStart;
      toDate = _rangeEnd;
      _dateRangeError = null;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _statsService.fetchClinicDoctorStats(
      fromDate: fromDate,
      toDate: toDate,
      doctorId: _selectedDoctorId,
    );

    if (!mounted) return;

    // In-flight stale clinic guard
    if (widget.sessionManager.activeClinicId != currentClinicId) {
      return;
    }

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _statsData = data;
          _isLoading = false;
        });
      case ApiFailure(:final exception):
        final strings = LocalizedStrings.of(context);
        String msg = strings.generalStatsError;

        if (exception is UnauthorizedException) {
          msg = strings.forbiddenStatsError;
        } else if (exception is ValidationException) {
          msg = exception.message.isNotEmpty
              ? exception.message
              : strings.invalidParamsStatsError;
        } else {
          msg = exception.message.isNotEmpty ? exception.message : strings.generalStatsError;
        }

        setState(() {
          _errorMessage = msg;
          _isLoading = false;
        });
    }
  }

  Future<void> _selectSpecificDate(BuildContext context) async {
    final current = DateTime.tryParse(_specificDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null && mounted) {
      setState(() {
        _specificDate = _formatDate(picked);
      });
      _loadStatistics();
    }
  }

  Future<void> _selectRangeStart(BuildContext context) async {
    final current = DateTime.tryParse(_rangeStart) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null && mounted) {
      setState(() {
        _rangeStart = _formatDate(picked);
      });
      _loadStatistics();
    }
  }

  Future<void> _selectRangeEnd(BuildContext context) async {
    final current = DateTime.tryParse(_rangeEnd) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null && mounted) {
      setState(() {
        _rangeEnd = _formatDate(picked);
      });
      _loadStatistics();
    }
  }

  void _onDoctorSelected(String? doctorId) {
    setState(() {
      _selectedDoctorId = doctorId;
    });
    _loadStatistics();
  }

  void _onClearDoctorFilter() {
    setState(() {
      _selectedDoctorId = null;
    });
    _loadStatistics();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final isDirector =
        widget.sessionManager.activeClinic?.isMedicalDirector == true;
    final hasPermission =
        isDirector || (widget.user?.hasPermission('clinic.view_analytics') == true);

    // Unauthorized direct screen defense
    if (!hasPermission) {
      return Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: AafiyaCard(
            padding: AafiyaSpacing.insetAllLg,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.shield_outlined,
                  size: 48,
                  color: AafiyaColors.warning,
                ),
                const SizedBox(height: AafiyaSpacing.md),
                Text(
                  strings.errorTitle,
                  style: AafiyaTypography.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AafiyaSpacing.sm),
                Text(
                  strings.unauthorizedClinicStatsMessage,
                  style: AafiyaTypography.bodyMedium.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AafiyaSpacing.lg),
                if (widget.onBackToDashboard != null)
                  AafiyaButton(
                    label: strings.backToDashboard,
                    onPressed: widget.onBackToDashboard,
                  ),
              ],
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadStatistics,
      child: ListView(
        padding: AafiyaSpacing.insetScreen,
        children: [
          // 1. Header & Active Clinic Banner
          _buildHeaderBanner(strings),
          const SizedBox(height: AafiyaSpacing.md),

          // 2. Filter Toolbar (Doctor Selector + Date Presets)
          _buildFilterToolbar(strings),
          const SizedBox(height: AafiyaSpacing.md),

          // 3. Selected Doctor Focused Card
          if (_selectedDoctorId != null && _statsData?.selectedDoctor != null) ...[
            _buildSelectedDoctorCard(strings, _statsData!.selectedDoctor!),
            const SizedBox(height: AafiyaSpacing.md),
          ],

          // 4. Content Area (Loading, Error, or Data)
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AafiyaSpacing.xl),
              child: AafiyaLoadingView(),
            )
          else if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AafiyaSpacing.md),
              child: AafiyaErrorView(
                title: strings.errorTitle,
                message: _errorMessage!,
                onRetry: _loadStatistics,
                retryLabel: strings.retry,
              ),
            )
          else if (_statsData != null) ...[
            // Zero records reassuring banner
            if (_statsData!.isZeroRecords) ...[
              AafiyaEmptyView(
                icon: Icons.calendar_today_outlined,
                title: strings.zeroStatsTitle,
                message: strings.zeroStatsMessage,
              ),
              const SizedBox(height: AafiyaSpacing.md),
            ],

            // Primary KPIs Deck
            _buildSectionTitle(strings.primaryKpisSection),
            const SizedBox(height: AafiyaSpacing.sm),
            _buildPrimaryKpiDeck(strings, _statsData!.summary),
            const SizedBox(height: AafiyaSpacing.lg),

            // Secondary KPIs Deck
            _buildSectionTitle(strings.secondaryKpisSection),
            const SizedBox(height: AafiyaSpacing.sm),
            _buildSecondaryKpiDeck(strings, _statsData!.summary),
            const SizedBox(height: AafiyaSpacing.lg),

            // Doctor Breakdown List (All Doctors mode only)
            if (!_statsData!.isSelectedDoctorMode && _statsData!.doctors.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildSectionTitle(strings.doctorBreakdownSection),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                    child: Text(
                      '${_statsData!.doctors.length} ${strings.doctorCountBadge}',
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.healthBlue,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AafiyaSpacing.sm),
              _buildDoctorBreakdownList(strings, _statsData!.doctors),
              const SizedBox(height: AafiyaSpacing.xl),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildHeaderBanner(LocalizedStrings strings) {
    final clinicName = _statsData?.clinic.name ??
        widget.sessionManager.activeClinic?.name ??
        '—';

    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                ),
                child: const Icon(
                  Icons.trending_up_rounded,
                  color: AafiyaColors.healthBlue,
                  size: 24,
                ),
              ),
              const SizedBox(width: AafiyaSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strings.clinicDoctorStatsTitle,
                      style: AafiyaTypography.titleMedium.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      strings.clinicDoctorStatsSubtitle,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                      ),
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, size: 20),
                tooltip: strings.refreshStats,
                onPressed: _isLoading ? null : _loadStatistics,
              ),
            ],
          ),
          const SizedBox(height: AafiyaSpacing.sm),
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AafiyaColors.healingGreen,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '${strings.activeClinicBadge}: ',
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AafiyaColors.secondaryText,
                ),
              ),
              Expanded(
                child: Text(
                  clinicName,
                  style: AafiyaTypography.caption.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.healthBlue,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterToolbar(LocalizedStrings strings) {
    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Doctor Filter Selector
          Row(
            children: [
              const Icon(Icons.people_outline_rounded, size: 16, color: AafiyaColors.healthBlue),
              const SizedBox(width: 6),
              Text(
                strings.filterDoctorLabel,
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AafiyaColors.secondaryText,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              border: Border.all(color: AafiyaColors.border),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
              color: AafiyaColors.lightBackground,
            ),
            child: DropdownButtonHideUnderline(
              child: Builder(
                builder: (context) {
                  final doctorOptions = <String, String>{};
                  for (final d in _clinicDoctors) {
                    doctorOptions[d.id] =
                        '${d.name}${d.specialty != null ? ' — ${d.specialty}' : ''} (${d.position == 'director' ? strings.directorPositionBadge : strings.doctorStaffPositionBadge})';
                  }
                  if (_statsData != null) {
                    for (final d in _statsData!.doctors) {
                      doctorOptions.putIfAbsent(
                        d.id,
                        () => '${d.name}${d.specialty != null ? ' — ${d.specialty}' : ''} (${d.position == 'director' ? strings.directorPositionBadge : strings.doctorStaffPositionBadge})',
                      );
                    }
                    final sel = _statsData!.selectedDoctor;
                    if (sel != null) {
                      doctorOptions.putIfAbsent(
                        sel.id,
                        () => '${sel.name}${sel.specialty != null ? ' — ${sel.specialty}' : ''} (${sel.position == 'director' ? strings.directorPositionBadge : strings.doctorStaffPositionBadge})',
                      );
                    }
                  }

                  final effectiveValue = doctorOptions.containsKey(_selectedDoctorId)
                      ? _selectedDoctorId
                      : null;

                  return DropdownButton<String?>(
                    value: effectiveValue,
                    isExpanded: true,
                    style: AafiyaTypography.bodySmall.copyWith(
                      color: AafiyaColors.primaryText,
                      fontWeight: FontWeight.w600,
                    ),
                    items: [
                      DropdownMenuItem<String?>(
                        value: null,
                        child: Text(strings.allDoctorsOption),
                      ),
                      ...doctorOptions.entries.map(
                        (e) => DropdownMenuItem<String?>(
                          value: e.key,
                          child: Text(
                            e.value,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    ],
                    onChanged: _isLoading ? null : _onDoctorSelected,
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: AafiyaSpacing.md),

          // Date Presets Segmented Bar
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded, size: 16, color: AafiyaColors.healthBlue),
              const SizedBox(width: 6),
              Text(
                strings.filterDateModeLabel,
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AafiyaColors.secondaryText,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildDatePresetChip('today', strings.filterToday),
              const SizedBox(width: 6),
              _buildDatePresetChip('specific', strings.filterSpecificDate),
              const SizedBox(width: 6),
              _buildDatePresetChip('range', strings.filterDateRange),
            ],
          ),

          // Date Inputs based on preset
          if (_datePreset == 'specific') ...[
            const SizedBox(height: AafiyaSpacing.sm),
            OutlinedButton.icon(
              onPressed: () => _selectSpecificDate(context),
              icon: const Icon(Icons.calendar_month_rounded, size: 16),
              label: Text(_specificDate),
              style: OutlinedButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                ),
              ),
            ),
          ] else if (_datePreset == 'range') ...[
            const SizedBox(height: AafiyaSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _selectRangeStart(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AafiyaRadius.md),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          strings.fromDateLabel,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontSize: 10,
                          ),
                        ),
                        Text(_rangeStart, style: AafiyaTypography.bodySmall),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _selectRangeEnd(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AafiyaRadius.md),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          strings.toDateLabel,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontSize: 10,
                          ),
                        ),
                        Text(_rangeEnd, style: AafiyaTypography.bodySmall),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            if (_dateRangeError != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 14, color: AafiyaColors.error),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      _dateRangeError!,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildDatePresetChip(String key, String label) {
    final isSelected = _datePreset == key;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          if (_datePreset != key) {
            setState(() {
              _datePreset = key;
              _dateRangeError = null;
            });
            _loadStatistics();
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AafiyaColors.healthBlue
                : AafiyaColors.lightBackground,
            borderRadius: BorderRadius.circular(AafiyaRadius.md),
            border: Border.all(
              color: isSelected ? AafiyaColors.healthBlue : AafiyaColors.border,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: AafiyaTypography.caption.copyWith(
              color: isSelected ? AafiyaColors.pureWhite : AafiyaColors.primaryText,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedDoctorCard(
    LocalizedStrings strings,
    ClinicSelectedDoctor doc,
  ) {
    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.healthBlue.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AafiyaRadius.lg),
        border: Border.all(
          color: AafiyaColors.healthBlue.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AafiyaColors.healthBlue,
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
            ),
            child: const Icon(
              Icons.person_pin_rounded,
              color: AafiyaColors.pureWhite,
              size: 20,
            ),
          ),
          const SizedBox(width: AafiyaSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.viewingDoctorStats,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.healthBlue,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${doc.name}${doc.specialty != null ? ' (${doc.specialty})' : ''}',
                  style: AafiyaTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: _onClearDoctorFilter,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              backgroundColor: AafiyaColors.pureWhite,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
              ),
            ),
            child: Text(
              strings.clearDoctorFilter,
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.healthBlue,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: AafiyaTypography.titleSmall.copyWith(
        fontWeight: FontWeight.bold,
        color: AafiyaColors.secondaryText,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildPrimaryKpiDeck(
    LocalizedStrings strings,
    ClinicStatsSummary summary,
  ) {
    return Column(
      children: [
        Row(
          children: [
            _buildMetricCard(
              label: strings.totalAppointmentsLabel,
              count: summary.totalAppointments,
              icon: Icons.calendar_today_rounded,
              color: AafiyaColors.healthBlue,
            ),
            const SizedBox(width: AafiyaSpacing.sm),
            _buildMetricCard(
              label: strings.completedAppointmentsLabel,
              count: summary.completed,
              icon: Icons.check_circle_outline_rounded,
              color: AafiyaColors.success,
            ),
          ],
        ),
        const SizedBox(height: AafiyaSpacing.sm),
        Row(
          children: [
            _buildMetricCard(
              label: strings.inWaitingRoomLabel,
              count: summary.inWaitingRoom,
              icon: Icons.meeting_room_rounded,
              color: AafiyaColors.warning,
            ),
            const SizedBox(width: AafiyaSpacing.sm),
            _buildMetricCard(
              label: strings.pendingCheckInLabel,
              count: summary.pendingCheckIn,
              icon: Icons.schedule_rounded,
              color: const Color(0xFF0284C7), // Sky blue
            ),
          ],
        ),
        const SizedBox(height: AafiyaSpacing.sm),
        Row(
          children: [
            _buildMetricCard(
              label: strings.walkInVisitsLabel,
              count: summary.walkInVisits,
              icon: Icons.directions_walk_rounded,
              color: const Color(0xFF9333EA), // Purple
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSecondaryKpiDeck(
    LocalizedStrings strings,
    ClinicStatsSummary summary,
  ) {
    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: Column(
        children: [
          _buildSecondaryMetricRow(
            label: strings.noShowLabel,
            count: summary.noShow,
            icon: Icons.person_off_outlined,
            color: AafiyaColors.secondaryText,
          ),
          const Divider(height: 16),
          _buildSecondaryMetricRow(
            label: strings.cancelledLabel,
            count: summary.cancelled,
            icon: Icons.cancel_outlined,
            color: AafiyaColors.error,
          ),
          const Divider(height: 16),
          _buildSecondaryMetricRow(
            label: strings.rescheduledLabel,
            count: summary.rescheduled,
            icon: Icons.update_rounded,
            color: const Color(0xFF6366F1), // Indigo
          ),
          const Divider(height: 16),
          _buildSecondaryMetricRow(
            label: strings.rejectedLabel,
            count: summary.rejected,
            icon: Icons.block_rounded,
            color: const Color(0xFFDC2626), // Dark Red
          ),
          const Divider(height: 16),
          _buildSecondaryMetricRow(
            label: strings.expiredLabel,
            count: summary.expired,
            icon: Icons.hourglass_disabled_rounded,
            color: AafiyaColors.secondaryText,
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard({
    required String label,
    required int count,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(AafiyaSpacing.md),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(AafiyaRadius.lg),
          border: Border.all(
            color: color.withValues(alpha: 0.25),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  count.toString(),
                  style: AafiyaTypography.headlineLarge.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Icon(icon, color: color, size: 22),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: AafiyaTypography.caption.copyWith(
                fontWeight: FontWeight.w600,
                color: AafiyaColors.primaryText,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecondaryMetricRow({
    required String label,
    required int count,
    required IconData icon,
    required Color color,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: AafiyaSpacing.sm),
        Expanded(
          child: Text(
            label,
            style: AafiyaTypography.bodyMedium.copyWith(
              color: AafiyaColors.primaryText,
            ),
          ),
        ),
        Text(
          count.toString(),
          style: AafiyaTypography.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildDoctorBreakdownList(
    LocalizedStrings strings,
    List<ClinicDoctorItem> doctors,
  ) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: doctors.length,
      separatorBuilder: (_, __) => const SizedBox(height: AafiyaSpacing.sm),
      itemBuilder: (context, index) {
        final doc = doctors[index];
        return AafiyaCard(
          padding: AafiyaSpacing.insetAllMd,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          doc.name,
                          style: AafiyaTypography.titleSmall.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (doc.specialty != null)
                          Text(
                            doc.specialty!,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: doc.isDirector
                          ? const Color(0xFF9333EA).withValues(alpha: 0.1)
                          : AafiyaColors.border.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                    child: Text(
                      doc.isDirector
                          ? strings.directorPositionBadge
                          : strings.doctorStaffPositionBadge,
                      style: AafiyaTypography.caption.copyWith(
                        color: doc.isDirector
                            ? const Color(0xFF9333EA)
                            : AafiyaColors.secondaryText,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AafiyaSpacing.sm),

              // Mini metrics grid
              Row(
                children: [
                  _buildMiniMetricCell(
                    strings.totalAppointmentsLabel,
                    doc.metrics.totalAppointments.toString(),
                  ),
                  const SizedBox(width: 4),
                  _buildMiniMetricCell(
                    strings.completedAppointmentsLabel,
                    doc.metrics.completed.toString(),
                    color: AafiyaColors.success,
                  ),
                  const SizedBox(width: 4),
                  _buildMiniMetricCell(
                    strings.inWaitingRoomLabel,
                    doc.metrics.inWaitingRoom.toString(),
                    color: AafiyaColors.warning,
                  ),
                  const SizedBox(width: 4),
                  _buildMiniMetricCell(
                    strings.walkInVisitsLabel,
                    doc.metrics.walkInVisits.toString(),
                    color: const Color(0xFF9333EA),
                  ),
                ],
              ),
              const SizedBox(height: AafiyaSpacing.sm),

              // Action button to focus on this doctor
              OutlinedButton.icon(
                onPressed: () => _onDoctorSelected(doc.id),
                icon: const Icon(Icons.filter_alt_outlined, size: 14),
                label: Text(strings.viewDoctorStatsButton),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(36),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AafiyaRadius.md),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMiniMetricCell(
    String label,
    String value, {
    Color? color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
        decoration: BoxDecoration(
          color: AafiyaColors.lightBackground,
          borderRadius: BorderRadius.circular(AafiyaRadius.sm),
          border: Border.all(color: AafiyaColors.border),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: AafiyaTypography.caption.copyWith(
                fontSize: 9,
                color: AafiyaColors.secondaryText,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: AafiyaTypography.bodyMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: color ?? AafiyaColors.primaryText,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../screens/clinic_director_stats_screen.dart';
import '../screens/doctor_queue_screen.dart';
import '../screens/doctor_staff_screen.dart';
import '../widgets/doctor_dashboard_view.dart';

/// AAFIYA Pro — Doctor Operational Shell.
///
/// Handles doctor clinic discovery, active clinic context resolution,
/// clinic switching, and operational dashboard presentation.
///
/// NOTE: Clinical features (appointment queue processing, clinical visits,
/// prescription authoring, lab/radiology orders) belong to subsequent tasks.
class DoctorShell extends StatefulWidget {
  const DoctorShell({
    super.key,
    required this.user,
    required this.sessionManager,
    required this.onSignOut,
    this.clinicService,
    this.dashboardService,
    this.clinicStaffService,
    this.statsService,
    this.apiClient,
  });

  final User user;
  final AuthSessionManager sessionManager;
  final VoidCallback onSignOut;
  final DoctorClinicService? clinicService;
  final DoctorDashboardService? dashboardService;
  final ClinicStaffService? clinicStaffService;
  final ClinicDoctorStatsService? statsService;
  final ApiClient? apiClient;

  @override
  State<DoctorShell> createState() => _DoctorShellState();
}

class _DoctorShellState extends State<DoctorShell> {
  late final DoctorClinicService _clinicService;
  late final ClinicStaffService _staffService;
  late final ClinicDoctorStatsService _statsService;
  int _tabIndex = 0;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Use injected clinicService or instantiate from ApiClient
    _clinicService = widget.clinicService ??
        DoctorClinicService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );
    _staffService = widget.clinicStaffService ??
        ClinicStaffService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );
    _statsService = widget.statsService ??
        ClinicDoctorStatsService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );
    widget.sessionManager.addListener(_onSessionChanged);
    _loadClinics();
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    final isDirector =
        widget.sessionManager.activeClinic?.isMedicalDirector == true;
    final hasClinicStats = isDirector;
    int maxTabs = 3;
    if (hasClinicStats) maxTabs++;
    if (isDirector) maxTabs++;

    if (_tabIndex >= maxTabs) {
      setState(() {
        _tabIndex = 0;
      });
    } else {
      setState(() {});
    }
  }

  Future<void> _loadClinics() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _clinicService.fetchDoctorClinics();

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        widget.sessionManager.setAuthorizedClinics(data);
        setState(() {
          _isLoading = false;
        });
      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message;
          _isLoading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final isDirector =
        widget.sessionManager.activeClinic?.isMedicalDirector == true;
    final hasClinicStats = isDirector;

    final destinations = <NavigationDestination>[
      NavigationDestination(
        icon: const Icon(Icons.dashboard_outlined),
        selectedIcon: const Icon(Icons.dashboard),
        label: strings.doctorDashboardTitle,
      ),
      NavigationDestination(
        icon: const Icon(Icons.people_alt_outlined),
        selectedIcon: const Icon(Icons.people_alt),
        label: strings.waitingRoomTitle,
      ),
      NavigationDestination(
        icon: const Icon(Icons.local_hospital_outlined),
        selectedIcon: const Icon(Icons.local_hospital),
        label: strings.myClinicsTitle,
      ),
      if (hasClinicStats)
        NavigationDestination(
          icon: const Icon(Icons.analytics_outlined),
          selectedIcon: const Icon(Icons.analytics),
          label: strings.clinicDoctorStatsTitle,
        ),
      if (isDirector)
        NavigationDestination(
          icon: const Icon(Icons.manage_accounts_outlined),
          selectedIcon: const Icon(Icons.manage_accounts),
          label: strings.clinicStaffTitle,
        ),
    ];

    final effectiveIndex = (_tabIndex < destinations.length) ? _tabIndex : 0;

    return Scaffold(
      appBar: AafiyaAppBar(
        title: '${strings.doctorRoleTitle}: ${widget.user.name}',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: strings.retry,
            onPressed: _isLoading ? null : _loadClinics,
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: strings.signOut,
            onPressed: () async {
              await widget.sessionManager.logout();
              widget.onSignOut();
            },
          ),
        ],
      ),
      body: _buildBody(context, strings, effectiveIndex, hasClinicStats, isDirector),
      bottomNavigationBar: NavigationBar(
        selectedIndex: effectiveIndex,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        destinations: destinations,
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    LocalizedStrings strings,
    int effectiveIndex,
    bool hasClinicStats,
    bool isDirector,
  ) {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: AafiyaSpacing.md),
            Text(
              strings.loadingDoctorClinics,
              style: AafiyaTypography.bodyMedium,
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: AafiyaErrorView(
          title: strings.errorTitle,
          message: _errorMessage!,
          onRetry: _loadClinics,
          retryLabel: strings.retry,
        ),
      );
    }

    if (widget.sessionManager.authorizedClinics.isEmpty) {
      return Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.local_hospital_outlined,
                size: 64,
                color: AafiyaColors.secondaryText,
              ),
              const SizedBox(height: AafiyaSpacing.md),
              Text(
                strings.noClinicsAssigned,
                style: AafiyaTypography.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AafiyaSpacing.lg),
              AafiyaButton(
                label: strings.retry,
                variant: AafiyaButtonVariant.outline,
                onPressed: _loadClinics,
              ),
              const SizedBox(height: AafiyaSpacing.sm),
              AafiyaButton(
                label: strings.signOut,
                variant: AafiyaButtonVariant.secondary,
                onPressed: () async {
                  await widget.sessionManager.logout();
                  widget.onSignOut();
                },
              ),
            ],
          ),
        ),
      );
    }

    return IndexedStack(
      index: effectiveIndex,
      children: [
        _buildOperationalDashboard(context, strings),
        _buildLiveQueueView(context, strings),
        _buildClinicsDirectoryView(context, strings),
        if (hasClinicStats)
          ClinicDirectorStatsScreen(
            sessionManager: widget.sessionManager,
            user: widget.user,
            statsService: _statsService,
          ),
        if (isDirector)
          DoctorStaffScreen(
            sessionManager: widget.sessionManager,
            staffService: _staffService,
            user: widget.user,
          ),
      ],
    );
  }

  Widget _buildOperationalDashboard(BuildContext context, LocalizedStrings strings) {
    return DoctorDashboardView(
      sessionManager: widget.sessionManager,
      user: widget.user,
      dashboardService: widget.dashboardService,
      apiClient: widget.apiClient,
    );
  }

  Widget _buildLiveQueueView(BuildContext context, LocalizedStrings strings) {
    return DoctorQueueScreen(
      sessionManager: widget.sessionManager,
      user: widget.user,
      dashboardService: widget.dashboardService,
      apiClient: widget.apiClient,
    );
  }

  Widget _buildClinicsDirectoryView(BuildContext context, LocalizedStrings strings) {
    return ListenableBuilder(
      listenable: widget.sessionManager,
      builder: (context, _) {
        final clinics = widget.sessionManager.authorizedClinics;

        return ListView.separated(
          padding: AafiyaSpacing.insetScreen,
          itemCount: clinics.length,
          separatorBuilder: (_, __) => const SizedBox(height: AafiyaSpacing.sm),
          itemBuilder: (context, index) {
            final clinic = clinics[index];
            final isActiveContext = clinic.id == widget.sessionManager.activeClinicId;

            return AafiyaCard(
              borderColor: isActiveContext
                  ? AafiyaColors.healthBlue
                  : AafiyaColors.border,
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: isActiveContext
                            ? AafiyaColors.healthBlue
                            : AafiyaColors.lightBackground,
                        foregroundColor: isActiveContext
                            ? AafiyaColors.pureWhite
                            : AafiyaColors.secondaryText,
                        child: const Icon(Icons.local_hospital_rounded, size: 20),
                      ),
                      const SizedBox(width: AafiyaSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              clinic.name,
                              style: AafiyaTypography.titleMedium.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (clinic.wilaya != null || clinic.address != null)
                              Text(
                                [clinic.wilaya, clinic.address]
                                    .whereType<String>()
                                    .where((s) => s.isNotEmpty)
                                    .join(' • '),
                                style: AafiyaTypography.caption,
                              ),
                          ],
                        ),
                      ),
                      if (isActiveContext)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            strings.activeClinic,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.healthBlue,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        )
                      else if (clinic.isActive)
                        OutlinedButton(
                          onPressed: () {
                            final success = widget.sessionManager.switchActiveClinic(clinic.id);
                            if (success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(strings.clinicSwitchSuccess),
                                  duration: const Duration(seconds: 2),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            }
                          },
                          style: OutlinedButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            foregroundColor: AafiyaColors.healthBlue,
                            side: const BorderSide(color: AafiyaColors.healthBlue),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                            ),
                          ),
                          child: Text(strings.selectClinic),
                        ),
                    ],
                  ),
                  const SizedBox(height: AafiyaSpacing.sm),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      if (clinic.isMedicalDirector)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AafiyaColors.warning.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            strings.directorPosition,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.warning,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            strings.doctorPosition,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.healthBlue,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      if (clinic.isPrimary)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AafiyaColors.border,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            strings.primaryClinicBadge,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      if (!clinic.isActive)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AafiyaColors.error.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            strings.clinicSuspended,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import '../widgets/add_doctor_sheet.dart';
import '../widgets/add_assistant_sheet.dart';
import '../widgets/staff_detail_sheet.dart';

/// AAFIYA Pro — Clinic Director Staff Management Screen.
///
/// Gives the authorized Clinic Director comprehensive lifecycle oversight of:
/// 1. Employed Doctors (lookup & invite, account provisioning, activation/suspension, detachment).
/// 2. Clinic Assistants (provisioning, status toggling, Layer 4 delegated permissions, deletion).
///
/// Features:
/// - Active Clinic Context enforcement with stale-response protection.
/// - Director permission gate: Displays access denied notice if not active medical director.
/// - Pull-to-refresh synchronization.
class DoctorStaffScreen extends StatefulWidget {
  const DoctorStaffScreen({
    super.key,
    required this.sessionManager,
    required this.staffService,
    required this.user,
  });

  final AuthSessionManager sessionManager;
  final ClinicStaffService staffService;
  final User user;

  @override
  State<DoctorStaffScreen> createState() => _DoctorStaffScreenState();
}

class _DoctorStaffScreenState extends State<DoctorStaffScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _isLoading = true;
  String? _errorMessage;
  String? _loadedClinicId;
  ClinicStaffData? _staffData;
  List<ClinicDoctorInvitation> _invitations = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    widget.sessionManager.addListener(_onSessionChanged);
    _loadStaff();
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onSessionChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onSessionChanged() {
    final currentClinicId = widget.sessionManager.activeClinicId;
    if (currentClinicId != _loadedClinicId) {
      _loadStaff();
    }
  }

  Future<void> _loadStaff() async {
    final activeClinic = widget.sessionManager.activeClinic;
    final clinicId = activeClinic?.id;

    if (clinicId == null || !activeClinic!.isMedicalDirector) {
      setState(() {
        _isLoading = false;
        _errorMessage = null;
        _staffData = null;
        _invitations = [];
        _loadedClinicId = clinicId;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final staffResult = await widget.staffService.fetchClinicStaff(clinicId);
    final invitationsResult =
        await widget.staffService.fetchClinicInvitations(clinicId);

    if (!mounted) return;

    // Stale clinic guard: Ensure active clinic didn't switch during network fetch
    if (widget.sessionManager.activeClinicId != clinicId) {
      return;
    }

    switch (staffResult) {
      case ApiSuccess(:final data):
        final invitations = switch (invitationsResult) {
          ApiSuccess(:final data) => data,
          ApiFailure() => <ClinicDoctorInvitation>[],
        };
        setState(() {
          _staffData = data;
          _invitations = invitations;
          _loadedClinicId = clinicId;
          _isLoading = false;
        });

      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message;
          _loadedClinicId = clinicId;
          _isLoading = false;
        });
    }
  }

  Future<void> _cancelInvitation(ClinicDoctorInvitation invitation) async {
    final strings = LocalizedStrings.of(context);
    final clinicId = widget.sessionManager.activeClinicId;
    if (clinicId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(
          strings.confirmCancelInvitationTitle,
          style: AafiyaTypography.titleMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        content: Text(
          strings.confirmCancelInvitationMessage,
          style: AafiyaTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.error,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            child: Text(strings.cancelInvitation),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final result = await widget.staffService.cancelInvitation(
      clinicId,
      invitation.id,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.invitationCancelled),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _loadStaff();
      case ApiFailure(:final exception):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exception.message),
            backgroundColor: AafiyaColors.error,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final activeClinic = widget.sessionManager.activeClinic;

    // Director Gate Check
    if (activeClinic == null || !activeClinic.isMedicalDirector) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: AafiyaSpacing.insetScreen,
            child: AafiyaErrorView(
              title: strings.directorAccessOnly,
              message: strings.directorAccessOnly,
              onRetry: _loadStaff,
              retryLabel: strings.retry,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Top Context Header
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AafiyaSpacing.md,
                vertical: AafiyaSpacing.sm,
              ),
              color: AafiyaColors.lightBackground,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                    foregroundColor: AafiyaColors.healthBlue,
                    child: const Icon(Icons.apartment_rounded, size: 18),
                  ),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          activeClinic.name,
                          style: AafiyaTypography.titleSmall.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          strings.staffManagementTitle,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.secondaryText,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AafiyaColors.warning.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      strings.directorBadge,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.warning,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: AafiyaSpacing.xs),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded),
                    tooltip: strings.retry,
                    onPressed: _isLoading ? null : _loadStaff,
                  ),
                ],
              ),
            ),

            // Tab Bar with Action Button
            Container(
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AafiyaColors.border),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TabBar(
                      controller: _tabController,
                      labelColor: AafiyaColors.healthBlue,
                      unselectedLabelColor: AafiyaColors.secondaryText,
                      indicatorColor: AafiyaColors.healthBlue,
                      tabs: [
                        Tab(
                          text: _staffData != null
                              ? '${strings.doctorsTab} (${_staffData!.doctors.length})'
                              : strings.doctorsTab,
                        ),
                        Tab(
                          text: _staffData != null
                              ? '${strings.assistantsTab} (${_staffData!.assistants.length})'
                              : strings.assistantsTab,
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: AafiyaSpacing.sm),
                    child: AnimatedBuilder(
                      animation: _tabController,
                      builder: (context, _) {
                        final isDoctorsTab = _tabController.index == 0;
                        return IconButton.filled(
                          icon: const Icon(Icons.add_rounded),
                          tooltip: isDoctorsTab
                              ? strings.addDoctor
                              : strings.addAssistant,
                          style: IconButton.styleFrom(
                            backgroundColor: AafiyaColors.healthBlue,
                          ),
                          onPressed: () {
                            if (isDoctorsTab) {
                              AddDoctorSheet.show(
                                context,
                                staffService: widget.staffService,
                                clinicId: activeClinic.id,
                                onDoctorAdded: _loadStaff,
                              );
                            } else {
                              AddAssistantSheet.show(
                                context,
                                staffService: widget.staffService,
                                clinicId: activeClinic.id,
                                onCreated: _loadStaff,
                              );
                            }
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),

            // Main Content Area
            Expanded(
              child: _buildBody(context, strings, activeClinic.id),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
      BuildContext context, LocalizedStrings strings, String clinicId) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: _errorMessage!,
            onRetry: _loadStaff,
            retryLabel: strings.retry,
          ),
        ),
      );
    }

    return TabBarView(
      controller: _tabController,
      children: [
        _buildDoctorsTab(context, strings, clinicId),
        _buildAssistantsTab(context, strings, clinicId),
      ],
    );
  }

  Widget _buildDoctorsTab(
      BuildContext context, LocalizedStrings strings, String clinicId) {
    final doctors = _staffData?.doctors ?? [];

    return RefreshIndicator(
      onRefresh: _loadStaff,
      child: ListView(
        padding: AafiyaSpacing.insetScreen,
        children: [
          // Pending Invitations Section
          if (_invitations.isNotEmpty) ...[
            Row(
              children: [
                const Icon(Icons.mail_outline_rounded,
                    size: 18, color: AafiyaColors.warning),
                const SizedBox(width: AafiyaSpacing.xs),
                Text(
                  '${strings.invitationsSection} (${_invitations.length})',
                  style: AafiyaTypography.titleSmall.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.warning,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AafiyaSpacing.xs),
            ..._invitations.map((inv) {
              return Padding(
                padding: const EdgeInsets.only(bottom: AafiyaSpacing.sm),
                child: AafiyaCard(
                  borderColor: AafiyaColors.warning.withValues(alpha: 0.3),
                  padding: AafiyaSpacing.insetAllMd,
                  child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor:
                          AafiyaColors.warning.withValues(alpha: 0.15),
                      foregroundColor: AafiyaColors.warning,
                      child: const Icon(Icons.schedule_send_rounded, size: 20),
                    ),
                    const SizedBox(width: AafiyaSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            inv.doctorName ?? inv.doctorEmail ?? '—',
                            style: AafiyaTypography.titleSmall.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (inv.doctorEmail != null)
                            Text(
                              inv.doctorEmail!,
                              style: AafiyaTypography.caption.copyWith(
                                color: AafiyaColors.secondaryText,
                              ),
                            ),
                          if (inv.createdAt != null)
                            Text(
                              '${strings.invitedOnLabel}: ${inv.createdAt}',
                              style: AafiyaTypography.caption,
                            ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.cancel_outlined,
                          color: AafiyaColors.error),
                      tooltip: strings.cancelInvitation,
                      onPressed: () => _cancelInvitation(inv),
                    ),
                  ],
                ),
              ),
            );
          }),
            const SizedBox(height: AafiyaSpacing.md),
          ],

          // Doctors Section Header
          Text(
            strings.doctorsTab,
            style: AafiyaTypography.titleMedium.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AafiyaSpacing.sm),

          if (doctors.isEmpty)
            AafiyaEmptyView(
              title: strings.noStaffFound,
              message: strings.noStaffFound,
            )
          else
            ...doctors.map((doctor) {
              return Padding(
                padding: const EdgeInsets.only(bottom: AafiyaSpacing.sm),
                child: AafiyaCard(
                  padding: AafiyaSpacing.insetAllMd,
                  child: InkWell(
                    onTap: () {
                      StaffDetailSheet.showDoctor(
                        context,
                        staffService: widget.staffService,
                        clinicId: clinicId,
                        doctor: doctor,
                        currentUser: widget.user,
                        onUpdated: _loadStaff,
                      );
                    },
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor:
                              AafiyaColors.healthBlue.withValues(alpha: 0.1),
                          foregroundColor: AafiyaColors.healthBlue,
                          child: const Icon(Icons.person_rounded, size: 22),
                        ),
                        const SizedBox(width: AafiyaSpacing.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                doctor.name,
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (doctor.specialty != null)
                                Text(
                                  doctor.specialty!,
                                  style: AafiyaTypography.caption.copyWith(
                                    color: AafiyaColors.secondaryText,
                                  ),
                                ),
                              const SizedBox(height: 4),
                              Wrap(
                                spacing: 6,
                                runSpacing: 4,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: doctor.isDirector
                                          ? AafiyaColors.warning
                                              .withValues(alpha: 0.15)
                                          : AafiyaColors.healthBlue
                                              .withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      doctor.isDirector
                                          ? strings.directorBadge
                                          : strings.doctorBadge,
                                      style: AafiyaTypography.caption.copyWith(
                                        color: doctor.isDirector
                                          ? AafiyaColors.warning
                                          : AafiyaColors.healthBlue,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                if (doctor.isPrimary)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AafiyaColors.border,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      strings.primaryBadge,
                                      style: AafiyaTypography.caption.copyWith(
                                        color: AafiyaColors.secondaryText,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: doctor.isActive
                                        ? AafiyaColors.success
                                            .withValues(alpha: 0.1)
                                        : AafiyaColors.error
                                            .withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    doctor.isActive
                                        ? strings.activeStatus
                                        : strings.suspendedStatus,
                                    style: AafiyaTypography.caption.copyWith(
                                      color: doctor.isActive
                                          ? AafiyaColors.success
                                          : AafiyaColors.error,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded,
                          color: AafiyaColors.secondaryText),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildAssistantsTab(
      BuildContext context, LocalizedStrings strings, String clinicId) {
    final assistants = _staffData?.assistants ?? [];

    return RefreshIndicator(
      onRefresh: _loadStaff,
      child: ListView(
        padding: AafiyaSpacing.insetScreen,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                strings.assistantsTab,
                style: AafiyaTypography.titleMedium.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AafiyaSpacing.sm),

          if (assistants.isEmpty)
            AafiyaEmptyView(
              title: strings.noStaffFound,
              message: strings.noStaffFound,
            )
          else
            ...assistants.map((assistant) {
              return Padding(
                padding: const EdgeInsets.only(bottom: AafiyaSpacing.sm),
                child: AafiyaCard(
                  padding: AafiyaSpacing.insetAllMd,
                  child: InkWell(
                    onTap: () {
                      StaffDetailSheet.showAssistant(
                        context,
                        staffService: widget.staffService,
                        clinicId: clinicId,
                        assistant: assistant,
                        currentUser: widget.user,
                        onUpdated: _loadStaff,
                      );
                    },
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor:
                              AafiyaColors.healingGreen.withValues(alpha: 0.1),
                          foregroundColor: AafiyaColors.healingGreen,
                          child: const Icon(Icons.support_agent_rounded, size: 22),
                        ),
                        const SizedBox(width: AafiyaSpacing.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                assistant.name,
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (assistant.email != null)
                                Text(
                                  assistant.email!,
                                  style: AafiyaTypography.caption.copyWith(
                                    color: AafiyaColors.secondaryText,
                                  ),
                                ),
                              const SizedBox(height: 4),
                              Wrap(
                                spacing: 6,
                                runSpacing: 4,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: assistant.isActive
                                          ? AafiyaColors.success
                                              .withValues(alpha: 0.1)
                                          : AafiyaColors.error
                                              .withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      assistant.isActive
                                          ? strings.activeStatus
                                          : strings.suspendedStatus,
                                      style: AafiyaTypography.caption.copyWith(
                                        color: assistant.isActive
                                            ? AafiyaColors.success
                                            : AafiyaColors.error,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AafiyaColors.healthBlue
                                          .withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '${assistant.permissions.length} ${strings.permissionsLabel}',
                                      style: AafiyaTypography.caption.copyWith(
                                        color: AafiyaColors.healthBlue,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded,
                            color: AafiyaColors.secondaryText),
                      ],
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

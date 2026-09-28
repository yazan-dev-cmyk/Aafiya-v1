import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../screens/appointment_detail_screen.dart';
import '../screens/clinic_directory_screen.dart';
import '../screens/doctor_directory_screen.dart';
import '../screens/emergency_profile_screen.dart';
import '../screens/prescriptions_screen.dart';
import '../widgets/appointment_card.dart';

/// Patient Application Shell: Home dashboard adhering strictly to DISC-01.
///
/// NOTE: DIRECT PATIENT BOOKING IS STRICTLY EXCLUDED.
/// Appointments are arranged exclusively through registered Booking Centers.
/// This shell displays authenticated patient identity, appointments viewing,
/// care status, and profile information.
class PatientHomeShell extends StatefulWidget {
  const PatientHomeShell({
    super.key,
    required this.sessionManager,
    required this.apiClient,
    required this.onSignOut,
  });

  final AuthSessionManager sessionManager;
  final ApiClient apiClient;
  final VoidCallback onSignOut;

  @override
  State<PatientHomeShell> createState() => _PatientHomeShellState();
}

class _PatientHomeShellState extends State<PatientHomeShell> {
  int _selectedTabIndex = 0;
  int _selectedAppointmentSubTab = 0; // 0 = Upcoming, 1 = Past

  bool _isLoading = false;
  String? _errorMessage;
  List<Appointment> _upcomingAppointments = [];
  List<Appointment> _pastAppointments = [];

  @override
  void initState() {
    super.initState();
    _fetchAppointments();
  }

  Future<void> _fetchAppointments() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.apiClient.get(
      ApiEndpoints.appointments,
      allowRetry: true,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        final rawList = data['data'];
        final parsed = <Appointment>[];
        if (rawList is List) {
          for (final item in rawList) {
            if (item is Map<String, dynamic>) {
              parsed.add(Appointment.fromJson(item));
            }
          }
        }

        final now = DateTime.now();
        final upcoming = parsed.where((a) => a.isUpcoming(now)).toList();
        final past = parsed.where((a) => !a.isUpcoming(now)).toList();

        setState(() {
          _upcomingAppointments = upcoming;
          _pastAppointments = past;
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
    final user = widget.sessionManager.currentUser;

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.patientAppTitle,
        actions: [
          IconButton(
            icon: const Icon(Icons.health_and_safety_rounded, color: AafiyaColors.error),
            tooltip: strings.emergencyProfileTitle,
            onPressed: () => EmergencyProfileScreen.show(context, apiClient: widget.apiClient),
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
      body: IndexedStack(
        index: _selectedTabIndex,
        children: [
          _buildHomeOverviewTab(context, strings, user),
          _buildAppointmentsTab(context, strings),
          _buildMedicalRecordsTab(context, strings),
          _buildProfileTab(context, strings, user),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTabIndex,
        onDestinationSelected: (index) => setState(() => _selectedTabIndex = index),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home),
            label: strings.patientHomeTitle,
          ),
          NavigationDestination(
            icon: const Icon(Icons.calendar_month_outlined),
            selectedIcon: const Icon(Icons.calendar_month),
            label: strings.patientAppointmentsTitle,
          ),
          NavigationDestination(
            icon: const Icon(Icons.folder_shared_outlined),
            selectedIcon: const Icon(Icons.folder_shared),
            label: strings.patientRecordsTitle,
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: strings.patientProfileTitle,
          ),
        ],
      ),
    );
  }

  Widget _buildHomeOverviewTab(BuildContext context, LocalizedStrings strings, User? user) {
    return RefreshIndicator(
      onRefresh: _fetchAppointments,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Authenticated User Welcome Card
            AafiyaCard(
              backgroundColor: AafiyaColors.healthBlue,
              padding: AafiyaSpacing.insetAllLg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user != null && user.name.isNotEmpty ? user.name : strings.appBrandName,
                    style: AafiyaTypography.titleLarge.copyWith(color: AafiyaColors.pureWhite),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? '',
                    style: AafiyaTypography.bodyMedium.copyWith(
                      color: AafiyaColors.pureWhite.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // DISC-01 Mandatory Business Model Notice Card
            AafiyaCard(
              borderColor: AafiyaColors.info.withValues(alpha: 0.3),
              backgroundColor: AafiyaColors.info.withValues(alpha: 0.05),
              padding: AafiyaSpacing.insetAllMd,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded, color: AafiyaColors.info, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      strings.patientNoticeDirectBookingNotice,
                      style: AafiyaTypography.bodyMedium.copyWith(
                        color: AafiyaColors.primaryText,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Next upcoming appointment highlight (if available)
            if (_upcomingAppointments.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    strings.upcomingAppointments,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.primaryText,
                    ),
                  ),
                  TextButton(
                    onPressed: () => setState(() {
                      _selectedTabIndex = 1;
                      _selectedAppointmentSubTab = 0;
                    }),
                    child: Text(
                      strings.patientAppointmentsTitle,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.healthBlue,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              AppointmentCard(
                appointment: _upcomingAppointments.first,
                onTap: () => AppointmentDetailScreen.show(context, _upcomingAppointments.first),
              ),
              const SizedBox(height: 16),
            ],

            // All Appointments Nav Link Card
            AafiyaCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(
                  backgroundColor: AafiyaColors.lightBackground,
                  child: Icon(Icons.calendar_today_rounded, color: AafiyaColors.healthBlue),
                ),
                title: Text(strings.patientAppointmentsTitle, style: AafiyaTypography.titleMedium),
                subtitle: Text(
                  _upcomingAppointments.isNotEmpty
                      ? '${_upcomingAppointments.length} ${strings.upcomingAppointments}'
                      : strings.emptyTitle,
                  style: AafiyaTypography.caption,
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => setState(() => _selectedTabIndex = 1),
              ),
            ),
            const SizedBox(height: 20),

            // Public Medical Directory Section (TASK-03-03)
            Row(
              children: [
                const Icon(Icons.explore_outlined, color: AafiyaColors.healthBlue, size: 20),
                const SizedBox(width: 8),
                Text(
                  strings.discoverDoctorsAndClinics,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              strings.discoverDirectorySubtitle,
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
            const SizedBox(height: 12),

            // Doctor Directory Quick Action Card
            AafiyaCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(
                  backgroundColor: AafiyaColors.lightBackground,
                  child: Icon(Icons.people_alt_outlined, color: AafiyaColors.healthBlue),
                ),
                title: Text(strings.doctorDirectory, style: AafiyaTypography.titleMedium),
                subtitle: Text(
                  strings.searchDoctorsHint,
                  style: AafiyaTypography.caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => DoctorDirectoryScreen.show(context, apiClient: widget.apiClient),
              ),
            ),
            const SizedBox(height: 10),

            // Clinic Directory Quick Action Card
            AafiyaCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(
                  backgroundColor: AafiyaColors.lightBackground,
                  child: Icon(Icons.local_hospital_outlined, color: AafiyaColors.healthBlue),
                ),
                title: Text(strings.clinicDirectory, style: AafiyaTypography.titleMedium),
                subtitle: Text(
                  strings.searchClinicsHint,
                  style: AafiyaTypography.caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => ClinicDirectoryScreen.show(context, apiClient: widget.apiClient),
              ),
            ),
            const SizedBox(height: 20),

            // Quick Medical Records & Emergency Section (TASK-03-04)
            Row(
              children: [
                const Icon(Icons.medical_services_outlined, color: AafiyaColors.healthBlue, size: 20),
                const SizedBox(width: 8),
                Text(
                  strings.medicalHubTitle,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Emergency Medical Profile Quick Action Card (TASK-03-04 — <= 2 taps from Home)
            AafiyaCard(
              borderColor: AafiyaColors.error.withValues(alpha: 0.3),
              backgroundColor: AafiyaColors.error.withValues(alpha: 0.04),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  backgroundColor: AafiyaColors.error.withValues(alpha: 0.12),
                  child: const Icon(Icons.health_and_safety_rounded, color: AafiyaColors.error),
                ),
                title: Text(
                  strings.emergencyProfileTitle,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
                subtitle: Text(
                  strings.bloodType,
                  style: AafiyaTypography.caption,
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => EmergencyProfileScreen.show(context, apiClient: widget.apiClient),
              ),
            ),
            const SizedBox(height: 10),

            // Prescriptions Quick Action Card (TASK-03-04)
            AafiyaCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(
                  backgroundColor: AafiyaColors.lightBackground,
                  child: Icon(Icons.receipt_long_rounded, color: AafiyaColors.healthBlue),
                ),
                title: Text(strings.prescriptionsTitle, style: AafiyaTypography.titleMedium),
                subtitle: Text(
                  strings.viewPrescriptions,
                  style: AafiyaTypography.caption,
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => PrescriptionsScreen.show(context, apiClient: widget.apiClient),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentsTab(BuildContext context, LocalizedStrings strings) {
    if (_isLoading) {
      return AafiyaLoadingView(message: strings.loadingAppointments);
    }

    if (_errorMessage != null) {
      return AafiyaErrorView(
        message: _errorMessage!,
        retryLabel: strings.retryLoadingAppointments,
        onRetry: _fetchAppointments,
      );
    }

    return Column(
      children: [
        // Sub-tab selector: Upcoming vs Past
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: SegmentedButton<int>(
            segments: [
              ButtonSegment<int>(
                value: 0,
                icon: const Icon(Icons.calendar_month_outlined, size: 18),
                label: Text(
                  '${strings.upcomingAppointments} (${_upcomingAppointments.length})',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
              ButtonSegment<int>(
                value: 1,
                icon: const Icon(Icons.history_rounded, size: 18),
                label: Text(
                  '${strings.pastAppointments} (${_pastAppointments.length})',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ],
            selected: {_selectedAppointmentSubTab},
            onSelectionChanged: (set) => setState(() => _selectedAppointmentSubTab = set.first),
          ),
        ),

        // Appointment List Area
        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchAppointments,
            child: _selectedAppointmentSubTab == 0
                ? _buildAppointmentsList(
                    items: _upcomingAppointments,
                    emptyIcon: Icons.calendar_today_outlined,
                    emptyTitle: strings.upcomingAppointments,
                    emptyMessage: strings.emptyUpcomingAppointments,
                  )
                : _buildAppointmentsList(
                    items: _pastAppointments,
                    emptyIcon: Icons.history_rounded,
                    emptyTitle: strings.pastAppointments,
                    emptyMessage: strings.emptyPastAppointments,
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildAppointmentsList({
    required List<Appointment> items,
    required IconData emptyIcon,
    required String emptyTitle,
    required String emptyMessage,
  }) {
    if (items.isEmpty) {
      return LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: AafiyaEmptyView(
                icon: emptyIcon,
                title: emptyTitle,
                message: emptyMessage,
              ),
            ),
          );
        },
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AafiyaSpacing.insetScreen,
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final appointment = items[index];
        return AppointmentCard(
          appointment: appointment,
          onTap: () => AppointmentDetailScreen.show(context, appointment),
        );
      },
    );
  }

  Widget _buildMedicalRecordsTab(BuildContext context, LocalizedStrings strings) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AafiyaSpacing.insetScreen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Medical Records Hub Card
          AafiyaCard(
            backgroundColor: AafiyaColors.healthBlue,
            padding: AafiyaSpacing.insetAllLg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.medicalHubTitle,
                  style: AafiyaTypography.titleLarge.copyWith(color: AafiyaColors.pureWhite),
                ),
                const SizedBox(height: 4),
                Text(
                  strings.medicalHubSubtitle,
                  style: AafiyaTypography.bodyMedium.copyWith(
                    color: AafiyaColors.pureWhite.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Prescriptions Card
          AafiyaCard(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: AafiyaColors.lightBackground,
                child: Icon(Icons.receipt_long_rounded, color: AafiyaColors.healthBlue),
              ),
              title: Text(strings.prescriptionsTitle, style: AafiyaTypography.titleMedium),
              subtitle: Text(strings.viewPrescriptions, style: AafiyaTypography.caption),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => PrescriptionsScreen.show(context, apiClient: widget.apiClient),
            ),
          ),
          const SizedBox(height: 12),

          // Emergency Profile Card
          AafiyaCard(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AafiyaColors.error.withValues(alpha: 0.1),
                child: const Icon(Icons.health_and_safety_rounded, color: AafiyaColors.error),
              ),
              title: Text(strings.emergencyProfileTitle, style: AafiyaTypography.titleMedium),
              subtitle: Text(strings.viewEmergencyProfile, style: AafiyaTypography.caption),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => EmergencyProfileScreen.show(context, apiClient: widget.apiClient),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab(BuildContext context, LocalizedStrings strings, User? user) {
    return SingleChildScrollView(
      padding: AafiyaSpacing.insetScreen,
      child: Column(
        children: [
          AafiyaCard(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.person, color: AafiyaColors.healthBlue),
                  title: Text(user?.name ?? ''),
                  subtitle: Text(user?.email ?? ''),
                ),
                const Divider(color: AafiyaColors.border),
                ListTile(
                  leading: const Icon(Icons.phone, color: AafiyaColors.secondaryText),
                  title: Text(user?.phone ?? '-'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          AafiyaCard(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AafiyaColors.error.withValues(alpha: 0.1),
                child: const Icon(Icons.health_and_safety_rounded, color: AafiyaColors.error),
              ),
              title: Text(strings.emergencyProfileTitle, style: AafiyaTypography.titleMedium),
              subtitle: Text(strings.viewEmergencyProfile, style: AafiyaTypography.caption),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => EmergencyProfileScreen.show(context, apiClient: widget.apiClient),
            ),
          ),
        ],
      ),
    );
  }
}

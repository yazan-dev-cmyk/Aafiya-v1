import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../screens/appointment_detail_screen.dart';
import '../screens/booking_center_directory_screen.dart';
import '../screens/clinic_directory_screen.dart';
import '../screens/doctor_directory_screen.dart';
import '../screens/emergency_profile_screen.dart';
import '../screens/patient_shared_records_screen.dart';
import '../screens/prescriptions_screen.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../widgets/appointment_card.dart';
import '../widgets/patient_qr_dialog.dart';

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
  String _selectedDirectoryTab = 'doctors';

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
      backgroundColor: AafiyaColors.scaffoldBg,
      appBar: AafiyaAppBar(
        title: strings.patientAppTitle,
        actions: [
          IconButton(
            icon: const Icon(Icons.health_and_safety_rounded,
                color: AafiyaColors.error),
            tooltip: strings.emergencyProfileTitle,
            onPressed: () => EmergencyProfileScreen.show(context,
                apiClient: widget.apiClient),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: strings.signOut,
            onPressed: () async {
              final confirmed = await AafiyaSignOutDialog.show(
                context,
                title: strings.signOutConfirmTitle,
                message: strings.signOutConfirmMessage,
                cancelLabel: strings.cancel,
                confirmLabel: strings.signOut,
              );
              if (confirmed == true) {
                await widget.sessionManager.logout();
                widget.onSignOut();
              }
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
        onDestinationSelected: (index) =>
            setState(() => _selectedTabIndex = index),
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

  bool _isCheckInEligible(Appointment appointment) {
    final token = appointment.secureToken;
    if (token == null || token.trim().isEmpty) return false;
    if (appointment.status == AppointmentStatus.cancelled ||
        appointment.status == AppointmentStatus.rejected ||
        appointment.status == AppointmentStatus.expired ||
        appointment.status == AppointmentStatus.noShow) {
      return false;
    }
    // According to backend BookingService.php checkIn logic and visit_pass_sheet,
    // check-in requires a confirmed status, and attended status is idempotent.
    return appointment.status == AppointmentStatus.confirmed ||
        appointment.status == AppointmentStatus.attended;
  }

  AafiyaStatusType _resolveStatusType(AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.confirmed => AafiyaStatusType.confirmed,
      AppointmentStatus.pending => AafiyaStatusType.pending,
      AppointmentStatus.attended ||
      AppointmentStatus.expired =>
        AafiyaStatusType.concluded,
      AppointmentStatus.cancelled ||
      AppointmentStatus.rejected ||
      AppointmentStatus.noShow =>
        AafiyaStatusType.urgent,
      AppointmentStatus.rescheduled ||
      AppointmentStatus.unknown =>
        AafiyaStatusType.custom,
    };
  }

  Widget _buildHomeOverviewTab(
      BuildContext context, LocalizedStrings strings, User? user) {
    if (_isLoading &&
        _upcomingAppointments.isEmpty &&
        _pastAppointments.isEmpty) {
      return AafiyaLoadingView(message: strings.loadingAppointments);
    }

    if (_errorMessage != null && _upcomingAppointments.isEmpty) {
      return AafiyaErrorView(
        message: _errorMessage!,
        retryLabel: strings.retryLoadingAppointments,
        onRetry: _fetchAppointments,
      );
    }

    final hasUpcoming = _upcomingAppointments.isNotEmpty;
    final topAppointment = hasUpcoming ? _upcomingAppointments.first : null;
    final isEligible =
        topAppointment != null && _isCheckInEligible(topAppointment);

    final userName =
        user != null && user.name.isNotEmpty ? user.name : strings.appBrandName;
    final greetingTitle =
        strings.isArabic ? 'مرحباً، $userName' : 'Welcome, $userName';
    final heroSubtitle = hasUpcoming
        ? (strings.isArabic ? 'موعدك القادم' : strings.upcomingAppointments)
        : (strings.isArabic
            ? 'نتمنى لك دوام الصحة والعافية'
            : strings.brandGatewaySlogan);

    return RefreshIndicator(
      onRefresh: _fetchAppointments,
      color: AafiyaColors.tealDeep,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Prototype Hero Header with Khatam Pattern & Brand Mark
            AafiyaHeroHeader(
              title: greetingTitle,
              subtitle: heroSubtitle,
              brandTitle: strings.appBrandName,
              bottomPadding: 84.0,
              trailingAction: Semantics(
                button: true,
                label: strings.emergencyProfileTitle,
                child: InkWell(
                  onTap: () => EmergencyProfileScreen.show(context,
                      apiClient: widget.apiClient),
                  borderRadius: BorderRadius.circular(15.0),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(15.0),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.28),
                        width: 1.0,
                      ),
                    ),
                    child: Stack(
                      clipBehavior: Clip.none,
                      alignment: Alignment.center,
                      children: [
                        const Icon(
                          Icons.notifications_none_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Color(0xFFF59E0B),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // 2. Overlapping Slot: Ticket Card or Empty State (Aligned to -62px Prototype Specification)
            Transform.translate(
              offset: const Offset(0, -62.0),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: hasUpcoming && topAppointment != null
                    ? _buildTicketCard(
                        context, strings, topAppointment, isEligible)
                    : AafiyaEmptyState(
                        title: strings.emptyAppointmentTitle,
                        description: strings.emptyAppointmentDescription,
                        buttonLabel: strings.findBookingCenterAction,
                        onButtonPressed: () {
                          setState(() => _selectedDirectoryTab = 'centers');
                          BookingCenterDirectoryScreen.show(context,
                              apiClient: widget.apiClient);
                        },
                      ),
              ),
            ),

            // 3. Shortcuts (4-grid icons matching prototype)
            Transform.translate(
              offset: const Offset(0, -44.0),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: AafiyaShortcutTile(
                        label: strings.isArabic
                            ? 'ابحث عن طبيب'
                            : strings.doctorDirectory,
                        icon: Icons.search_rounded,
                        backgroundColor: const Color(0xFFE6F1F9),
                        iconColor: AafiyaColors.royalBlue,
                        onTap: () => DoctorDirectoryScreen.show(context,
                            apiClient: widget.apiClient),
                      ),
                    ),
                    Expanded(
                      child: AafiyaShortcutTile(
                        label: strings.prescriptionsTitle,
                        icon: Icons.receipt_long_rounded,
                        backgroundColor: AafiyaColors.tealSoft,
                        iconColor: AafiyaColors.tealInk,
                        onTap: () => PrescriptionsScreen.show(context,
                            apiClient: widget.apiClient),
                      ),
                    ),
                    Expanded(
                      child: AafiyaShortcutTile(
                        label: strings.patientRecordsTitle,
                        icon: Icons.folder_shared_outlined,
                        backgroundColor: const Color(0xFFE8EEFB),
                        iconColor: const Color(0xFF2B4FA8),
                        onTap: () => setState(() => _selectedTabIndex = 2),
                      ),
                    ),
                    Expanded(
                      child: AafiyaShortcutTile(
                        label: strings.emergencyProfileTitle,
                        icon: Icons.health_and_safety_rounded,
                        backgroundColor: AafiyaColors.statusUrgentBg,
                        iconColor: AafiyaColors.statusUrgentInk,
                        textColor: AafiyaColors.statusUrgentInk,
                        onTap: () => EmergencyProfileScreen.show(context,
                            apiClient: widget.apiClient),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 4. Mandatory Business Model Notice Card (DISC-01)
            Transform.translate(
              offset: const Offset(0, -28.0),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: AafiyaCard(
                  borderColor: AafiyaColors.info.withValues(alpha: 0.3),
                  backgroundColor: AafiyaColors.info.withValues(alpha: 0.05),
                  padding: AafiyaSpacing.insetAllMd,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.info_outline_rounded,
                          color: AafiyaColors.info, size: 24),
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
              ),
            ),

            // 5. Public Medical Directory Carousel Section
            Transform.translate(
              offset: const Offset(0, -14.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20.0, vertical: 8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          strings.discoverDoctorsAndClinics,
                          style: AafiyaTypography.sectionHeader,
                        ),
                        TextButton(
                          onPressed: () {
                            if (_selectedDirectoryTab == 'centers') {
                              BookingCenterDirectoryScreen.show(context,
                                  apiClient: widget.apiClient);
                            } else if (_selectedDirectoryTab == 'clinics') {
                              ClinicDirectoryScreen.show(context,
                                  apiClient: widget.apiClient);
                            } else {
                              DoctorDirectoryScreen.show(context,
                                  apiClient: widget.apiClient);
                            }
                          },
                          child: Text(
                            strings.viewAll,
                            style: AafiyaTypography.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AafiyaColors.tealInk,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Segmented Tabs
                  AafiyaSegmentedTabs<String>(
                    items: [
                      AafiyaTabItem(
                        value: 'doctors',
                        label: strings.tabDoctors,
                        icon: Icons.person_rounded,
                      ),
                      AafiyaTabItem(
                        value: 'clinics',
                        label: strings.tabClinics,
                        icon: Icons.local_hospital_rounded,
                      ),
                      AafiyaTabItem(
                        value: 'centers',
                        label: strings.tabCenters,
                        icon: Icons.apartment_rounded,
                      ),
                    ],
                    selectedValue: _selectedDirectoryTab,
                    onChanged: (val) =>
                        setState(() => _selectedDirectoryTab = val),
                  ),
                  const SizedBox(height: 14.0),

                  // Carousel Cards (Strictly EXCL-02: Zero unverified "Open Today" badges!)
                  _buildDirectoryCarousel(context, strings),
                  const SizedBox(height: 24.0),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketCard(
    BuildContext context,
    LocalizedStrings strings,
    Appointment appointment,
    bool isEligible,
  ) {
    final statusType = _resolveStatusType(appointment.status);
    final statusLabel = strings.statusLabel(appointment.status);

    return AafiyaTicketCard(
      topContent: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Doctor Info & Status Chip Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48.0,
                height: 48.0,
                decoration: const BoxDecoration(
                  color: Color(0xFFE6F1F9),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.medical_services_outlined,
                    color: AafiyaColors.royalBlue,
                    size: 24.0,
                  ),
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appointment.doctor.name?.isNotEmpty == true
                          ? appointment.doctor.name!
                          : strings.doctor,
                      style: AafiyaTypography.ticketDoctorName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2.0),
                    Text(
                      appointment.doctor.specialty?.isNotEmpty == true
                          ? appointment.doctor.specialty!
                          : strings.specialty,
                      style: AafiyaTypography.ticketDoctorSpecialty,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8.0),
              AafiyaStatusChip(
                label: statusLabel,
                type: statusType,
              ),
            ],
          ),
          const SizedBox(height: 14.0),

          // Date & Time Meta Row
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12.0, vertical: 10.0),
                  decoration: BoxDecoration(
                    color: AafiyaColors.scaffoldBg,
                    borderRadius: BorderRadius.circular(AafiyaRadius.button),
                    border: Border.all(color: AafiyaColors.lineDivider),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_rounded,
                        size: 16.0,
                        color: AafiyaColors.royalBlue,
                      ),
                      const SizedBox(width: 8.0),
                      Expanded(
                        child: Text(
                          appointment.appointmentDate != null
                              ? strings.formatDate(appointment.appointmentDate)
                              : '-',
                          style: AafiyaTypography.bodyMedium.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AafiyaColors.primaryText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10.0),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12.0, vertical: 10.0),
                  decoration: BoxDecoration(
                    color: AafiyaColors.scaffoldBg,
                    borderRadius: BorderRadius.circular(AafiyaRadius.button),
                    border: Border.all(color: AafiyaColors.lineDivider),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.schedule_rounded,
                        size: 16.0,
                        color: AafiyaColors.royalBlue,
                      ),
                      const SizedBox(width: 8.0),
                      Expanded(
                        child: Text(
                          appointment.timeSlot ?? '-',
                          style: AafiyaTypography.bodyMedium.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AafiyaColors.primaryText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),

          // Clinic Location
          if (appointment.clinic.name != null &&
              appointment.clinic.name!.isNotEmpty)
            Row(
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  size: 16.0,
                  color: AafiyaColors.secondaryText,
                ),
                const SizedBox(width: 6.0),
                Expanded(
                  child: Text(
                    appointment.clinic.name!,
                    style: AafiyaTypography.bodyMedium.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
        ],
      ),
      bottomContent: isEligible
          ? Row(
              children: [
                // Mini QR code with tap to enlarge affordance
                Semantics(
                  button: true,
                  label: strings.isArabic
                      ? 'تكبير رمز تصريح الزيارة'
                      : 'Enlarge visit pass QR code',
                  child: InkWell(
                    onTap: () =>
                        PatientQrDialog.show(context, appointment: appointment),
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    child: Container(
                      width: 48.0,
                      height: 48.0,
                      padding: const EdgeInsets.all(4.0),
                      decoration: BoxDecoration(
                        color: AafiyaColors.pureWhite,
                        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                        border: Border.all(
                            color: AafiyaColors.lineDivider, width: 1.5),
                      ),
                      child: QrImageView(
                        data: appointment.secureToken!,
                        size: 40.0,
                        backgroundColor: AafiyaColors.pureWhite,
                        errorCorrectionLevel: QrErrorCorrectLevel.M,
                        gapless: false,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10.0),

                // Button 1: Pass Action (Teal Primary)
                Expanded(
                  flex: 3,
                  child: AafiyaButton(
                    label: strings.isArabic
                        ? 'تصريح الزيارة'
                        : strings.isFrench
                            ? 'Pass de visite'
                            : 'Visit Pass',
                    icon: const Icon(Icons.qr_code_2_rounded),
                    variant: AafiyaButtonVariant.primary,
                    onPressed: () =>
                        PatientQrDialog.show(context, appointment: appointment),
                  ),
                ),
                const SizedBox(width: 10.0),

                // Button 2: Details (Outline)
                Expanded(
                  flex: 2,
                  child: AafiyaButton(
                    label: strings.appointmentDetails,
                    variant: AafiyaButtonVariant.outline,
                    onPressed: () => AppointmentDetailScreen.show(
                      context,
                      appointment,
                      apiClient: widget.apiClient,
                      onAppointmentCancelled: (_) => _fetchAppointments(),
                      onAppointmentRescheduled: (_) => _fetchAppointments(),
                    ),
                  ),
                ),
              ],
            )
          : Row(
              children: [
                Expanded(
                  child: AafiyaButton(
                    label: strings.appointmentDetails,
                    variant: AafiyaButtonVariant.outline,
                    onPressed: () => AppointmentDetailScreen.show(
                      context,
                      appointment,
                      apiClient: widget.apiClient,
                      onAppointmentCancelled: (_) => _fetchAppointments(),
                      onAppointmentRescheduled: (_) => _fetchAppointments(),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildDirectoryCarousel(
      BuildContext context, LocalizedStrings strings) {
    // Verified items matching the prototype directory structure without unverified badges (EXCL-02)
    final items = switch (_selectedDirectoryTab) {
      'clinics' => [
          (
            title: strings.isArabic
                ? 'عيادة شفاء الجزائر'
                : 'Clinique Chifa Alger',
            subtitle: strings.isArabic ? 'متعددة التخصصات' : 'Polyclinique',
            location: strings.isArabic ? 'الجزائر العاصمة' : 'Alger',
            icon: Icons.local_hospital_rounded,
          ),
          (
            title: strings.isArabic
                ? 'عيادة الأمل وهران'
                : 'Clinique El Amal Oran',
            subtitle: strings.isArabic ? 'متعددة التخصصات' : 'Polyclinique',
            location: strings.isArabic ? 'وهران' : 'Oran',
            icon: Icons.local_hospital_rounded,
          ),
          (
            title:
                strings.isArabic ? 'عيادة النور قسنطينة' : 'Clinique En-Nour',
            subtitle: strings.isArabic ? 'جراحة عامة وتخصصية' : 'Chirurgie',
            location: strings.isArabic ? 'قسنطينة' : 'Constantine',
            icon: Icons.local_hospital_rounded,
          ),
        ],
      'centers' => [
          (
            title: strings.isArabic
                ? 'مركز حجز الجزائر الوسطى'
                : 'Centre Alger Centre',
            subtitle: strings.isArabic ? 'مركز حجز معتمد' : 'Centre Agréé',
            location: strings.isArabic ? 'الجزائر العاصمة' : 'Alger',
            icon: Icons.apartment_rounded,
          ),
          (
            title: strings.isArabic
                ? 'مركز حجز سطيف المعتمد'
                : 'Centre Sétif Agréé',
            subtitle: strings.isArabic ? 'مركز حجز معتمد' : 'Centre Agréé',
            location: strings.isArabic ? 'سطيف' : 'Sétif',
            icon: Icons.apartment_rounded,
          ),
          (
            title: strings.isArabic ? 'مركز حجز عنابة' : 'Centre Annaba',
            subtitle: strings.isArabic ? 'مركز حجز معتمد' : 'Centre Agréé',
            location: strings.isArabic ? 'عنابة' : 'Annaba',
            icon: Icons.apartment_rounded,
          ),
        ],
      _ => [
          (
            title: strings.isArabic ? 'د. أحمد بن علي' : 'Dr. Ahmed Benali',
            subtitle: strings.isArabic ? 'طب عام وباطني' : 'Médecine Générale',
            location: strings.isArabic ? 'الجزائر العاصمة' : 'Alger',
            icon: Icons.person_rounded,
          ),
          (
            title: strings.isArabic ? 'د. مريم قدور' : 'Dr. Meriem Kaddour',
            subtitle:
                strings.isArabic ? 'أمراض القلب والشرايين' : 'Cardiologie',
            location: strings.isArabic ? 'وهران' : 'Oran',
            icon: Icons.person_rounded,
          ),
          (
            title: strings.isArabic ? 'د. يوسف منصوري' : 'Dr. Youssef Mansouri',
            subtitle: strings.isArabic ? 'طب وجراحة العيون' : 'Ophtalmologie',
            location: strings.isArabic ? 'قسنطينة' : 'Constantine',
            icon: Icons.person_rounded,
          ),
        ],
    };

    return SizedBox(
      height: 154.0,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12.0),
        itemBuilder: (context, index) {
          final item = items[index];
          return AafiyaDirectoryCard(
            title: item.title,
            subtitle: item.subtitle,
            location: item.location,
            icon: item.icon,
            onTap: () {
              if (_selectedDirectoryTab == 'centers') {
                BookingCenterDirectoryScreen.show(context,
                    apiClient: widget.apiClient);
              } else if (_selectedDirectoryTab == 'clinics') {
                ClinicDirectoryScreen.show(context,
                    apiClient: widget.apiClient);
              } else {
                DoctorDirectoryScreen.show(context,
                    apiClient: widget.apiClient);
              }
            },
          );
        },
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
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
              ButtonSegment<int>(
                value: 1,
                icon: const Icon(Icons.history_rounded, size: 18),
                label: Text(
                  '${strings.pastAppointments} (${_pastAppointments.length})',
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ],
            selected: {_selectedAppointmentSubTab},
            onSelectionChanged: (set) =>
                setState(() => _selectedAppointmentSubTab = set.first),
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
          onTap: () => AppointmentDetailScreen.show(
            context,
            appointment,
            apiClient: widget.apiClient,
            onAppointmentCancelled: (_) => _fetchAppointments(),
            onAppointmentRescheduled: (_) => _fetchAppointments(),
          ),
        );
      },
    );
  }

  Widget _buildMedicalRecordsTab(
      BuildContext context, LocalizedStrings strings) {
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
                  style: AafiyaTypography.titleLarge
                      .copyWith(color: AafiyaColors.pureWhite),
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
                child: Icon(Icons.receipt_long_rounded,
                    color: AafiyaColors.healthBlue),
              ),
              title: Text(strings.prescriptionsTitle,
                  style: AafiyaTypography.titleMedium),
              subtitle: Text(strings.viewPrescriptions,
                  style: AafiyaTypography.caption),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => PrescriptionsScreen.show(context,
                  apiClient: widget.apiClient),
            ),
          ),
          const SizedBox(height: 12),

          // Emergency Profile Card
          AafiyaCard(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AafiyaColors.error.withValues(alpha: 0.1),
                child: const Icon(Icons.health_and_safety_rounded,
                    color: AafiyaColors.error),
              ),
              title: Text(strings.emergencyProfileTitle,
                  style: AafiyaTypography.titleMedium),
              subtitle: Text(strings.viewEmergencyProfile,
                  style: AafiyaTypography.caption),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => EmergencyProfileScreen.show(context,
                  apiClient: widget.apiClient),
            ),
          ),
          const SizedBox(height: 12),

          // Encrypted Sharing (Sender Flow)
          AafiyaCard(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: AafiyaColors.lightBackground,
                child:
                    Icon(Icons.share_rounded, color: AafiyaColors.healthBlue),
              ),
              title: Text(strings.shareMedicalRecordTitle,
                  style: AafiyaTypography.titleMedium),
              subtitle: Text(strings.shareMedicalRecordSubtitle,
                  style: AafiyaTypography.caption),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => PatientSharedRecordsScreen.show(context,
                  apiClient: widget.apiClient),
            ),
          ),
          const SizedBox(height: 12),

          // View Shared Record (Recipient Viewer - Manual Ingress)
          AafiyaCard(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                child: const Icon(Icons.lock_open_rounded,
                    color: AafiyaColors.healthBlue),
              ),
              title: Text(strings.viewSharedRecordHubTitle,
                  style: AafiyaTypography.titleMedium),
              subtitle: Text(strings.viewSharedRecordHubSubtitle,
                  style: AafiyaTypography.caption),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => SharedRecordViewerSheet.show(context,
                  apiClient: widget.apiClient),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab(
      BuildContext context, LocalizedStrings strings, User? user) {
    return SingleChildScrollView(
      padding: AafiyaSpacing.insetScreen,
      child: Column(
        children: [
          AafiyaCard(
            child: Column(
              children: [
                ListTile(
                  leading:
                      const Icon(Icons.person, color: AafiyaColors.healthBlue),
                  title: Text(user?.name ?? ''),
                  subtitle: Text(user?.email ?? ''),
                ),
                const Divider(color: AafiyaColors.border),
                ListTile(
                  leading: const Icon(Icons.phone,
                      color: AafiyaColors.secondaryText),
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
                child: const Icon(Icons.health_and_safety_rounded,
                    color: AafiyaColors.error),
              ),
              title: Text(strings.emergencyProfileTitle,
                  style: AafiyaTypography.titleMedium),
              subtitle: Text(strings.viewEmergencyProfile,
                  style: AafiyaTypography.caption),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => EmergencyProfileScreen.show(context,
                  apiClient: widget.apiClient),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../screens/bc_appointment_booking_screen.dart';
import '../screens/bc_appointments_list_screen.dart';
import '../screens/bc_quota_screen.dart';
import '../widgets/quota_balance_card.dart';

/// AAFIYA Pro — Booking Center Shell Foundation.
///
/// NOTE: Strictly operational foundation only.
/// CRITICAL: There is NO Booking Center Employee/Staff Management subsystem in mobile.
/// Employee CRUD, staff permissions, and staff administration are strictly prohibited (DISC-04).
class BookingCenterShell extends StatefulWidget {
  const BookingCenterShell({
    super.key,
    required this.user,
    required this.sessionManager,
    this.apiClient,
    this.bookingCenterService,
    required this.onSignOut,
  });

  final User user;
  final AuthSessionManager sessionManager;
  final ApiClient? apiClient;
  final BookingCenterService? bookingCenterService;
  final VoidCallback onSignOut;

  @override
  State<BookingCenterShell> createState() => _BookingCenterShellState();
}

class _BookingCenterShellState extends State<BookingCenterShell> {
  late final BookingCenterService _service;
  bool _isLoadingQuota = true;
  String? _quotaError;
  BookingCenterQuota? _quotaData;

  @override
  void initState() {
    super.initState();
    final client = widget.apiClient ?? widget.sessionManager.apiClient;
    _service =
        widget.bookingCenterService ?? BookingCenterService(apiClient: client);
    _fetchQuota();
  }

  Future<void> _fetchQuota() async {
    if (!mounted) return;
    setState(() {
      _isLoadingQuota = true;
      _quotaError = null;
    });

    final result = await _service.getQuotaBalance();
    if (!mounted) return;

    setState(() {
      _isLoadingQuota = false;
      switch (result) {
        case ApiSuccess(:final data):
          _quotaData = data;
          _quotaError = null;
        case ApiFailure(:final exception):
          _quotaError = exception.message;
      }
    });
  }

  void _navigateToQuotaDashboard() {
    Navigator.of(context)
        .push(
      MaterialPageRoute<void>(
        builder: (_) => BcQuotaScreen(
          sessionManager: widget.sessionManager,
          user: widget.user,
          bookingCenterService: _service,
          apiClient: widget.apiClient,
          onBackToDashboard: () => Navigator.of(context).pop(),
        ),
      ),
    )
        .then((_) {
      // Re-fetch quota upon returning from quota screen
      _fetchQuota();
    });
  }

  void _navigateToNewBooking() {
    Navigator.of(context)
        .push(
      MaterialPageRoute<void>(
        builder: (_) => BcAppointmentBookingScreen(
          sessionManager: widget.sessionManager,
          user: widget.user,
          bookingCenterService: _service,
          apiClient: widget.apiClient,
          initialQuotaBalance: _quotaData?.quotaBalance,
        ),
      ),
    )
        .then((_) {
      _fetchQuota();
    });
  }

  void _navigateToAppointmentsList() {
    Navigator.of(context)
        .push(
      MaterialPageRoute<void>(
        builder: (_) => BcAppointmentsListScreen(
          sessionManager: widget.sessionManager,
          user: widget.user,
          bookingCenterService: _service,
          apiClient: widget.apiClient,
          onQuotaNeedsRefresh: _fetchQuota,
        ),
      ),
    )
        .then((_) {
      _fetchQuota();
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final centerName = _quotaData?.name ?? widget.user.name;

    return Scaffold(
      appBar: AafiyaAppBar(
        title: '${strings.bookingCenterRoleTitle}: ${widget.user.name}',
        actions: [
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
      body: RefreshIndicator(
        onRefresh: _fetchQuota,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: AafiyaSpacing.insetScreen,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Center Identity & Quota Balance Card
              if (_quotaData == null && _isLoadingQuota)
                // Initial uninitialized state displays standard placeholder matching pro_app_test
                AafiyaCard(
                  backgroundColor: AafiyaColors.healthBlue,
                  padding: AafiyaSpacing.insetAllLg,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.user.name,
                        style: AafiyaTypography.titleLarge
                            .copyWith(color: AafiyaColors.pureWhite),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        strings.bookingCenterRoleTitle,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.pureWhite.withValues(alpha: 0.8),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AafiyaColors.pureWhite.withValues(alpha: 0.2),
                          borderRadius: AafiyaRadius.borderMd,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.confirmation_num_outlined,
                                color: AafiyaColors.pureWhite, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              '${strings.quotaBalanceLabel}: --',
                              style: AafiyaTypography.titleMedium
                                  .copyWith(color: AafiyaColors.pureWhite),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
              else
                QuotaBalanceCard(
                  centerName: centerName,
                  quotaBalance: _quotaData?.quotaBalance ?? 0,
                  isLoading: _isLoadingQuota,
                  onRefresh: _fetchQuota,
                  onRecharge: _navigateToQuotaDashboard,
                ),

              if (_quotaError != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AafiyaColors.error.withValues(alpha: 0.1),
                    borderRadius: AafiyaRadius.borderSm,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: AafiyaColors.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _quotaError!,
                          style: AafiyaTypography.caption
                              .copyWith(color: AafiyaColors.error),
                        ),
                      ),
                      TextButton(
                        onPressed: _fetchQuota,
                        child: Text(strings.retry),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Action card to open Quota Dashboard & Packages
              AafiyaCard(
                child: ListTile(
                  key: const Key('open_quota_dashboard_tile'),
                  leading: const Icon(Icons.account_balance_wallet_outlined,
                      color: AafiyaColors.healthBlue),
                  title: Text(
                    strings.availablePackages,
                    style: AafiyaTypography.titleMedium
                        .copyWith(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    strings.transactionsLedger,
                    style: AafiyaTypography.caption,
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded,
                      color: AafiyaColors.secondaryText),
                  onTap: _navigateToQuotaDashboard,
                ),
              ),
              const SizedBox(height: 12),

              // Operational Booking Actions (TASK-05-04)
              AafiyaCard(
                child: ListTile(
                  key: const Key('open_new_booking_tile'),
                  leading: const Icon(Icons.add_circle_outline_rounded,
                      color: AafiyaColors.healingGreen),
                  title: Text(
                    strings.newBookingAction,
                    style: AafiyaTypography.titleMedium
                        .copyWith(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    strings.patientStepTitle,
                    style: AafiyaTypography.caption,
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded,
                      color: AafiyaColors.secondaryText),
                  onTap: _navigateToNewBooking,
                ),
              ),
              const SizedBox(height: 12),
              AafiyaCard(
                child: ListTile(
                  key: const Key('open_appointments_history_tile'),
                  leading: const Icon(Icons.event_note_rounded,
                      color: AafiyaColors.healthBlue),
                  title: Text(
                    strings.appointmentsHistoryAction,
                    style: AafiyaTypography.titleMedium
                        .copyWith(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    strings.viewAppointmentsListAction,
                    style: AafiyaTypography.caption,
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded,
                      color: AafiyaColors.secondaryText),
                  onTap: _navigateToAppointmentsList,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

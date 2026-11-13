import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../screens/assistant_queue_screen.dart';
import '../screens/assistant_rewards_screen.dart';
import '../screens/clinic_escalations_screen.dart';
import '../screens/unresolved_reschedules_screen.dart';

/// AAFIYA Pro — Clinic Assistant Operational Shell (TASK-05-01).
///
/// Integrates:
/// 1. Live Waiting Room Queue (`status = attended`).
/// 2. Expected Arrivals Check-In Queue (`status = confirmed`).
/// 3. Attendance confirmation (`/attend`) and No-Show handling (`/no-show`).
/// 4. QR Token single-use Check-In (`POST /api/v1/appointments/check-in`).
/// 5. Clinic-scoped Patient Directory Lookup (`GET /api/v1/patients`).
/// 6. Urgent Unresolved Reschedules Dashboard (`GET /api/v1/clinic/reschedule-dashboard/unresolved`).
class AssistantShell extends StatefulWidget {
  const AssistantShell({
    super.key,
    required this.user,
    required this.sessionManager,
    required this.onSignOut,
    this.apiClient,
    this.queueService,
    this.adsTickerService,
  });

  final User user;
  final AuthSessionManager sessionManager;
  final VoidCallback onSignOut;
  final ApiClient? apiClient;
  final AssistantQueueService? queueService;
  final AdsTickerService? adsTickerService;

  @override
  State<AssistantShell> createState() => _AssistantShellState();
}

class _AssistantShellState extends State<AssistantShell> {
  late final AdsTickerService _adsTickerService;
  List<AdsTickerItem> _tickerAds = [];

  @override
  void initState() {
    super.initState();
    _adsTickerService = widget.adsTickerService ??
        AdsTickerService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );
    _fetchTickerAds();
  }

  @override
  void didUpdateWidget(covariant AssistantShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.adsTickerService != oldWidget.adsTickerService) {
      _adsTickerService = widget.adsTickerService ??
          AdsTickerService(
            apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
          );
      _fetchTickerAds();
    }
  }

  Future<void> _fetchTickerAds() async {
    final result =
        await _adsTickerService.getEligibleAds(destination: 'ticker');
    if (!mounted) return;
    switch (result) {
      case ApiSuccess(:final data):
        setState(() => _tickerAds = data);
      case ApiFailure():
        setState(() => _tickerAds = []);
    }
  }

  Future<void> _handleAdClick(AdsTickerItem ad) async {
    await _adsTickerService.recordClick(ad.id, destination: 'ticker');
    final urlValidation = AafiyaAdsTicker.validateTargetUrl(ad.targetUrl);
    if (!urlValidation.isSafe || !mounted) return;
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final effectiveClient =
        widget.apiClient ?? widget.sessionManager.apiClient;
    final canManageQueue = widget.sessionManager.activeClinicId != null &&
        widget.user.hasPermission('booking.manage_queue');

    return Scaffold(
      backgroundColor: AafiyaColors.scaffoldBg,
      appBar: AafiyaAppBar(
        titleWidget: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const AafiyaBrandMark(markSize: 28, showWordmark: false),
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${strings.assistantRoleTitle}: ${widget.user.name}',
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (widget.sessionManager.activeClinic != null)
                    Text(
                      widget.sessionManager.activeClinic!.name,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.healingGreen,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (canManageQueue)
            IconButton(
              icon: const Icon(Icons.notification_important_outlined),
              tooltip: strings.clinicEscalationsTitle,
              onPressed: () {
                Navigator.of(context).push(
                  ClinicEscalationsScreen.route(
                    sessionManager: widget.sessionManager,
                    user: widget.user,
                    apiClient: effectiveClient,
                  ),
                );
              },
            ),
          IconButton(
            icon: const Icon(Icons.assignment_late_outlined),
            tooltip: strings.unresolvedReschedulesTitle,
            onPressed: () {
              Navigator.of(context).push(
                UnresolvedReschedulesScreen.route(
                  sessionManager: widget.sessionManager,
                  user: widget.user,
                  apiClient: effectiveClient,
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.account_balance_wallet_outlined),
            tooltip: strings.assistantRewardsTitle,
            onPressed: () {
              Navigator.of(context).push(
                AssistantRewardsScreen.route(
                  sessionManager: widget.sessionManager,
                  user: widget.user,
                  apiClient: effectiveClient,
                ),
              );
            },
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
                _adsTickerService.clearCache();
                await widget.sessionManager.logout();
                widget.onSignOut();
              }
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded),
            tooltip: strings.moreOptions,
            onSelected: (value) async {
              if (value == 'change_password') {
                await AafiyaChangePasswordCard.show(
                  context,
                  apiClient: effectiveClient,
                );
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                value: 'change_password',
                child: Row(
                  children: [
                    const Icon(
                      Icons.lock_reset_rounded,
                      color: AafiyaColors.healingGreen,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        strings.changePassword,
                        style: AafiyaTypography.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          AafiyaAdsTicker(
            ads: _tickerAds,
            onAdClick: _handleAdClick,
            margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          ),
          Expanded(
            child: AssistantQueueScreen(
              sessionManager: widget.sessionManager,
              user: widget.user,
              apiClient: effectiveClient,
              queueService: widget.queueService,
            ),
          ),
        ],
      ),
    );
  }
}

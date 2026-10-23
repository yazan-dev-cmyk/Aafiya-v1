import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../screens/assistant_queue_screen.dart';
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
class AssistantShell extends StatelessWidget {
  const AssistantShell({
    super.key,
    required this.user,
    required this.sessionManager,
    required this.onSignOut,
    this.apiClient,
    this.queueService,
  });

  final User user;
  final AuthSessionManager sessionManager;
  final VoidCallback onSignOut;
  final ApiClient? apiClient;
  final AssistantQueueService? queueService;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final effectiveClient = apiClient ?? sessionManager.apiClient;
    final canManageQueue = sessionManager.activeClinicId != null &&
        user.hasPermission('booking.manage_queue');

    return Scaffold(
      appBar: AafiyaAppBar(
        title: '${strings.assistantRoleTitle}: ${user.name}',
        showBrandMark: true,
        actions: [
          if (canManageQueue)
            IconButton(
              icon: const Icon(Icons.notification_important_outlined),
              tooltip: strings.clinicEscalationsTitle,
              onPressed: () {
                Navigator.of(context).push(
                  ClinicEscalationsScreen.route(
                    sessionManager: sessionManager,
                    user: user,
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
                  sessionManager: sessionManager,
                  user: user,
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
                await sessionManager.logout();
                onSignOut();
              }
            },
          ),
        ],
      ),
      body: AssistantQueueScreen(
        sessionManager: sessionManager,
        user: user,
        apiClient: effectiveClient,
        queueService: queueService,
      ),
    );
  }
}

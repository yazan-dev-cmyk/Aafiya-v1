import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../screens/assistant_queue_screen.dart';

/// AAFIYA Pro — Clinic Assistant Operational Shell (TASK-05-01).
///
/// Integrates:
/// 1. Live Waiting Room Queue (`status = attended`).
/// 2. Expected Arrivals Check-In Queue (`status = confirmed`).
/// 3. Attendance confirmation (`/attend`) and No-Show handling (`/no-show`).
/// 4. QR Token single-use Check-In (`POST /api/v1/appointments/check-in`).
/// 5. Clinic-scoped Patient Directory Lookup (`GET /api/v1/patients`).
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

    return Scaffold(
      appBar: AafiyaAppBar(
        title: '${strings.assistantRoleTitle}: ${user.name}',
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: strings.signOut,
            onPressed: () async {
              await sessionManager.logout();
              onSignOut();
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

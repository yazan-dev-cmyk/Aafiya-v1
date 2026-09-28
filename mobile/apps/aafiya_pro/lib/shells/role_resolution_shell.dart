import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import 'assistant_shell.dart';
import 'booking_center_shell.dart';
import 'doctor_shell.dart';

/// Role Resolution Shell for AAFIYA Pro.
/// Resolves server-provided user roles into the respective professional shell.
class RoleResolutionShell extends StatelessWidget {
  const RoleResolutionShell({
    super.key,
    required this.sessionManager,
    required this.onSignOut,
    this.apiClient,
    this.roleResolver = const RoleResolver(),
  });

  final AuthSessionManager sessionManager;
  final VoidCallback onSignOut;
  final ApiClient? apiClient;
  final RoleResolver roleResolver;

  @override
  Widget build(BuildContext context) {
    final user = sessionManager.currentUser;
    final strings = LocalizedStrings.of(context);

    if (user == null) {
      return Scaffold(
        body: Center(
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: strings.unauthorizedRoleMessage,
            onRetry: onSignOut,
            retryLabel: strings.signOut,
          ),
        ),
      );
    }

    final destination = roleResolver.resolveProDestination(user);

    return switch (destination) {
      RoleDestination.doctor => DoctorShell(
          user: user,
          sessionManager: sessionManager,
          apiClient: apiClient,
          onSignOut: onSignOut,
        ),
      RoleDestination.assistant => AssistantShell(
          user: user,
          sessionManager: sessionManager,
          apiClient: apiClient,
          onSignOut: onSignOut,
        ),
      RoleDestination.bookingCenter => BookingCenterShell(
          user: user,
          sessionManager: sessionManager,
          apiClient: apiClient,
          onSignOut: onSignOut,
        ),
      RoleDestination.webOnly => Scaffold(
          appBar: AafiyaAppBar(
            title: strings.proAppTitle,
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
          body: Center(
            child: AafiyaErrorView(
              title: strings.errorTitle,
              message: strings.webOnlyRoleMessage,
              onRetry: () async {
                await sessionManager.logout();
                onSignOut();
              },
              retryLabel: strings.signOut,
            ),
          ),
        ),
      RoleDestination.patient || RoleDestination.unauthorized => Scaffold(
          appBar: AafiyaAppBar(
            title: strings.proAppTitle,
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
          body: Center(
            child: AafiyaErrorView(
              title: strings.errorTitle,
              message: strings.unauthorizedRoleMessage,
              onRetry: () async {
                await sessionManager.logout();
                onSignOut();
              },
              retryLabel: strings.signOut,
            ),
          ),
        ),
    };
  }
}

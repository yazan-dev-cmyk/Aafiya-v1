import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Splash screen foundation for AAFIYA Pro.
class ProSplashShell extends StatefulWidget {
  const ProSplashShell({
    super.key,
    required this.sessionManager,
    required this.onAuthenticated,
    required this.onUnauthenticated,
  });

  final AuthSessionManager sessionManager;
  final VoidCallback onAuthenticated;
  final VoidCallback onUnauthenticated;

  @override
  State<ProSplashShell> createState() => _ProSplashShellState();
}

class _ProSplashShellState extends State<ProSplashShell> {
  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    await widget.sessionManager.restoreSession();
    if (!mounted) return;

    if (widget.sessionManager.isAuthenticated) {
      widget.onAuthenticated();
    } else {
      widget.onUnauthenticated();
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      backgroundColor: AafiyaColors.lightBackground,
      body: Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: const BoxDecoration(
                  color: AafiyaColors.healthBlue,
                  borderRadius: AafiyaRadius.borderXl,
                ),
                child: const Center(
                  child: Icon(
                    Icons.medical_services_outlined,
                    size: 48,
                    color: AafiyaColors.pureWhite,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                strings.proAppTitle,
                style: AafiyaTypography.displayLarge.copyWith(color: AafiyaColors.healthBlue),
              ),
              const SizedBox(height: 8),
              Text(
                strings.brandGatewaySlogan,
                style: AafiyaTypography.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              const AafiyaLoadingView(),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Splash Screen foundation: displays branding and initializes session.
class PatientSplashShell extends StatefulWidget {
  const PatientSplashShell({
    super.key,
    required this.sessionManager,
    required this.onAuthenticated,
    required this.onUnauthenticated,
    this.onLocaleChanged,
    this.currentLocale,
  });

  final AuthSessionManager sessionManager;
  final VoidCallback onAuthenticated;
  final VoidCallback onUnauthenticated;
  final ValueChanged<Locale>? onLocaleChanged;
  final Locale? currentLocale;

  @override
  State<PatientSplashShell> createState() => _PatientSplashShellState();
}

class _PatientSplashShellState extends State<PatientSplashShell> {
  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    // Artificial brief pause for splash branding presentation
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
    final activeCode = (widget.currentLocale ?? Localizations.localeOf(context)).languageCode;

    return Scaffold(
      backgroundColor: AafiyaColors.lightBackground,
      body: SafeArea(
        child: Stack(
          children: [
            if (widget.onLocaleChanged != null)
              Align(
                alignment: AlignmentDirectional.topEnd,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'ar', label: Text('العربية')),
                      ButtonSegment(value: 'en', label: Text('EN')),
                      ButtonSegment(value: 'fr', label: Text('FR')),
                    ],
                    selected: {activeCode},
                    showSelectedIcon: false,
                    style: SegmentedButton.styleFrom(
                      textStyle: AafiyaTypography.caption.copyWith(fontWeight: FontWeight.w600),
                      visualDensity: VisualDensity.compact,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    onSelectionChanged: (selected) {
                      if (selected.isNotEmpty) {
                        widget.onLocaleChanged!(Locale(selected.first));
                      }
                    },
                  ),
                ),
              ),
            Center(
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
                        child: Text(
                          'ع',
                          style: TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.pureWhite,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      strings.appBrandName,
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
          ],
        ),
      ),
    );
  }
}

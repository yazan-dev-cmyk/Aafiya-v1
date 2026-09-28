import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import 'shells/auth_shell.dart';
import 'shells/role_resolution_shell.dart';
import 'shells/splash_shell.dart';

enum ProNavState { splash, auth, roleResolution }

/// Root Pro Application Widget.
class AafiyaProApp extends StatefulWidget {
  const AafiyaProApp({
    super.key,
    required this.sessionManager,
    required this.apiClient,
    this.connectivityService,
    this.navigatorKey,
    this.initialLocale = const Locale('ar'),
    this.initialNavState = ProNavState.splash,
  });

  final AuthSessionManager sessionManager;
  final ApiClient apiClient;
  final ConnectivityService? connectivityService;
  final GlobalKey<NavigatorState>? navigatorKey;
  final Locale initialLocale;
  final ProNavState initialNavState;

  @override
  State<AafiyaProApp> createState() => _AafiyaProAppState();
}

class _AafiyaProAppState extends State<AafiyaProApp> {
  late Locale _locale;
  late ProNavState _navState;
  late final ConnectivityService _connectivityService;
  late final GlobalKey<NavigatorState> _navigatorKey;
  bool _isShowingSessionExpiredDialog = false;

  @override
  void initState() {
    super.initState();
    _locale = widget.initialLocale;
    _navState = widget.initialNavState;
    _navigatorKey = widget.navigatorKey ?? GlobalKey<NavigatorState>();
    _connectivityService = widget.connectivityService ?? PlatformConnectivityService();
    widget.sessionManager.addListener(_onSessionStateChanged);
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onSessionStateChanged);
    super.dispose();
  }

  void _onSessionStateChanged() {
    final state = widget.sessionManager.state;
    if (state is Unauthenticated && _navState == ProNavState.roleResolution) {
      _navigatorKey.currentState?.popUntil((route) => route.isFirst);
      setState(() {
        _navState = ProNavState.auth;
      });
      if (state.message == 'Session expired.' || (state.message != null && state.message!.contains('expired'))) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _showSessionExpiredDialog();
        });
      }
    }
  }

  Future<void> _showSessionExpiredDialog() async {
    if (_isShowingSessionExpiredDialog || !mounted) return;
    _isShowingSessionExpiredDialog = true;

    final context = _navigatorKey.currentContext;
    if (context == null) {
      _isShowingSessionExpiredDialog = false;
      return;
    }

    final strings = LocalizedStrings.of(context);
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AafiyaColors.pureWhite,
        shape: const RoundedRectangleBorder(borderRadius: AafiyaRadius.borderLg),
        title: Row(
          children: [
            const Icon(Icons.timer_outlined, color: AafiyaColors.warning),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                strings.sessionExpiredTitle,
                style: AafiyaTypography.titleLarge.copyWith(color: AafiyaColors.primaryText),
              ),
            ),
          ],
        ),
        content: Text(
          strings.sessionExpiredMessage,
          style: AafiyaTypography.bodyLarge,
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.healthBlue,
              foregroundColor: AafiyaColors.pureWhite,
              shape: const RoundedRectangleBorder(borderRadius: AafiyaRadius.borderMd),
            ),
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text(
              strings.signInAgain,
              style: AafiyaTypography.labelLarge,
            ),
          ),
        ],
      ),
    );

    _isShowingSessionExpiredDialog = false;
  }

  void setLocale(Locale newLocale) {
    setState(() {
      _locale = newLocale;
      widget.apiClient.setLocale(newLocale.languageCode);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: 'AAFIYA Pro',
      debugShowCheckedModeBanner: false,
      theme: AafiyaTheme.lightTheme,
      darkTheme: AafiyaTheme.darkTheme,
      themeMode: ThemeMode.light,
      locale: _locale,
      supportedLocales: AafiyaSupportedLocale.supportedLocales,
      localizationsDelegates: const [
        AafiyaLocalizationsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) {
        return Stack(
          children: [
            if (child != null) child,
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: AafiyaOfflineBanner(
                  connectivityService: _connectivityService,
                ),
              ),
            ),
          ],
        );
      },
      home: switch (_navState) {
        ProNavState.splash => ProSplashShell(
            sessionManager: widget.sessionManager,
            onAuthenticated: () => setState(() => _navState = ProNavState.roleResolution),
            onUnauthenticated: () => setState(() => _navState = ProNavState.auth),
          ),
        ProNavState.auth => ProAuthShell(
            sessionManager: widget.sessionManager,
            apiClient: widget.apiClient,
            onLoginSuccess: () => setState(() => _navState = ProNavState.roleResolution),
          ),
        ProNavState.roleResolution => RoleResolutionShell(
            sessionManager: widget.sessionManager,
            apiClient: widget.apiClient,
            onSignOut: () => setState(() => _navState = ProNavState.auth),
          ),
      },
    );
  }
}

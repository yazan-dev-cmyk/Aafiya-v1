import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import 'routes/app_router.dart';
import 'screens/appointment_detail_screen.dart';
import 'shells/auth_shell.dart';
import 'shells/patient_home_shell.dart';
import 'shells/splash_shell.dart';
import 'widgets/prescription_verification_sheet.dart';

enum PatientNavState { splash, auth, home }

/// Root Patient Application Widget.
class AafiyaPatientApp extends StatefulWidget {
  const AafiyaPatientApp({
    super.key,
    required this.sessionManager,
    required this.apiClient,
    this.connectivityService,
    this.navigatorKey,
    this.initialLocale = const Locale('ar'),
    this.initialNavState = PatientNavState.splash,
    this.initialDeepLink,
  });

  final AuthSessionManager sessionManager;
  final ApiClient apiClient;
  final ConnectivityService? connectivityService;
  final GlobalKey<NavigatorState>? navigatorKey;
  final Locale initialLocale;
  final PatientNavState initialNavState;
  final String? initialDeepLink;

  @override
  State<AafiyaPatientApp> createState() => AafiyaPatientAppState();
}

class AafiyaPatientAppState extends State<AafiyaPatientApp>
    with WidgetsBindingObserver {
  late Locale _locale;
  late PatientNavState _navState;
  late final ConnectivityService _connectivityService;
  late final GlobalKey<NavigatorState> _navigatorKey;
  bool _isShowingSessionExpiredDialog = false;

  // TASK-06-03 Deep Linking volatile state
  String? _pendingAppointmentId;
  String? _lastHandledUri;
  DateTime? _lastHandledTimestamp;

  @visibleForTesting
  String? get pendingAppointmentId => _pendingAppointmentId;

  @visibleForTesting
  void clearPendingAppointment() {
    _pendingAppointmentId = null;
  }

  @visibleForTesting
  Future<bool> handleDeepLinkUri(String? uriString) =>
      _handleIncomingDeepLinkUri(uriString);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _locale = widget.initialLocale;
    _navState = widget.initialNavState;
    _navigatorKey = widget.navigatorKey ?? GlobalKey<NavigatorState>();
    _connectivityService = widget.connectivityService ?? PlatformConnectivityService();
    widget.sessionManager.addListener(_onSessionStateChanged);

    // Process cold-start deep link after the first frame is rendered
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkInitialDeepLink();
    });
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onSessionStateChanged);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // MARK: - Warm-start Deep Link Ingestion (WidgetsBindingObserver)

  @override
  Future<bool> didPushRouteInformation(RouteInformation routeInformation) {
    return _handleIncomingDeepLinkUri(routeInformation.uri.toString());
  }

  @override
  Future<bool> didPushRoute(String route) {
    return _handleIncomingDeepLinkUri(route);
  }

  // MARK: - Cold-start Deep Link Ingestion

  void _checkInitialDeepLink() {
    final initialUri = widget.initialDeepLink ??
        WidgetsBinding.instance.platformDispatcher.defaultRouteName;
    if (initialUri.isNotEmpty && initialUri != '/') {
      _handleIncomingDeepLinkUri(initialUri);
    }
  }

  // MARK: - Deep Link Dispatcher & Deduplication

  Future<bool> _handleIncomingDeepLinkUri(String? uriString) async {
    if (uriString == null || uriString.trim().isEmpty) {
      return false;
    }

    final destination = PatientDeepLinkRouter.parse(uriString);
    if (destination is UnknownDestination) {
      return false;
    }

    // In-memory duplicate delivery protection
    final now = DateTime.now();
    if (_lastHandledUri == uriString &&
        _lastHandledTimestamp != null &&
        now.difference(_lastHandledTimestamp!) < const Duration(milliseconds: 1500)) {
      return true;
    }
    _lastHandledUri = uriString;
    _lastHandledTimestamp = now;

    switch (destination) {
      case PrescriptionVerificationDestination(:final token):
        _presentPrescriptionVerification(token);
        return true;

      case AppointmentDetailsDestination(:final appointmentId):
        _handleAppointmentDestination(appointmentId);
        return true;

      case UnknownDestination():
        return false;
    }
  }

  void _presentPrescriptionVerification(String token) {
    final context = _navigatorKey.currentContext;
    if (context == null) return;

    PrescriptionVerificationSheet.show(
      context,
      apiClient: widget.apiClient,
      token: token,
    );
  }

  void _handleAppointmentDestination(String appointmentId) {
    final isAuthenticated =
        widget.sessionManager.isAuthenticated && _navState == PatientNavState.home;

    if (isAuthenticated) {
      _navigateToAppointment(appointmentId);
    } else {
      // Unauthenticated flow: volatile in-memory storage, switch to auth shell, zero API calls
      _pendingAppointmentId = appointmentId;
      if (_navState != PatientNavState.auth) {
        setState(() {
          _navState = PatientNavState.auth;
        });
      }
    }
  }

  Future<void> _navigateToAppointment(String appointmentId) async {
    final result = await widget.apiClient.get(
      '${ApiEndpoints.appointments}/$appointmentId',
      allowRetry: true,
    );

    if (!mounted) return;
    final navState = _navigatorKey.currentState;
    if (navState == null) return;

    switch (result) {
      case ApiSuccess(:final data):
        final raw = data['data'];
        final apptData = (raw is Map<String, dynamic>) ? raw : data;
        try {
          final appointment = Appointment.fromJson(apptData);
          navState.push(
            MaterialPageRoute<void>(
              builder: (_) => AppointmentDetailScreen(appointment: appointment),
            ),
          );
        } catch (_) {
          _showAppointmentError();
        }
      case ApiFailure(:final exception):
        _showAppointmentError(message: exception.message);
    }
  }

  void _showAppointmentError({String? message}) {
    final context = _navigatorKey.currentContext;
    if (context == null) return;
    final strings = LocalizedStrings.of(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message ?? strings.errorTitle),
        backgroundColor: AafiyaColors.error,
      ),
    );
  }

  // MARK: - Session & Navigation State Management

  void _onLoginSuccess() {
    setState(() {
      _navState = PatientNavState.home;
    });

    // Single-consumption transition: atomically consume and clear
    final pendingId = _pendingAppointmentId;
    _pendingAppointmentId = null;

    if (pendingId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _navigateToAppointment(pendingId);
      });
    }
  }

  void _onSignOut() {
    _pendingAppointmentId = null;
    setState(() {
      _navState = PatientNavState.auth;
    });
  }

  void _onSessionStateChanged() {
    final state = widget.sessionManager.state;
    if (state is Unauthenticated) {
      _pendingAppointmentId = null; // Clear pending appointment on session expiration
      if (_navState == PatientNavState.home) {
        _navigatorKey.currentState?.popUntil((route) => route.isFirst);
        setState(() {
          _navState = PatientNavState.auth;
        });
        if (state.message == 'Session expired.' ||
            (state.message != null && state.message!.contains('expired'))) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _showSessionExpiredDialog();
          });
        }
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

  @override
  void didUpdateWidget(AafiyaPatientApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialLocale != widget.initialLocale) {
      _locale = widget.initialLocale;
    }
    if (oldWidget.initialNavState != widget.initialNavState) {
      _navState = widget.initialNavState;
    }
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
      title: 'AAFIYA Patient',
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
        PatientNavState.splash => PatientSplashShell(
            sessionManager: widget.sessionManager,
            onAuthenticated: _onLoginSuccess,
            onUnauthenticated: () => setState(() => _navState = PatientNavState.auth),
            onLocaleChanged: setLocale,
            currentLocale: _locale,
          ),
        PatientNavState.auth => PatientAuthShell(
            sessionManager: widget.sessionManager,
            apiClient: widget.apiClient,
            onLoginSuccess: _onLoginSuccess,
            onLocaleChanged: setLocale,
            currentLocale: _locale,
          ),
        PatientNavState.home => PatientHomeShell(
            sessionManager: widget.sessionManager,
            apiClient: widget.apiClient,
            onSignOut: _onSignOut,
          ),
      },
    );
  }
}

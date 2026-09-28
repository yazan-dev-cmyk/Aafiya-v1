import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'app.dart';

/// Resolves the runtime [AppConfig] based on the active platform and build mode.
///
/// Compile-time override supported via `--dart-define=API_URL=https://...`.
/// In release mode, defaults to [AppConfig.production] (https://api.aafiya.dz/api/v1).
/// In development/debug mode, Android emulator accesses host machine through 10.0.2.2,
/// and other platforms connect via localhost:8000.
AppConfig resolveAppConfig({
  TargetPlatform? platform,
  bool isWeb = kIsWeb,
  bool isRelease = kReleaseMode,
}) {
  const envApiUrl = String.fromEnvironment('API_URL');
  if (envApiUrl.isNotEmpty) {
    return AppConfig(
      apiBaseUrl: envApiUrl,
      environment: isRelease ? 'production' : 'custom',
    );
  }

  if (isRelease) {
    return AppConfig.production;
  }

  if (!isWeb && (platform ?? defaultTargetPlatform) == TargetPlatform.android) {
    return AppConfig.devAndroidEmulator;
  }
  return AppConfig.devLocal;
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Enforce Section 9 Global Error Boundary Hooks
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
  };
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    debugPrint('[AAFIYA Patient Uncaught Error]: $error');
    return true;
  };
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return const AafiyaCrashBoundary();
  };

  AppConfig.current = resolveAppConfig();

  final tokenStorage = InMemoryTokenStorage();
  final apiClient = ApiClient(
    tokenStorage: tokenStorage,
    config: AppConfig.current,
  );
  final sessionManager = AuthSessionManager(
    tokenStorage: tokenStorage,
    apiClient: apiClient,
  );

  runApp(
    AafiyaPatientApp(
      sessionManager: sessionManager,
      apiClient: apiClient,
    ),
  );
}


/// Application environment and API endpoint configuration.
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.environment,
    this.connectionTimeout = const Duration(seconds: 15),
    this.receiveTimeout = const Duration(seconds: 15),
  });

  /// The root URL for the backend API, terminating with `/api/v1`.
  final String apiBaseUrl;

  /// The deployment environment name (e.g., 'development', 'staging', 'production').
  final String environment;

  /// HTTP connect timeout.
  final Duration connectionTimeout;

  /// HTTP receive/read timeout.
  final Duration receiveTimeout;

  /// Development configuration for local machine (Desktop / Web / Linux).
  static const AppConfig devLocal = AppConfig(
    apiBaseUrl: 'http://localhost:8000/api/v1',
    environment: 'development',
  );

  /// Development configuration for Android Emulator (10.0.2.2 maps to host).
  static const AppConfig devAndroidEmulator = AppConfig(
    apiBaseUrl: 'http://10.0.2.2:8000/api/v1',
    environment: 'development',
  );

  /// Canonical production configuration.
  static const AppConfig production = AppConfig(
    apiBaseUrl: 'https://api.aafiya.site/api/v1',
    environment: 'production',
  );

  /// Default configuration instance, dynamically switchable at app initialization.
  static AppConfig current = devLocal;
}

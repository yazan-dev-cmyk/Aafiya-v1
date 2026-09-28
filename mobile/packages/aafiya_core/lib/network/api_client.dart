import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

import '../auth/token_storage.dart';
import '../config/app_config.dart';
import '../errors/api_error_response.dart';
import '../errors/app_exception.dart';
import 'api_result.dart';
import 'retry_policy.dart';

/// Pure Dart callback invoked as a notification hook when an authenticated request receives HTTP 401.
typedef UnauthorizedCallback = void Function();

/// Minimal reusable API Client abstraction for communicating with Laravel `/api/v1`.
class ApiClient {
  ApiClient({
    http.Client? httpClient,
    TokenStorage? tokenStorage,
    AppConfig? config,
    RetryPolicy? retryPolicy,
    UnauthorizedCallback? onUnauthorized,
  })  : _httpClient = httpClient ?? http.Client(),
        _tokenStorage = tokenStorage ?? InMemoryTokenStorage(),
        _config = config ?? AppConfig.current,
        _retryPolicy = retryPolicy ?? const RetryPolicy(),
        _onUnauthorized = onUnauthorized;

  final http.Client _httpClient;
  final TokenStorage _tokenStorage;
  final AppConfig _config;
  final RetryPolicy _retryPolicy;
  UnauthorizedCallback? _onUnauthorized;

  /// Returns the current unauthorized callback notification hook.
  UnauthorizedCallback? get onUnauthorized => _onUnauthorized;

  /// Sets or updates the unauthorized callback notification hook.
  void setOnUnauthorized(UnauthorizedCallback? callback) {
    _onUnauthorized = callback;
  }

  String _currentLocale = 'ar';
  String? _activeClinicId;

  /// Updates the locale sent via `Accept-Language` header.
  void setLocale(String languageCode) {
    _currentLocale = languageCode;
  }

  /// Returns the current active clinic ID attached to outgoing requests.
  String? get activeClinicId => _activeClinicId;

  /// Sets or clears the active clinic ID propagated in request headers.
  void setActiveClinicId(String? clinicId) {
    _activeClinicId = clinicId;
  }

  /// Builds standard request headers including JSON content type, language, and Bearer auth.
  Future<Map<String, String>> _buildHeaders({
    Map<String, String>? extraHeaders,
    bool requiresAuth = true,
  }) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': _currentLocale,
    };

    if (requiresAuth) {
      final token = await _tokenStorage.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    if (_activeClinicId != null && _activeClinicId!.isNotEmpty) {
      headers['X-Clinic-ID'] = _activeClinicId!;
      headers['X-Active-Clinic-ID'] = _activeClinicId!;
    }

    if (extraHeaders != null) {
      headers.addAll(extraHeaders);
    }

    return headers;
  }

  /// Executes a GET request against the API.
  Future<ApiResult<Map<String, dynamic>>> get(
    String endpoint, {
    Map<String, String>? queryParameters,
    Map<String, String>? headers,
    bool requiresAuth = true,
    bool allowRetry = true,
    bool notifyUnauthorized = true,
  }) async {
    return _sendRequest(
      method: 'GET',
      endpoint: endpoint,
      queryParameters: queryParameters,
      headers: headers,
      requiresAuth: requiresAuth,
      allowRetry: allowRetry,
      notifyUnauthorized: notifyUnauthorized,
    );
  }

  /// Executes a POST request with optional JSON body.
  Future<ApiResult<Map<String, dynamic>>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
    Map<String, String>? headers,
    bool requiresAuth = true,
    bool allowRetry = false,
    bool notifyUnauthorized = true,
  }) async {
    return _sendRequest(
      method: 'POST',
      endpoint: endpoint,
      body: body,
      queryParameters: queryParameters,
      headers: headers,
      requiresAuth: requiresAuth,
      allowRetry: allowRetry,
      notifyUnauthorized: notifyUnauthorized,
    );
  }

  /// Executes a PUT request with optional JSON body.
  Future<ApiResult<Map<String, dynamic>>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
    Map<String, String>? headers,
    bool requiresAuth = true,
    bool allowRetry = false,
    bool notifyUnauthorized = true,
  }) async {
    return _sendRequest(
      method: 'PUT',
      endpoint: endpoint,
      body: body,
      queryParameters: queryParameters,
      headers: headers,
      requiresAuth: requiresAuth,
      allowRetry: allowRetry,
      notifyUnauthorized: notifyUnauthorized,
    );
  }

  /// Executes a DELETE request with optional JSON body.
  Future<ApiResult<Map<String, dynamic>>> delete(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
    Map<String, String>? headers,
    bool requiresAuth = true,
    bool allowRetry = false,
    bool notifyUnauthorized = true,
  }) async {
    return _sendRequest(
      method: 'DELETE',
      endpoint: endpoint,
      body: body,
      queryParameters: queryParameters,
      headers: headers,
      requiresAuth: requiresAuth,
      allowRetry: allowRetry,
      notifyUnauthorized: notifyUnauthorized,
    );
  }

  /// Core request executor with timeout and exception translation.
  Future<ApiResult<Map<String, dynamic>>> _sendRequest({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
    Map<String, String>? headers,
    required bool requiresAuth,
    bool allowRetry = true,
    bool notifyUnauthorized = true,
  }) async {
    final baseUri = Uri.parse(_config.apiBaseUrl);
    final cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/$endpoint';

    final uri = Uri(
      scheme: baseUri.scheme,
      host: baseUri.host,
      port: baseUri.port,
      path: '${baseUri.path}$cleanEndpoint',
      queryParameters: queryParameters,
    );

    // Enforce Decision D-06-01-R1: Only safe idempotent read methods may automatically retry.
    final bool isEligibleMethod = allowRetry && _retryPolicy.shouldRetryMethod(method);
    final int maxAttempts = isEligibleMethod ? _retryPolicy.maxAttempts : 1;

    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        final requestHeaders = await _buildHeaders(
          extraHeaders: headers,
          requiresAuth: requiresAuth,
        );

        final String? encodedBody = body != null ? jsonEncode(body) : null;

        final http.Response response = await switch (method) {
          'GET' => _httpClient.get(uri, headers: requestHeaders).timeout(_config.receiveTimeout),
          'POST' => _httpClient
              .post(uri, headers: requestHeaders, body: encodedBody)
              .timeout(_config.receiveTimeout),
          'PUT' => _httpClient
              .put(uri, headers: requestHeaders, body: encodedBody)
              .timeout(_config.receiveTimeout),
          'DELETE' => _httpClient
              .delete(uri, headers: requestHeaders, body: encodedBody)
              .timeout(_config.receiveTimeout),
          _ => throw UnsupportedError('HTTP method $method is not supported.'),
        };

        // Decision D-06-01-R2: Check if HTTP status is transient (502, 503, 504) on safe read methods
        if (isEligibleMethod && _retryPolicy.isRetryableStatusCode(response.statusCode) && attempt < maxAttempts) {
          final delay = _retryPolicy.delayForAttempt(attempt);
          if (delay > Duration.zero) {
            await Future<void>.delayed(delay);
          }
          continue;
        }

        return _handleResponse(
          response,
          requiresAuth: requiresAuth,
          notifyUnauthorized: notifyUnauthorized,
        );
      } on SocketException catch (e) {
        if (isEligibleMethod && _retryPolicy.isRetryableException(e) && attempt < maxAttempts) {
          final delay = _retryPolicy.delayForAttempt(attempt);
          if (delay > Duration.zero) {
            await Future<void>.delayed(delay);
          }
          continue;
        }
        return ApiFailure(NetworkConnectionException(
          'Unable to connect to server. Please check your internet connection.',
          e,
        ));
      } on http.ClientException catch (e) {
        if (isEligibleMethod && _retryPolicy.isRetryableException(e) && attempt < maxAttempts) {
          final delay = _retryPolicy.delayForAttempt(attempt);
          if (delay > Duration.zero) {
            await Future<void>.delayed(delay);
          }
          continue;
        }
        return ApiFailure(NetworkConnectionException(
          'Unable to connect to server. Please check your internet connection.',
          e,
        ));
      } on TimeoutException catch (e) {
        if (isEligibleMethod && _retryPolicy.isRetryableException(e) && attempt < maxAttempts) {
          final delay = _retryPolicy.delayForAttempt(attempt);
          if (delay > Duration.zero) {
            await Future<void>.delayed(delay);
          }
          continue;
        }
        return ApiFailure(NetworkTimeoutException(
          'The server took too long to respond. Please try again.',
          e,
        ));
      } catch (e) {
        return ApiFailure(NetworkConnectionException(
          'Failed to communicate with server. Please try again.',
          e,
        ));
      }
    }

    return const ApiFailure(NetworkConnectionException(
      'Unable to connect to server. Please check your internet connection.',
    ));
  }

  /// Evaluates HTTP response and handles success envelopes or error statuses.
  ApiResult<Map<String, dynamic>> _handleResponse(
    http.Response response, {
    bool requiresAuth = true,
    bool notifyUnauthorized = true,
  }) {
    final statusCode = response.statusCode;
    Map<String, dynamic>? parsedJson;

    if (response.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          parsedJson = decoded;
        }
      } catch (_) {
        // If response is not valid JSON, treat as null and map below
      }
    }

    if (statusCode >= 200 && statusCode < 300) {
      return ApiSuccess(parsedJson ?? const <String, dynamic>{});
    }

    // Decision AMB-01 & AMB-02: Invoke unauthorized notification hook for runtime 401s on authenticated endpoints.
    if (statusCode == 401 && requiresAuth && notifyUnauthorized) {
      try {
        _onUnauthorized?.call();
      } catch (_) {
        // Notification hook exceptions must never replace or alter the API failure response.
      }
    }

    final errorResponse = parsedJson != null ? ApiErrorResponse.fromJson(parsedJson) : null;

    final exception = ApiException.fromStatusCode(
      statusCode: statusCode,
      rawBody: response.body,
      parsedResponse: errorResponse,
    );

    return ApiFailure(exception);
  }

  void close() {
    _httpClient.close();
  }
}

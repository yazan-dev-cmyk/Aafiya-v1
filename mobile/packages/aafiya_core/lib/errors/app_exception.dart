import 'api_error_response.dart';

/// Base class for all handled AAFIYA application exceptions.
sealed class AppException implements Exception {
  const AppException(this.message, [this.cause]);

  final String message;
  final Object? cause;

  @override
  String toString() => '$runtimeType: $message';
}

/// Thrown when network connection is unavailable or unreachable.
class NetworkConnectionException extends AppException {
  const NetworkConnectionException([
    super.message = 'Unable to connect to server. Please check your internet connection.',
    super.cause,
  ]);
}

/// Thrown when a network request times out.
class NetworkTimeoutException extends AppException {
  const NetworkTimeoutException([
    super.message = 'The server took too long to respond. Please try again.',
    super.cause,
  ]);
}

/// Base class for HTTP response status errors from backend.
abstract class ApiException extends AppException {
  const ApiException({
    required this.statusCode,
    required String message,
    this.errorResponse,
    Object? cause,
  }) : super(message, cause);

  final int statusCode;
  final ApiErrorResponse? errorResponse;

  /// Helper factory to map HTTP status code and response payload into specific typed exception.
  static ApiException fromStatusCode({
    required int statusCode,
    String? rawBody,
    ApiErrorResponse? parsedResponse,
    Object? cause,
  }) {
    final message = parsedResponse?.message ?? 'Request failed with status $statusCode.';

    return switch (statusCode) {
      401 => UnauthorizedException(message: message, errorResponse: parsedResponse, cause: cause),
      403 => ForbiddenException(message: message, errorResponse: parsedResponse, cause: cause),
      404 => NotFoundException(message: message, errorResponse: parsedResponse, cause: cause),
      409 => ConflictException(message: message, errorResponse: parsedResponse, cause: cause),
      422 => ValidationException(
          message: message,
          errorResponse: parsedResponse,
          validationErrors: parsedResponse?.errors ?? const {},
          cause: cause,
        ),
      429 => RateLimitException(message: message, errorResponse: parsedResponse, cause: cause),
      >= 500 && < 600 => ServerException(
          statusCode: statusCode,
          message: message,
          errorResponse: parsedResponse,
          cause: cause,
        ),
      _ => GenericApiException(
          statusCode: statusCode,
          message: message,
          errorResponse: parsedResponse,
          cause: cause,
        ),
    };
  }
}

/// 401 Unauthorized - invalid or expired session token.
class UnauthorizedException extends ApiException {
  const UnauthorizedException({
    super.message = 'Your session has expired. Please sign in again.',
    super.errorResponse,
    super.cause,
  }) : super(statusCode: 401);
}

/// 403 Forbidden - authenticated user lacks permission for resource/operation.
class ForbiddenException extends ApiException {
  const ForbiddenException({
    super.message = 'You do not have permission to access this resource.',
    super.errorResponse,
    super.cause,
  }) : super(statusCode: 403);
}

/// 404 Not Found - resource does not exist.
class NotFoundException extends ApiException {
  const NotFoundException({
    super.message = 'Requested resource was not found.',
    super.errorResponse,
    super.cause,
  }) : super(statusCode: 404);
}

/// 409 Conflict - state conflict (e.g. appointment clash or quota restriction).
class ConflictException extends ApiException {
  const ConflictException({
    super.message = 'The requested operation conflicts with current system state.',
    super.errorResponse,
    super.cause,
  }) : super(statusCode: 409);
}

/// 422 Validation Error - input parameters or business rule constraint failure.
class ValidationException extends ApiException {
  const ValidationException({
    required super.message,
    this.validationErrors = const {},
    super.errorResponse,
    super.cause,
  }) : super(statusCode: 422);

  final Map<String, List<String>> validationErrors;

  String? firstErrorFor(String field) => validationErrors[field]?.firstOrNull;
}

/// 429 Too Many Requests - rate limit throttled.
class RateLimitException extends ApiException {
  const RateLimitException({
    super.message = 'Too many requests. Please slow down and try again shortly.',
    super.errorResponse,
    super.cause,
  }) : super(statusCode: 429);
}

/// 500+ Internal Server Error.
class ServerException extends ApiException {
  const ServerException({
    required super.statusCode,
    super.message = 'An internal server error occurred. Please try again later.',
    super.errorResponse,
    super.cause,
  });
}

/// Generic unexpected HTTP exception.
class GenericApiException extends ApiException {
  const GenericApiException({
    required super.statusCode,
    required super.message,
    super.errorResponse,
    super.cause,
  });
}

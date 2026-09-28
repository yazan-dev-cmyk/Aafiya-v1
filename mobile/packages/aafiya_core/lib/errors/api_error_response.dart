/// Representation of a parsed structured error payload from the Laravel backend.
class ApiErrorResponse {
  const ApiErrorResponse({
    required this.message,
    this.status,
    this.success,
    this.errors = const {},
  });

  final String message;
  final String? status;
  final bool? success;
  final Map<String, List<String>> errors;

  /// Tolerantly parses a backend error response body.
  factory ApiErrorResponse.fromJson(Map<String, dynamic> json) {
    final rawMessage = json['message'];
    final message = rawMessage is String && rawMessage.isNotEmpty
        ? rawMessage
        : 'An unexpected error occurred.';

    final rawStatus = json['status'] as String?;
    final rawSuccess = json['success'] as bool?;

    final parsedErrors = <String, List<String>>{};
    final rawErrors = json['errors'];
    if (rawErrors is Map<String, dynamic>) {
      for (final entry in rawErrors.entries) {
        if (entry.value is List) {
          parsedErrors[entry.key] = (entry.value as List)
              .map((e) => e.toString())
              .toList(growable: false);
        } else if (entry.value != null) {
          parsedErrors[entry.key] = [entry.value.toString()];
        }
      }
    }

    return ApiErrorResponse(
      message: message,
      status: rawStatus,
      success: rawSuccess,
      errors: parsedErrors,
    );
  }

  /// Convenience helper to obtain the first error message for a specific field or generally.
  String? firstErrorFor(String field) {
    return errors[field]?.firstOrNull;
  }
}

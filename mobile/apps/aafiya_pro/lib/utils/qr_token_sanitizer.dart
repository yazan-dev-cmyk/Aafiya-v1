/// Pure utility to sanitize and strictly validate appointment attendance QR tokens.
///
/// Ensures compliance with the AAFIYA 64-character alphanumeric ASCII contract:
/// [A-Za-z0-9]{64}. Rejects malformed, unsupported, short, or overlong inputs.
class QrTokenSanitizer {
  const QrTokenSanitizer._();

  static final RegExp _validTokenRegExp = RegExp(r'^[A-Za-z0-9]{64}$');

  /// Extracts and validates an appointment secure_token from raw scanner input.
  ///
  /// Supported formats:
  /// 1. Direct raw 64-character alphanumeric token: `^[A-Za-z0-9]{64}$`.
  /// 2. Web appointment pass URL containing `/appointment/pass/{token}` or
  ///    `/appointments/pass/{token}`, including localized prefixes (e.g., `/ar/`, `/fr/`, `/en/`).
  ///    Query parameters (`?key=val`) and URL fragments (`#frag`) are parsed and ignored safely.
  ///
  /// Returns the validated 64-character token, or `null` if the input is malformed,
  /// contains unsupported paths, has invalid characters, or does not meet the exact 64-character length.
  static String? sanitize(String? rawInput) {
    if (rawInput == null) return null;
    final trimmed = rawInput.trim();
    if (trimmed.isEmpty) return null;

    // 1. Direct raw 64-character token
    if (_validTokenRegExp.hasMatch(trimmed)) {
      return trimmed;
    }

    // 2. Parse as URI to safely isolate path segments from query parameters and fragments
    try {
      final uri = Uri.parse(trimmed);
      final segments = uri.pathSegments;

      for (int i = 0; i < segments.length - 1; i++) {
        final seg = segments[i].toLowerCase();
        if ((seg == 'appointment' || seg == 'appointments') &&
            segments[i + 1].toLowerCase() == 'pass') {
          // Token must be the segment immediately following 'pass'
          if (i + 2 < segments.length) {
            final candidate = segments[i + 2];
            // Reject if there are unexpected trailing path segments (e.g. /pass/{token}/extra)
            if (i + 3 < segments.length) {
              final remaining =
                  segments.sublist(i + 3).where((s) => s.isNotEmpty);
              if (remaining.isNotEmpty) {
                return null;
              }
            }
            if (_validTokenRegExp.hasMatch(candidate)) {
              return candidate;
            }
          }
        }
      }
    } catch (_) {
      // Uri.parse format exception - fall through to fallback regex
    }

    // 3. Fallback regex for non-standard schemes or partial paths (e.g. /appointment/pass/{token})
    final match = RegExp(
      r'(?:^|/)appointments?/pass/([A-Za-z0-9]{64})(?:[/?#]|$)',
      caseSensitive: false,
    ).firstMatch(trimmed);

    if (match != null) {
      final candidate = match.group(1);
      if (candidate != null && _validTokenRegExp.hasMatch(candidate)) {
        return candidate;
      }
    }

    return null;
  }
}

import 'package:flutter/foundation.dart';

/// Sealed class representing resolved deep link destinations in the AAFIYA Patient App.
@immutable
sealed class DeepLinkDestination {
  const DeepLinkDestination();
}

/// Destination for public prescription verification.
@immutable
final class PrescriptionVerificationDestination extends DeepLinkDestination {
  const PrescriptionVerificationDestination(this.token);

  final String token;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PrescriptionVerificationDestination &&
          runtimeType == other.runtimeType &&
          token == other.token;

  @override
  int get hashCode => token.hashCode;

  @override
  String toString() => 'PrescriptionVerificationDestination(token: $token)';
}

/// Destination for authenticated appointment details.
@immutable
final class AppointmentDetailsDestination extends DeepLinkDestination {
  const AppointmentDetailsDestination(this.appointmentId);

  final String appointmentId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppointmentDetailsDestination &&
          runtimeType == other.runtimeType &&
          appointmentId == other.appointmentId;

  @override
  int get hashCode => appointmentId.hashCode;

  @override
  String toString() => 'AppointmentDetailsDestination(appointmentId: $appointmentId)';
}

/// Destination for invalid, malformed, or unrecognized deep links.
@immutable
final class UnknownDestination extends DeepLinkDestination {
  const UnknownDestination();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UnknownDestination && runtimeType == other.runtimeType;

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  String toString() => 'UnknownDestination()';
}

/// Pure Dart parser for AAFIYA patient deep links.
///
/// Implements the architectural contract approved in ADR-06-03-01 Revision 2.1:
/// - Accepts scheme: `aafiya` only
/// - Accepts paths: `/prescription/{token}` and `/appointment/{uuid}`
/// - Accepts plural aliases: `/prescriptions/{token}` and `/appointments/{uuid}`
/// - Supports both host-based (`aafiya://prescription/{token}`) and path-based (`aafiya:///prescription/{token}`)
/// - Case-insensitive scheme and path matching
/// - Strict whitelist: Rejects queries and fragments
/// - Strict identifier validation: UUID regex for appointments, token regex for prescriptions
/// - Never performs network calls, authentication, or persistent mutations
abstract final class PatientDeepLinkRouter {
  static final RegExp _uuidRegex = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  );

  static final RegExp _tokenRegex = RegExp(
    r'^[a-zA-Z0-9_-]+$',
  );

  /// Parses a raw URI string into a [DeepLinkDestination].
  static DeepLinkDestination parse(String? uriString) {
    if (uriString == null || uriString.trim().isEmpty) {
      return const UnknownDestination();
    }

    final Uri? uri;
    try {
      uri = Uri.tryParse(uriString.trim());
    } catch (_) {
      return const UnknownDestination();
    }

    if (uri == null) {
      return const UnknownDestination();
    }

    // Scheme must be strictly 'aafiya'
    if (uri.scheme.toLowerCase() != 'aafiya') {
      return const UnknownDestination();
    }

    // Strict whitelist: Reject query parameters and fragments
    if (uri.hasQuery || uri.fragment.isNotEmpty) {
      return const UnknownDestination();
    }

    // Extract segments from both host-based (aafiya://prescription/token)
    // and path-based (aafiya:///prescription/token or aafiya:/prescription/token) forms.
    final segments = <String>[];
    if (uri.host.isNotEmpty) {
      segments.add(uri.host);
    }
    segments.addAll(uri.pathSegments.where((s) => s.isNotEmpty));

    // Must have exactly two segments: [resource, identifier]
    if (segments.length != 2) {
      return const UnknownDestination();
    }

    final resource = segments[0].toLowerCase();
    final identifier = segments[1];

    switch (resource) {
      case 'prescription':
      case 'prescriptions':
        if (identifier.isEmpty || !_tokenRegex.hasMatch(identifier)) {
          return const UnknownDestination();
        }
        return PrescriptionVerificationDestination(identifier);

      case 'appointment':
      case 'appointments':
        if (!_uuidRegex.hasMatch(identifier)) {
          return const UnknownDestination();
        }
        return AppointmentDetailsDestination(identifier);

      default:
        return const UnknownDestination();
    }
  }
}

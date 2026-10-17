import 'package:flutter/foundation.dart';

/// Immutable model representing an encrypted patient medical-record share token.
///
/// Designed with strict privacy and security controls:
/// - Zero PIN field: Plaintext PINs and PIN hashes are NEVER exposed to client models.
/// - The plain [token] and [shareUrl] are populated ONLY upon token creation.
/// - Index listings never contain [token] or [shareUrl] (server-side security contract).
/// - [toString] is sanitized to prevent credential leakage into diagnostics or crashlytics.
@immutable
class PatientShareToken {
  const PatientShareToken({
    required this.id,
    this.token,
    this.shareUrl,
    required this.scope,
    this.duration,
    this.hasPin = true,
    required this.status,
    this.failedAttempts = 0,
    this.maxAttempts = 5,
    this.accessCount = 0,
    required this.expiresAt,
    this.revokedAt,
    this.lastAccessedAt,
    this.createdAt,
  });

  /// Unique share UUID.
  final String id;

  /// Plaintext bearer token (e.g. `pst_...`).
  ///
  /// Populated ONLY upon initial creation (`POST /api/v1/patients/share-token`).
  /// Null in index listings (`GET /api/v1/patients/share-tokens`).
  final String? token;

  /// Full shareable Web recipient URL with `#token=...` fragment.
  ///
  /// Populated ONLY upon initial creation.
  final String? shareUrl;

  /// Clinical data scope (e.g. 'all_emr' per DEC-P05-01).
  final String scope;

  /// Configured validity duration (e.g. '24h', '7d', '30d').
  final String? duration;

  /// Whether access to this share requires a PIN (always true per DEC-P05-03).
  final bool hasPin;

  /// Share status: 'active', 'revoked', 'expired', or 'locked'.
  final String status;

  /// Number of failed PIN attempts recorded.
  final int failedAttempts;

  /// Maximum allowed failed PIN attempts before temporary lockout (default 5).
  final int maxAttempts;

  /// Total successful recipient access count.
  final int accessCount;

  /// Expiry timestamp after which access is rejected with HTTP 410.
  final DateTime expiresAt;

  /// Revocation timestamp if revoked by the patient owner (DEC-P05-02).
  final DateTime? revokedAt;

  /// Timestamp of the most recent successful recipient decryption.
  final DateTime? lastAccessedAt;

  /// Creation timestamp.
  final DateTime? createdAt;

  /// Whether this share link has been revoked by the patient owner.
  bool get isRevoked => status.toLowerCase() == 'revoked' || revokedAt != null;

  /// Whether this share link has expired.
  bool get isExpired =>
      status.toLowerCase() == 'expired' || DateTime.now().isAfter(expiresAt);

  /// Whether this share link is temporarily locked due to failed PIN attempts.
  bool get isLocked => status.toLowerCase() == 'locked';

  /// Whether this share link is currently valid, active, and accessible.
  bool get isActive =>
      status.toLowerCase() == 'active' && !isRevoked && !isExpired && !isLocked;

  /// Remaining PIN attempts before lockout.
  int get remainingAttempts => (maxAttempts - failedAttempts).clamp(0, maxAttempts);

  /// Parses a [PatientShareToken] from JSON payload.
  factory PatientShareToken.fromJson(Map<String, dynamic> json) {
    return PatientShareToken(
      id: json['id'] as String? ?? '',
      token: json['token'] as String?,
      shareUrl: json['share_url'] as String?,
      scope: json['scope'] as String? ?? 'all_emr',
      duration: json['duration'] as String?,
      hasPin: json['has_pin'] as bool? ?? true,
      status: json['status'] as String? ?? 'active',
      failedAttempts: json['failed_attempts'] as int? ?? 0,
      maxAttempts: json['max_attempts'] as int? ?? 5,
      accessCount: json['access_count'] as int? ?? 0,
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      revokedAt: json['revoked_at'] != null
          ? DateTime.tryParse(json['revoked_at'].toString())
          : null,
      lastAccessedAt: json['last_accessed_at'] != null
          ? DateTime.tryParse(json['last_accessed_at'].toString())
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  /// Converts this share token representation to JSON (omitting sensitive fields).
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (token != null) 'token': token,
      if (shareUrl != null) 'share_url': shareUrl,
      'scope': scope,
      if (duration != null) 'duration': duration,
      'has_pin': hasPin,
      'status': status,
      'failed_attempts': failedAttempts,
      'max_attempts': maxAttempts,
      'access_count': accessCount,
      'expires_at': expiresAt.toIso8601String(),
      if (revokedAt != null) 'revoked_at': revokedAt!.toIso8601String(),
      if (lastAccessedAt != null) 'last_accessed_at': lastAccessedAt!.toIso8601String(),
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PatientShareToken &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          status == other.status &&
          expiresAt == other.expiresAt &&
          revokedAt == other.revokedAt;

  @override
  int get hashCode => Object.hash(id, status, expiresAt, revokedAt);

  @override
  String toString() {
    // Deliberately omits plaintext token or shareUrl to prevent credential logging
    return 'PatientShareToken(id: $id, scope: $scope, status: $status, expiresAt: $expiresAt, isRevoked: $isRevoked)';
  }
}

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'token_storage.dart';

/// Persistent authentication-token storage backed by the platform secure
/// enclave (Android Keystore / iOS Keychain).
///
/// The value is encrypted at rest; the token is never stored in plaintext and
/// survives Dart process termination, app restarts, and device reboots.
///
/// Every operation is failure-soft so a platform/storage failure cannot crash
/// the application or block the authentication lifecycle:
/// * [getToken] resolves to `null` when the underlying storage is unavailable,
///   which `AuthSessionManager.restoreSession` treats as "no session".
/// * [saveToken] does not claim persistence succeeded if the write fails.
/// * [clearToken] never crashes even if the platform delete fails.
///
/// Diagnostics are printed without ever logging the token value.
class SecureTokenStorage implements TokenStorage {
  SecureTokenStorage({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  /// Single stable key for the authentication token.
  static const String tokenKey = 'aafiya.auth.token';

  final FlutterSecureStorage _secureStorage;

  @override
  Future<String?> getToken() async {
    try {
      final token = await _secureStorage.read(key: tokenKey);
      if (token == null || token.isEmpty) {
        return null;
      }
      return token;
    } catch (e) {
      debugPrint('[SecureTokenStorage] getToken failed; treating as no token: $e');
      return null;
    }
  }

  @override
  Future<void> saveToken(String token) async {
    try {
      await _secureStorage.write(key: tokenKey, value: token);
    } catch (e) {
      debugPrint('[SecureTokenStorage] saveToken failed: $e');
    }
  }

  @override
  Future<void> clearToken() async {
    try {
      await _secureStorage.delete(key: tokenKey);
    } catch (e) {
      debugPrint('[SecureTokenStorage] clearToken failed: $e');
    }
  }

  @override
  Future<bool> hasToken() async => (await getToken()) != null;
}
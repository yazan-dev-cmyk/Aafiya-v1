/// Abstract interface for secure local token persistence.
abstract class TokenStorage {
  Future<String?> getToken();
  Future<void> saveToken(String token);
  Future<void> clearToken();
  Future<bool> hasToken();
}

/// In-memory token storage implementation for testing and baseline session lifecycle.
class InMemoryTokenStorage implements TokenStorage {
  InMemoryTokenStorage([this._token]);

  String? _token;

  @override
  Future<String?> getToken() async => _token;

  @override
  Future<void> saveToken(String token) async {
    _token = token;
  }

  @override
  Future<void> clearToken() async {
    _token = null;
  }

  @override
  Future<bool> hasToken() async => _token != null && _token!.isNotEmpty;
}

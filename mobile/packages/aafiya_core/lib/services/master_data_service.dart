import '../models/commune.dart';
import '../models/medical_specialty.dart';
import '../models/wilaya.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Centralized service providing typed methods and in-memory caching
/// for authoritative Medical Specialty, Wilaya & Commune master data.
class MasterDataService {
  MasterDataService(this._apiClient);

  final ApiClient _apiClient;

  // In-memory session caches (network efficiency, NOT a persistent offline DB)
  List<Wilaya>? _cachedWilayas;
  final Map<String, List<Commune>> _cachedCommunes = {};
  List<MedicalSpecialty>? _cachedSpecialties;

  /// Fetches all 69 authoritative Wilayas from `GET /api/v1/master/wilayas`.
  /// Subsequent calls return from in-memory cache unless [forceRefresh] is true.
  Future<ApiResult<List<Wilaya>>> getWilayas({bool forceRefresh = false}) async {
    if (!forceRefresh && _cachedWilayas != null) {
      return ApiSuccess(_cachedWilayas!);
    }

    final result = await _apiClient.get(
      ApiEndpoints.masterWilayas,
      requiresAuth: false,
      allowRetry: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        final rawList = data['data'];
        if (rawList is List) {
          final list = rawList
              .whereType<Map<String, dynamic>>()
              .map((e) => Wilaya.fromJson(e))
              .toList();

          // Sort by displayOrder asc, code asc
          list.sort((a, b) {
            final orderCmp = a.displayOrder.compareTo(b.displayOrder);
            if (orderCmp != 0) return orderCmp;
            return a.code.compareTo(b.code);
          });

          _cachedWilayas = list;
          return ApiSuccess(list);
        }
        return const ApiSuccess([]);

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }

  /// Fetches all Communes for a specific [wilayaCode] from `GET /api/v1/master/wilayas/{wilaya}/communes`.
  /// Subsequent calls for the same Wilaya code return from in-memory cache unless [forceRefresh] is true.
  Future<ApiResult<List<Commune>>> getCommunes(
    String wilayaCode, {
    bool forceRefresh = false,
  }) async {
    final cleanCode = wilayaCode.trim();
    if (cleanCode.isEmpty) {
      return const ApiSuccess([]);
    }

    if (!forceRefresh && _cachedCommunes.containsKey(cleanCode)) {
      return ApiSuccess(_cachedCommunes[cleanCode]!);
    }

    final result = await _apiClient.get(
      ApiEndpoints.masterCommunes(cleanCode),
      requiresAuth: false,
      allowRetry: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        final rawList = data['data'];
        if (rawList is List) {
          final list = rawList
              .whereType<Map<String, dynamic>>()
              .map((e) => Commune.fromJson(e))
              .toList();

          list.sort((a, b) {
            final orderCmp = a.displayOrder.compareTo(b.displayOrder);
            if (orderCmp != 0) return orderCmp;
            return a.code.compareTo(b.code);
          });

          _cachedCommunes[cleanCode] = list;
          return ApiSuccess(list);
        }
        return const ApiSuccess([]);

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }

  /// Resolves an existing legacy free-text Wilaya name to an authoritative [Wilaya]
  /// using the loaded Wilaya dataset.
  Wilaya? resolveLegacyWilaya(String raw) {
    if (_cachedWilayas == null || _cachedWilayas!.isEmpty) return null;
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    final lower = trimmed.toLowerCase();

    // 1. Direct code match
    for (final w in _cachedWilayas!) {
      if (w.code == trimmed) return w;
    }

    // 2. Exact or lowercase match
    for (final w in _cachedWilayas!) {
      if (w.nameAr == trimmed ||
          w.nameFr.toLowerCase() == lower ||
          w.nameEn.toLowerCase() == lower) {
        return w;
      }
    }

    // 3. Known aliases (e.g. Algiers / Alger-Centre)
    const aliases = {
      'alger': '16',
      'algiers': '16',
      'alger centre': '16',
      'الجزائر العاصمة': '16',
      'oran': '31',
      'constantine': '25',
      'blida': '09',
      'setif': '19',
      'sétif': '19',
      'annaba': '23',
      'tlemcen': '13',
    };

    final aliasCode = aliases[lower];
    if (aliasCode != null) {
      for (final w in _cachedWilayas!) {
        if (w.code == aliasCode) return w;
      }
    }

    return null;
  }

  /// Fetches all active canonical physician specialties from `GET /api/v1/master/specialties`.
  /// Defensive safety rule: strictly excludes `RAD` and `PATH` from physician appointment catalog.
  /// Subsequent calls return from in-memory cache unless [forceRefresh] is true.
  Future<ApiResult<List<MedicalSpecialty>>> getSpecialties({bool forceRefresh = false}) async {
    if (!forceRefresh && _cachedSpecialties != null) {
      return ApiSuccess(_cachedSpecialties!);
    }

    final result = await _apiClient.get(
      ApiEndpoints.masterSpecialties,
      requiresAuth: false,
      allowRetry: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        final rawList = data['data'];
        if (rawList is List) {
          final list = rawList
              .whereType<Map<String, dynamic>>()
              .map((e) => MedicalSpecialty.fromJson(e))
              .where((s) => s.isActive && s.code != 'RAD' && s.code != 'PATH')
              .toList();

          list.sort((a, b) {
            final orderCmp = a.displayOrder.compareTo(b.displayOrder);
            if (orderCmp != 0) return orderCmp;
            return a.code.compareTo(b.code);
          });

          _cachedSpecialties = list;
          return ApiSuccess(list);
        }
        return const ApiSuccess([]);

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }

  /// Resolves an existing legacy free-text specialty name to a canonical [MedicalSpecialty]
  /// using the loaded specialty dataset.
  /// Defensive safety rule: RAD and PATH are never resolved as physician specialties.
  MedicalSpecialty? resolveLegacySpecialty(String raw) {
    if (_cachedSpecialties == null || _cachedSpecialties!.isEmpty) return null;
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    final lower = trimmed.toLowerCase();

    // Check if numeric ID
    final numericId = int.tryParse(trimmed);
    if (numericId != null) {
      for (final s in _cachedSpecialties!) {
        if (s.id == numericId) return s;
      }
    }

    // Direct code match (case-insensitive)
    for (final s in _cachedSpecialties!) {
      if (s.code.toLowerCase() == lower) return s;
    }

    // Exact or localized match
    for (final s in _cachedSpecialties!) {
      if (s.nameAr == trimmed ||
          s.nameFr.toLowerCase() == lower ||
          s.nameEn.toLowerCase() == lower) {
        return s;
      }
    }

    return null;
  }

  /// Clears in-memory caches.
  void clearCache() {
    _cachedWilayas = null;
    _cachedCommunes.clear();
    _cachedSpecialties = null;
  }
}

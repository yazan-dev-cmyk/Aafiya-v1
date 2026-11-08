import '../models/ads_ticker_item.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';
import '../errors/app_exception.dart';

/// Service responsible for fetching eligible advertising ticker campaigns
/// and recording deduplicated click telemetry events across mobile applications.
class AdsTickerService {
  AdsTickerService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  // In-memory session cache keyed by destination
  final Map<String, List<AdsTickerItem>> _memoryCache = {};

  /// Clears in-memory cache upon user logout or account switch.
  void clearCache() {
    _memoryCache.clear();
  }

  /// Fetches eligible active advertising ticker campaigns from the backend.
  /// `GET /api/v1/ads/ticker?destination={destination}`
  Future<ApiResult<List<AdsTickerItem>>> getEligibleAds({
    String destination = 'ticker',
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && _memoryCache.containsKey(destination)) {
      return ApiSuccess(_memoryCache[destination]!);
    }

    final result = await _apiClient.get(
      ApiEndpoints.adsTicker,
      queryParameters: {'destination': destination},
      headers: {'X-Platform': 'mobile'},
      requiresAuth: true,
      includeClinicContext: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        try {
          final payload = data['data'];
          if (payload is List) {
            final ads = payload
                .whereType<Map<String, dynamic>>()
                .map(AdsTickerItem.fromJson)
                .where((ad) =>
                    ad.id.isNotEmpty &&
                    ad.title.trim().isNotEmpty &&
                    ad.content.trim().isNotEmpty &&
                    ad.isActive &&
                    ad.hasValidDates)
                .toList();

            _memoryCache[destination] = ads;
            return ApiSuccess(ads);
          }
          _memoryCache[destination] = [];
          return const ApiSuccess([]);
        } catch (e, st) {
          return ApiFailure(ServerException(
            statusCode: 500,
            message: 'Failed to parse advertising ticker feed: $e',
            cause: st,
          ));
        }

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }

  /// Records an advertising ticker click via the backend.
  /// `POST /api/v1/ads/ticker/{id}/click`
  Future<ApiResult<AdsTickerClickResult>> recordClick(
    String adId, {
    String destination = 'ticker',
  }) async {
    final result = await _apiClient.post(
      ApiEndpoints.adsTickerClick(adId),
      body: {'destination': destination},
      headers: {'X-Platform': 'mobile'},
      requiresAuth: true,
      includeClinicContext: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        try {
          final clickResult = AdsTickerClickResult.fromJson(data);
          return ApiSuccess(clickResult);
        } catch (e, st) {
          return ApiFailure(ServerException(
            statusCode: 500,
            message: 'Failed to parse click telemetry response: $e',
            cause: st,
          ));
        }

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }
}

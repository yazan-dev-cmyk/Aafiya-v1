import 'package:http/http.dart' as http;
import '../errors/app_exception.dart';
import '../models/assistant_rewards_models.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Service responsible for Doctor Assistant Financial Rewards APIs.
class AssistantRewardsService {
  const AssistantRewardsService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches rewards summary and balance for authenticated doctor assistant.
  /// `GET /api/v1/assistant/rewards/summary`
  Future<ApiResult<AssistantRewardSummary>> getSummary() async {
    final result = await _apiClient.get(
      ApiEndpoints.assistantRewardsSummary,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseSummary(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches paginated ledger transactions.
  /// `GET /api/v1/assistant/rewards/transactions`
  Future<ApiResult<List<AssistantRewardTransaction>>> getTransactions({
    int page = 1,
    int perPage = 20,
  }) async {
    final result = await _apiClient.get(
      ApiEndpoints.assistantRewardsTransactions,
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseTransactions(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches payout settlements history.
  /// `GET /api/v1/assistant/rewards/payouts`
  Future<ApiResult<List<AssistantPayoutItem>>> getPayouts({
    int page = 1,
    int perPage = 20,
  }) async {
    final result = await _apiClient.get(
      ApiEndpoints.assistantRewardsPayouts,
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parsePayouts(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Fetches all submitted payout profiles.
  /// `GET /api/v1/assistant/rewards/profiles`
  Future<ApiResult<List<AssistantPayoutProfile>>> getProfiles() async {
    final result = await _apiClient.get(
      ApiEndpoints.assistantRewardsProfiles,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseProfiles(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  /// Submits new RIP profile with crossed cheque document.
  /// `POST /api/v1/assistant/rewards/profiles`
  Future<ApiResult<AssistantPayoutProfile>> submitProfile({
    required String ripNumber,
    required List<int> chequeBytes,
    required String chequeFileName,
  }) async {
    final fields = {'rip_number': ripNumber};
    final files = [
      http.MultipartFile.fromBytes(
        'cheque_document',
        chequeBytes,
        filename: chequeFileName,
      ),
    ];

    final result = await _apiClient.postMultipart(
      ApiEndpoints.assistantRewardsProfiles,
      fields: fields,
      files: files,
      requiresAuth: true,
    );

    return switch (result) {
      ApiSuccess(:final data) => _parseSingleProfile(data),
      ApiFailure(:final exception) => ApiFailure(exception),
    };
  }

  // --- Parsing Helpers ---
  ApiResult<AssistantRewardSummary> _parseSummary(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is Map<String, dynamic>) {
        return ApiSuccess(AssistantRewardSummary.fromJson(payload));
      }
      return const ApiFailure(ServerException(
        statusCode: 500,
        message: 'Malformed rewards summary payload received.',
      ));
    } catch (e, st) {
      return ApiFailure(ServerException(
        statusCode: 500,
        message: 'Failed to parse rewards summary: $e',
        cause: st,
      ));
    }
  }

  ApiResult<List<AssistantRewardTransaction>> _parseTransactions(
      Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(AssistantRewardTransaction.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiSuccess([]);
    } catch (e, st) {
      return ApiFailure(ServerException(
        statusCode: 500,
        message: 'Failed to parse transactions list: $e',
        cause: st,
      ));
    }
  }

  ApiResult<List<AssistantPayoutItem>> _parsePayouts(Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(AssistantPayoutItem.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiSuccess([]);
    } catch (e, st) {
      return ApiFailure(ServerException(
        statusCode: 500,
        message: 'Failed to parse payouts list: $e',
        cause: st,
      ));
    }
  }

  ApiResult<List<AssistantPayoutProfile>> _parseProfiles(
      Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is List) {
        final list = payload
            .whereType<Map<String, dynamic>>()
            .map(AssistantPayoutProfile.fromJson)
            .toList();
        return ApiSuccess(list);
      }
      return const ApiSuccess([]);
    } catch (e, st) {
      return ApiFailure(ServerException(
        statusCode: 500,
        message: 'Failed to parse profiles list: $e',
        cause: st,
      ));
    }
  }

  ApiResult<AssistantPayoutProfile> _parseSingleProfile(
      Map<String, dynamic> data) {
    try {
      final payload = data['data'];
      if (payload is Map<String, dynamic>) {
        return ApiSuccess(AssistantPayoutProfile.fromJson(payload));
      }
      return const ApiFailure(ServerException(
        statusCode: 500,
        message: 'Malformed profile response received.',
      ));
    } catch (e, st) {
      return ApiFailure(ServerException(
        statusCode: 500,
        message: 'Failed to parse profile: $e',
        cause: st,
      ));
    }
  }
}

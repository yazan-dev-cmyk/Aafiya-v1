import '../models/prescription.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../network/api_result.dart';

/// Container for a paginated list of prescriptions.
class PrescriptionPaginatedResult {
  const PrescriptionPaginatedResult({
    required this.prescriptions,
    required this.currentPage,
    required this.lastPage,
    required this.total,
    this.perPage = 20,
  });

  final List<Prescription> prescriptions;
  final int currentPage;
  final int lastPage;
  final int total;
  final int perPage;

  bool get hasMore => currentPage < lastPage;
}

/// Service providing typed methods for interacting with prescription endpoints.
class PrescriptionService {
  const PrescriptionService(this._apiClient);

  final ApiClient _apiClient;

  /// Fetch paginated prescriptions for the authenticated patient.
  Future<ApiResult<PrescriptionPaginatedResult>> fetchPrescriptions({
    String? status,
    String? issueDate,
    String? fromDate,
    String? toDate,
    String? sortBy,
    String? sortOrder,
    int page = 1,
    int perPage = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
    };

    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }
    if (issueDate != null && issueDate.isNotEmpty) {
      queryParams['issue_date'] = issueDate;
    }
    if (fromDate != null && fromDate.isNotEmpty) {
      queryParams['from_date'] = fromDate;
    }
    if (toDate != null && toDate.isNotEmpty) {
      queryParams['to_date'] = toDate;
    }
    if (sortBy != null && sortBy.isNotEmpty) {
      queryParams['sort_by'] = sortBy;
    }
    if (sortOrder != null && sortOrder.isNotEmpty) {
      queryParams['sort_order'] = sortOrder;
    }

    final result = await _apiClient.get(
      ApiEndpoints.prescriptions,
      queryParameters: queryParams,
      allowRetry: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        final rawList = data['data'];
        final prescriptions = <Prescription>[];
        if (rawList is List) {
          for (final item in rawList) {
            if (item is Map<String, dynamic>) {
              prescriptions.add(Prescription.fromJson(item));
            }
          }
        }

        final meta = data['meta'] as Map<String, dynamic>?;
        final currentPage = meta?['current_page'] as int? ?? page;
        final lastPage = meta?['last_page'] as int? ?? (prescriptions.length < perPage ? page : page + 1);
        final total = meta?['total'] as int? ?? prescriptions.length;

        return ApiSuccess(
          PrescriptionPaginatedResult(
            prescriptions: prescriptions,
            currentPage: currentPage,
            lastPage: lastPage,
            total: total,
            perPage: perPage,
          ),
        );

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }

  /// Fetch a single prescription by its ID.
  Future<ApiResult<Prescription>> getPrescription(String id) async {
    final result = await _apiClient.get(
      '${ApiEndpoints.prescriptions}/$id',
      allowRetry: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        final raw = data['data'];
        if (raw is Map<String, dynamic>) {
          return ApiSuccess(Prescription.fromJson(raw));
        }
        return ApiSuccess(Prescription.fromJson(data));

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }

  /// Verify prescription by secure token.
  Future<ApiResult<Map<String, dynamic>>> verifyToken(String token) async {
    final result = await _apiClient.get(
      '${ApiEndpoints.verifyToken}/$token',
      allowRetry: true,
    );

    switch (result) {
      case ApiSuccess(:final data):
        final payload = (data['data'] as Map<String, dynamic>?) ?? data;
        return ApiSuccess(payload);

      case ApiFailure(:final exception):
        return ApiFailure(exception);
    }
  }
}

import 'patient_notification.dart';

/// Paged response envelope matching Laravel's LengthAwarePaginator for patient notifications.
class PatientNotificationsResponse {
  const PatientNotificationsResponse({
    required this.items,
    required this.currentPage,
    required this.lastPage,
    required this.perPage,
    required this.total,
  });

  final List<PatientNotification> items;
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;

  /// Whether additional pages can be fetched.
  bool get hasMore => currentPage < lastPage;

  /// Parses paginator envelope from backend JSON response.
  factory PatientNotificationsResponse.fromJson(Map<String, dynamic> json) {
    final rawList = json['data'];
    final items = <PatientNotification>[];

    if (rawList is List) {
      for (final raw in rawList) {
        if (raw is Map<String, dynamic>) {
          try {
            items.add(PatientNotification.fromJson(raw));
          } catch (_) {
            // Drop individual malformed items rather than crashing the entire response
          }
        }
      }
    }

    final currentPage = _parseInt(json['current_page'], fallback: 1);
    final lastPage = _parseInt(json['last_page'], fallback: 1);
    final perPage = _parseInt(json['per_page'], fallback: items.length);
    final total = _parseInt(json['total'], fallback: items.length);

    return PatientNotificationsResponse(
      items: List.unmodifiable(items),
      currentPage: currentPage,
      lastPage: lastPage,
      perPage: perPage,
      total: total,
    );
  }

  Map<String, dynamic> toJson() => {
        'data': items.map((e) => e.toJson()).toList(),
        'current_page': currentPage,
        'last_page': lastPage,
        'per_page': perPage,
        'total': total,
      };

  static int _parseInt(dynamic value, {required int fallback}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? fallback;
    return fallback;
  }
}

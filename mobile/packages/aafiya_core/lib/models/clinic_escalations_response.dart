import 'clinic_escalation.dart';

/// Paged response envelope matching Laravel JsonResource::collection metadata for clinic escalations.
class ClinicEscalationsResponse {
  const ClinicEscalationsResponse({
    required this.items,
    required this.currentPage,
    required this.lastPage,
    required this.perPage,
    required this.total,
  });

  final List<ClinicEscalation> items;
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;

  /// Whether additional pages can be fetched.
  bool get hasMore => currentPage < lastPage;

  /// Parses ResourceCollection envelope with nested `meta` pagination object.
  factory ClinicEscalationsResponse.fromJson(Map<String, dynamic> json) {
    final rawList = json['data'];
    final items = <ClinicEscalation>[];

    if (rawList is List) {
      for (final raw in rawList) {
        if (raw is Map<String, dynamic>) {
          try {
            items.add(ClinicEscalation.fromJson(raw));
          } catch (_) {
            // Drop individual malformed items rather than crashing the whole view
          }
        }
      }
    }

    final rawMeta = json['meta'];
    final Map<String, dynamic> meta =
        rawMeta is Map<String, dynamic> ? rawMeta : const {};

    final currentPage =
        _parseInt(meta['current_page'] ?? json['current_page'], fallback: 1);
    final lastPage =
        _parseInt(meta['last_page'] ?? json['last_page'], fallback: 1);
    final perPage =
        _parseInt(meta['per_page'] ?? json['per_page'], fallback: items.length);
    final total =
        _parseInt(meta['total'] ?? json['total'], fallback: items.length);

    return ClinicEscalationsResponse(
      items: List.unmodifiable(items),
      currentPage: currentPage,
      lastPage: lastPage,
      perPage: perPage,
      total: total,
    );
  }

  Map<String, dynamic> toJson() => {
        'data': items.map((e) => e.toJson()).toList(),
        'meta': {
          'current_page': currentPage,
          'last_page': lastPage,
          'per_page': perPage,
          'total': total,
        },
      };

  static int _parseInt(dynamic value, {required int fallback}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? fallback;
    return fallback;
  }
}

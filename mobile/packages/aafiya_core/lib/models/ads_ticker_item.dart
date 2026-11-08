import 'package:flutter/foundation.dart';

/// Single placement assignment for an advertising ticker campaign.
@immutable
class AdsTickerPlacement {
  const AdsTickerPlacement({
    required this.id,
    required this.destination,
    required this.audience,
  });

  final String id;
  final String destination;
  final String audience;

  factory AdsTickerPlacement.fromJson(Map<String, dynamic> json) {
    return AdsTickerPlacement(
      id: json['id'] as String? ?? '',
      destination: json['destination'] as String? ?? 'ticker',
      audience: json['audience'] as String? ?? 'public',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'destination': destination,
        'audience': audience,
      };
}

/// Advertising ticker campaign item returned by `GET /api/v1/ads/ticker`.
@immutable
class AdsTickerItem {
  const AdsTickerItem({
    required this.id,
    required this.title,
    required this.content,
    this.bannerImageUrl,
    this.targetUrl,
    this.priority = 0,
    this.status = 'active',
    this.tickerClicksCount = 0,
    this.startsAt,
    this.endsAt,
    this.createdAt,
    this.updatedAt,
    this.placements = const [],
  });

  final String id;
  final String title;
  final String content;
  final String? bannerImageUrl;
  final String? targetUrl;
  final int priority;
  final String status;
  final int tickerClicksCount;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<AdsTickerPlacement> placements;

  bool get isActive => status == 'active';

  bool get isExpired {
    if (endsAt == null) return false;
    return endsAt!.isBefore(DateTime.now());
  }

  bool get hasValidDates {
    final now = DateTime.now();
    if (startsAt != null && startsAt!.isAfter(now)) return false;
    if (endsAt != null && endsAt!.isBefore(now)) return false;
    return true;
  }

  factory AdsTickerItem.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      if (value is String && value.isNotEmpty) {
        return DateTime.tryParse(value);
      }
      return null;
    }

    final rawPlacements = json['placements'];
    final placementsList = <AdsTickerPlacement>[];
    if (rawPlacements is List) {
      for (final p in rawPlacements) {
        if (p is Map<String, dynamic>) {
          placementsList.add(AdsTickerPlacement.fromJson(p));
        }
      }
    }

    return AdsTickerItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      bannerImageUrl: json['banner_image_url'] as String?,
      targetUrl: json['target_url'] as String?,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'active',
      tickerClicksCount: (json['ticker_clicks_count'] as num?)?.toInt() ?? 0,
      startsAt: parseDate(json['starts_at']),
      endsAt: parseDate(json['ends_at']),
      createdAt: parseDate(json['created_at']),
      updatedAt: parseDate(json['updated_at']),
      placements: placementsList,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'banner_image_url': bannerImageUrl,
        'target_url': targetUrl,
        'priority': priority,
        'status': status,
        'ticker_clicks_count': tickerClicksCount,
        'starts_at': startsAt?.toIso8601String(),
        'ends_at': endsAt?.toIso8601String(),
        'created_at': createdAt?.toIso8601String(),
        'updated_at': updatedAt?.toIso8601String(),
        'placements': placements.map((p) => p.toJson()).toList(),
      };
}

/// Telemetry click result returned by `POST /api/v1/ads/ticker/{id}/click`.
@immutable
class AdsTickerClickResult {
  const AdsTickerClickResult({
    required this.success,
    required this.recorded,
    required this.clicksCount,
    this.targetUrl,
    this.reason,
  });

  final bool success;
  final bool recorded;
  final int clicksCount;
  final String? targetUrl;
  final String? reason;

  factory AdsTickerClickResult.fromJson(Map<String, dynamic> json) {
    return AdsTickerClickResult(
      success: json['success'] as bool? ?? false,
      recorded: json['recorded'] as bool? ?? false,
      clicksCount: (json['clicks_count'] as num?)?.toInt() ?? 0,
      targetUrl: json['target_url'] as String?,
      reason: json['reason'] as String?,
    );
  }
}

import 'package:flutter/foundation.dart';
import 'appointment.dart';

/// Paginated appointments response wrapper adhering to Laravel pagination.
@immutable
class PaginatedAppointments {
  const PaginatedAppointments({
    required this.items,
    required this.currentPage,
    required this.lastPage,
    required this.perPage,
    required this.total,
  });

  final List<Appointment> items;
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;

  bool get hasMore => currentPage < lastPage;
  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  factory PaginatedAppointments.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    final List<Appointment> appointments;

    if (rawData is List) {
      appointments = rawData
          .whereType<Map<String, dynamic>>()
          .map(Appointment.fromJson)
          .toList();
    } else {
      appointments = const [];
    }

    final meta = json['meta'] as Map<String, dynamic>?;
    final currentPage = (meta?['current_page'] as num?)?.toInt() ?? 1;
    final lastPage = (meta?['last_page'] as num?)?.toInt() ?? 1;
    final perPage = (meta?['per_page'] as num?)?.toInt() ?? appointments.length;
    final total = (meta?['total'] as num?)?.toInt() ?? appointments.length;

    return PaginatedAppointments(
      items: List.unmodifiable(appointments),
      currentPage: currentPage,
      lastPage: lastPage,
      perPage: perPage,
      total: total,
    );
  }

  static const empty = PaginatedAppointments(
    items: [],
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
    total: 0,
  );
}

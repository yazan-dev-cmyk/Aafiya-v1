import 'package:flutter/foundation.dart';

/// Operational statistics for the authenticated doctor in their active clinic context.
///
/// Strictly mirrors the verified backend contract from `GET /api/v1/doctor/stats`.
@immutable
class DoctorStats {
  const DoctorStats({
    required this.todayTotal,
    required this.pendingCheckIn,
    required this.inWaitingRoom,
    required this.completedToday,
    required this.noShowToday,
    this.activeClinicId,
    this.activeClinicName,
    required this.date,
  });

  /// Total non-rescheduled appointments for today.
  final int todayTotal;

  /// Appointments in 'pending' or 'confirmed' status not yet checked in.
  final int pendingCheckIn;

  /// Attended appointments with check-in timestamp present awaiting consultation.
  final int inWaitingRoom;

  /// Finalized clinical visits for today.
  final int completedToday;

  /// Appointments marked as no-show for today.
  final int noShowToday;

  /// Active clinic UUID or ID.
  final String? activeClinicId;

  /// Active clinic display name.
  final String? activeClinicName;

  /// Operational date in 'YYYY-MM-DD' format.
  final String date;

  /// Factory constructor to parse from backend JSON payload.
  factory DoctorStats.fromJson(Map<String, dynamic> json) {
    return DoctorStats(
      todayTotal: (json['today_total'] as num?)?.toInt() ?? 0,
      pendingCheckIn: (json['pending_check_in'] as num?)?.toInt() ?? 0,
      inWaitingRoom: (json['in_waiting_room'] as num?)?.toInt() ?? 0,
      completedToday: (json['completed_today'] as num?)?.toInt() ?? 0,
      noShowToday: (json['no_show_today'] as num?)?.toInt() ?? 0,
      activeClinicId: json['active_clinic_id']?.toString(),
      activeClinicName: json['active_clinic_name'] as String?,
      date: (json['date'] as String?) ?? '',
    );
  }

  /// Empty / zero statistics instance.
  static DoctorStats empty({String date = ''}) => DoctorStats(
        todayTotal: 0,
        pendingCheckIn: 0,
        inWaitingRoom: 0,
        completedToday: 0,
        noShowToday: 0,
        date: date,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DoctorStats &&
          runtimeType == other.runtimeType &&
          todayTotal == other.todayTotal &&
          pendingCheckIn == other.pendingCheckIn &&
          inWaitingRoom == other.inWaitingRoom &&
          completedToday == other.completedToday &&
          noShowToday == other.noShowToday &&
          activeClinicId == other.activeClinicId &&
          activeClinicName == other.activeClinicName &&
          date == other.date;

  @override
  int get hashCode => Object.hash(
        todayTotal,
        pendingCheckIn,
        inWaitingRoom,
        completedToday,
        noShowToday,
        activeClinicId,
        activeClinicName,
        date,
      );
}

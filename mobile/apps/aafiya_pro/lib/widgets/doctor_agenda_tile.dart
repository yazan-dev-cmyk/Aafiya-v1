import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Material 3 appointment tile for doctor's daily agenda.
///
/// Features:
/// - Prominent time slot representation
/// - Patient identity (authorized display name only, zero private phone/email)
/// - Status chip with localized text and color hierarchy
/// - Booking reference in caption style
/// - Optional booking center source chip
class DoctorAgendaTile extends StatelessWidget {
  const DoctorAgendaTile({
    super.key,
    required this.appointment,
    this.onTap,
  });

  final Appointment appointment;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final statusText = _statusText(appointment.status, strings);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: AafiyaCard(
        padding: AafiyaSpacing.insetAllMd,
        onTap: onTap,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Time Slot Column
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AafiyaColors.healthBlue.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                border: Border.all(
                  color: AafiyaColors.healthBlue.withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.access_time_rounded,
                    size: 16,
                    color: AafiyaColors.healthBlue,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\u200E${appointment.timeSlot ?? "--:--"}\u200E',
                    style: AafiyaTypography.titleMedium.copyWith(
                      color: AafiyaColors.healthBlue,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AafiyaSpacing.md),

            // Patient & Appointment Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          appointment.patient.name?.isNotEmpty == true
                              ? appointment.patient.name!
                              : strings.patientNameLabel,
                          style: AafiyaTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      // Standardized Accessible Status Chip
                      AafiyaStatusChip(
                        label: statusText,
                        type: _statusType(appointment.status),
                      ),
                      if (onTap != null) ...[
                        const SizedBox(width: 6),
                        const Icon(
                          Icons.medical_information_outlined,
                          size: 18,
                          color: AafiyaColors.healthBlue,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '${strings.bookingRefLabel}: \u200E${appointment.bookingReference}\u200E',
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                      ),
                      if (appointment.bookingCenter?.name != null) ...[
                        const SizedBox(width: 8),
                        const Text('•',
                            style:
                                TextStyle(color: AafiyaColors.secondaryText)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            appointment.bookingCenter!.name!,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (appointment.notes != null &&
                      appointment.notes!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      appointment.notes!,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontStyle: FontStyle.italic,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  AafiyaStatusType _statusType(AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.confirmed => AafiyaStatusType.confirmed,
      AppointmentStatus.attended => AafiyaStatusType.concluded,
      AppointmentStatus.pending => AafiyaStatusType.pending,
      AppointmentStatus.noShow => AafiyaStatusType.urgent,
      AppointmentStatus.cancelled ||
      AppointmentStatus.rejected ||
      AppointmentStatus.expired =>
        AafiyaStatusType.urgent,
      _ => AafiyaStatusType.concluded,
    };
  }

  String _statusText(AppointmentStatus status, LocalizedStrings strings) {
    return switch (status) {
      AppointmentStatus.confirmed => strings.filterConfirmed,
      AppointmentStatus.attended => strings.filterAttended,
      AppointmentStatus.pending => strings.pendingCheckInLabel,
      AppointmentStatus.noShow => strings.filterNoShow,
      AppointmentStatus.cancelled => 'ملغى',
      AppointmentStatus.rejected => 'مرفوض',
      AppointmentStatus.expired => 'منتهي',
      AppointmentStatus.rescheduled => 'مؤجل',
      _ => status.key,
    };
  }
}

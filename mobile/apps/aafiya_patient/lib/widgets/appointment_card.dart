import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Reusable card displaying appointment metadata for patient monitoring.
///
/// NOTE: Adheres strictly to DISC-01. Contains ZERO booking or creation actions.
class AppointmentCard extends StatelessWidget {
  const AppointmentCard({
    super.key,
    required this.appointment,
    this.onTap,
  });

  final Appointment appointment;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final statusColor = _resolveStatusColor(appointment.status);
    final statusBgColor = statusColor.withValues(alpha: 0.12);
    final statusBorderColor = statusColor.withValues(alpha: 0.35);

    final clinicText = _formatClinicText(appointment.clinic);

    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Row: Doctor Info & Status Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                  child: const Icon(
                    Icons.medical_services_outlined,
                    color: AafiyaColors.healthBlue,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        appointment.doctor.name?.isNotEmpty == true
                            ? appointment.doctor.name!
                            : strings.doctor,
                        style: AafiyaTypography.titleMedium.copyWith(
                          color: AafiyaColors.primaryText,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (appointment.doctor.specialty?.isNotEmpty == true) ...[
                        const SizedBox(height: 2),
                        Text(
                          appointment.doctor.specialty!,
                          style: AafiyaTypography.bodyMedium.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Status Chip
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    border: Border.all(color: statusBorderColor),
                  ),
                  child: Text(
                    strings.statusLabel(appointment.status),
                    style: AafiyaTypography.caption.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: AafiyaColors.border),
            const SizedBox(height: 12),

            // Clinic details
            if (clinicText.isNotEmpty) ...[
              Row(
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    size: 16,
                    color: AafiyaColors.secondaryText,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      clinicText,
                      style: AafiyaTypography.bodyMedium.copyWith(
                        color: AafiyaColors.primaryText,
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],

            // Date & Time Row
            Row(
              children: [
                // Date
                Expanded(
                  child: Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_outlined,
                        size: 16,
                        color: AafiyaColors.secondaryText,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        appointment.appointmentDate?.isNotEmpty == true
                            ? appointment.appointmentDate!
                            : '-',
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.primaryText,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                // Time Slot
                if (appointment.timeSlot?.isNotEmpty == true)
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time_rounded,
                        size: 16,
                        color: AafiyaColors.secondaryText,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        appointment.timeSlot!,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.primaryText,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 10),

            // Bottom reference & tap guidance
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${strings.bookingReference}: #${appointment.bookingReference}',
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      strings.appointmentDetails,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.healthBlue,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                      color: AafiyaColors.healthBlue,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _resolveStatusColor(AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.pending => AafiyaColors.warning,
      AppointmentStatus.confirmed => AafiyaColors.success,
      AppointmentStatus.attended => AafiyaColors.healthBlue,
      AppointmentStatus.noShow => AafiyaColors.warning,
      AppointmentStatus.cancelled || AppointmentStatus.rejected => AafiyaColors.error,
      AppointmentStatus.expired => AafiyaColors.secondaryText,
      AppointmentStatus.rescheduled => AafiyaColors.info,
      AppointmentStatus.unknown => AafiyaColors.secondaryText,
    };
  }

  String _formatClinicText(AppointmentClinic clinic) {
    final parts = <String>[];
    if (clinic.name?.isNotEmpty == true) {
      parts.add(clinic.name!);
    }
    if (clinic.wilaya?.isNotEmpty == true) {
      parts.add('(${clinic.wilaya!})');
    }
    return parts.join(' ');
  }
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Operational Queue Patient Tile for AAFIYA Pro.
///
/// Displays a patient in the doctor's live waiting room or expected arrivals queue:
/// - Patient Name & Reference Code
/// - Scheduled Time Slot (24-hour)
/// - Arrival/Checked-in Time (for attended patients)
/// - Attendance & No-Show operational action buttons (for confirmed patients)
/// - Preserves strict patient privacy (ZERO phone or email exposed)
class QueuePatientTile extends StatelessWidget {
  const QueuePatientTile({
    super.key,
    required this.appointment,
    this.queueIndex,
    this.onAttend,
    this.onNoShow,
    this.onConfirm,
    this.onViewSummary,
    this.isProcessing = false,
  });

  final Appointment appointment;
  final int? queueIndex;
  final VoidCallback? onAttend;
  final VoidCallback? onNoShow;
  final VoidCallback? onConfirm;
  final VoidCallback? onViewSummary;
  final bool isProcessing;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final isAttended = appointment.status == AppointmentStatus.attended;
    final isConfirmed = appointment.status == AppointmentStatus.confirmed;
    final isPending = appointment.status == AppointmentStatus.pending;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AafiyaSpacing.xs),
      child: AafiyaCard(
        borderColor: isAttended
            ? AafiyaColors.healthBlue.withValues(alpha: 0.4)
            : AafiyaColors.border,
        padding: AafiyaSpacing.insetAllMd,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Queue position index or time icon
                if (queueIndex != null)
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isAttended
                          ? AafiyaColors.healthBlue.withValues(alpha: 0.12)
                          : AafiyaColors.lightBackground,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '$queueIndex',
                      style: AafiyaTypography.bodyMedium.copyWith(
                        color: isAttended
                            ? AafiyaColors.healthBlue
                            : AafiyaColors.primaryText,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isAttended
                          ? AafiyaColors.healthBlue.withValues(alpha: 0.1)
                          : AafiyaColors.lightBackground,
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                    child: Icon(
                      isAttended
                          ? Icons.person_pin_circle_outlined
                          : Icons.schedule_outlined,
                      size: 20,
                      color: AafiyaColors.healthBlue,
                    ),
                  ),
                const SizedBox(width: AafiyaSpacing.sm),

                // Scheduled Time Slot
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AafiyaSpacing.sm,
                    vertical: AafiyaSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: AafiyaColors.healthBlue.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  ),
                  child: Text(
                    appointment.timeSlot ?? '--:--',
                    style: AafiyaTypography.caption.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.healthBlue,
                    ),
                  ),
                ),
                const Spacer(),

                // Status Badge
                if (isAttended)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AafiyaSpacing.sm,
                      vertical: AafiyaSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: AafiyaColors.info.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                      border: Border.all(
                        color: AafiyaColors.info.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.how_to_reg_rounded,
                          size: 14,
                          color: AafiyaColors.info,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          strings.patientInWaitingRoomBadge,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.info,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  _buildStatusChip(context, appointment.status, strings),
              ],
            ),
            const SizedBox(height: AafiyaSpacing.sm),

            // Patient Name & Summary Action
            Row(
              children: [
                Expanded(
                  child: Text(
                    appointment.patient.name ?? strings.patientNameLabel,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (onViewSummary != null) ...[
                  const SizedBox(width: 8),
                  InkWell(
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    onTap: onViewSummary,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AafiyaColors.healthBlue.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                        border: Border.all(
                          color: AafiyaColors.healthBlue.withValues(alpha: 0.25),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.medical_information_outlined,
                            size: 14,
                            color: AafiyaColors.healthBlue,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            strings.viewPatientSummary,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.healthBlue,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: AafiyaSpacing.xs),

            // Reference Code & Booking Center Chip
            Row(
              children: [
                Text(
                  '${strings.bookingRefLabel} ${appointment.bookingReference}',
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                ),
                if (appointment.bookingCenter?.name != null) ...[
                  const SizedBox(width: AafiyaSpacing.sm),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AafiyaSpacing.xs,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AafiyaColors.lightBackground,
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                    child: Text(
                      appointment.bookingCenter!.name!,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ],
            ),

            // Arrival Time info for attended patients
            if (isAttended && appointment.checkedInAt != null) ...[
              const SizedBox(height: AafiyaSpacing.xs),
              Row(
                children: [
                  const Icon(
                    Icons.access_time_filled,
                    size: 13,
                    color: AafiyaColors.info,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${strings.checkedInAtLabel}: ${_formatTime(appointment.checkedInAt!)}',
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.info,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],

            // Patient notes if available
            if (appointment.notes != null && appointment.notes!.trim().isNotEmpty) ...[
              const SizedBox(height: AafiyaSpacing.xs),
              Text(
                appointment.notes!,
                style: AafiyaTypography.caption.copyWith(
                  color: AafiyaColors.secondaryText,
                  fontStyle: FontStyle.italic,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            // Action Buttons for Confirmed Appointments
            if (isConfirmed && (onAttend != null || onNoShow != null)) ...[
              const SizedBox(height: AafiyaSpacing.md),
              const Divider(height: 1, color: AafiyaColors.border),
              const SizedBox(height: AafiyaSpacing.sm),
              Row(
                children: [
                  // Mark Attended Button
                  if (onAttend != null)
                    Expanded(
                      flex: 3,
                      child: ElevatedButton.icon(
                        icon: isProcessing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AafiyaColors.pureWhite,
                                ),
                              )
                            : const Icon(Icons.check_circle_outline, size: 18),
                        label: Text(strings.markAttendedAction),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AafiyaColors.healingGreen,
                          foregroundColor: AafiyaColors.pureWhite,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(
                            horizontal: AafiyaSpacing.sm,
                            vertical: 10,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                          ),
                        ),
                        onPressed: isProcessing ? null : onAttend,
                      ),
                    ),
                  if (onAttend != null && onNoShow != null)
                    const SizedBox(width: AafiyaSpacing.sm),

                  // Mark No-Show Button
                  if (onNoShow != null)
                    Expanded(
                      flex: 2,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.person_off_outlined, size: 18),
                        label: Text(strings.markNoShowAction),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AafiyaColors.error,
                          side: const BorderSide(color: AafiyaColors.error),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(
                            horizontal: AafiyaSpacing.sm,
                            vertical: 10,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                          ),
                        ),
                        onPressed: isProcessing ? null : onNoShow,
                      ),
                    ),
                ],
              ),
            ],

            // Action Button for Pending Appointments (Confirm)
            if (isPending && onConfirm != null) ...[
              const SizedBox(height: AafiyaSpacing.md),
              const Divider(height: 1, color: AafiyaColors.border),
              const SizedBox(height: AafiyaSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: isProcessing
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AafiyaColors.pureWhite,
                              ),
                            )
                          : const Icon(Icons.check_circle_rounded, size: 18),
                      label: Text(strings.confirmAppointmentAction),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AafiyaColors.healingGreen,
                        foregroundColor: AafiyaColors.pureWhite,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(
                          horizontal: AafiyaSpacing.sm,
                          vertical: 10,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                        ),
                      ),
                      onPressed: isProcessing ? null : onConfirm,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(
    BuildContext context,
    AppointmentStatus status,
    LocalizedStrings strings,
  ) {
    final (label, color) = switch (status) {
      AppointmentStatus.confirmed => (strings.filterConfirmed, AafiyaColors.healthBlue),
      AppointmentStatus.attended => (strings.filterAttended, AafiyaColors.healingGreen),
      AppointmentStatus.noShow => (strings.filterNoShow, AafiyaColors.error),
      AppointmentStatus.pending => (strings.pendingCheckInLabel, AafiyaColors.warning),
      _ => (status.key, AafiyaColors.secondaryText),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AafiyaSpacing.sm,
        vertical: AafiyaSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
      ),
      child: Text(
        label,
        style: AafiyaTypography.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  String _formatTime(String isoString) {
    try {
      final dateTime = DateTime.parse(isoString).toLocal();
      final hour = dateTime.hour.toString().padLeft(2, '0');
      final minute = dateTime.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } catch (_) {
      return isoString;
    }
  }
}

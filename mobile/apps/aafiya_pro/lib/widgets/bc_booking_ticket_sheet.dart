import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// Modal bottom sheet displaying the official booking ticket for an appointment.
/// Strictly renders backend-authoritative fields: booking_reference, secure_token QR,
/// status, patient, doctor, clinic, date, and time slot.
class BcBookingTicketSheet extends StatelessWidget {
  const BcBookingTicketSheet({
    super.key,
    required this.appointment,
    this.onBookAnother,
  });

  final Appointment appointment;
  final VoidCallback? onBookAnother;

  static Future<void> show(
    BuildContext context, {
    required Appointment appointment,
    VoidCallback? onBookAnother,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BcBookingTicketSheet(
        appointment: appointment,
        onBookAnother: onBookAnother,
      ),
    );
  }

  Color _getStatusColor(AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.pending => AafiyaColors.warning,
      AppointmentStatus.confirmed => AafiyaColors.healthBlue,
      AppointmentStatus.attended => AafiyaColors.healingGreen,
      AppointmentStatus.noShow => AafiyaColors.secondaryText,
      AppointmentStatus.cancelled || AppointmentStatus.rejected => AafiyaColors.error,
      AppointmentStatus.expired || AppointmentStatus.rescheduled => AafiyaColors.secondaryText,
      AppointmentStatus.unknown => AafiyaColors.secondaryText,
    };
  }

  String _getStatusLabel(LocalizedStrings strings, AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.pending => strings.statusPending,
      AppointmentStatus.confirmed => strings.statusConfirmed,
      AppointmentStatus.attended => strings.statusAttended,
      AppointmentStatus.noShow => strings.statusNoShow,
      AppointmentStatus.cancelled => strings.statusCancelled,
      AppointmentStatus.rejected => strings.statusRejected,
      AppointmentStatus.expired => 'منتهي',
      AppointmentStatus.rescheduled => 'مُعاد جدولته',
      AppointmentStatus.unknown => 'غير محدد',
    };
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final statusColor = _getStatusColor(appointment.status);
    final statusLabel = _getStatusLabel(strings, appointment.status);
    final qrData = appointment.secureToken ?? appointment.bookingReference;

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AafiyaColors.pureWhite,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AafiyaColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Sheet Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.confirmation_num_outlined,
                        color: AafiyaColors.healthBlue, size: 24),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        strings.bookingTicketTitle,
                        style: AafiyaTypography.titleLarge
                            .copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Ticket Content
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Booking Reference & Status Banner
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  strings.bookingReferenceLabel,
                                  style: AafiyaTypography.caption
                                      .copyWith(color: AafiyaColors.secondaryText),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    statusLabel,
                                    style: AafiyaTypography.caption.copyWith(
                                      color: statusColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  appointment.bookingReference,
                                  style: AafiyaTypography.headlineMedium.copyWith(
                                    color: AafiyaColors.primaryText,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                IconButton(
                                  icon: const Icon(Icons.copy_rounded, size: 20),
                                  tooltip: 'نسخ المرجع',
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(
                                        text: appointment.bookingReference));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(strings.copyReferenceSuccess),
                                        duration: const Duration(seconds: 2),
                                        behavior: SnackBarBehavior.floating,
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // QR Code Container
                      Center(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AafiyaColors.border),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: QrImageView(
                            data: qrData,
                            version: QrVersions.auto,
                            size: 160.0,
                            backgroundColor: Colors.white,
                            errorCorrectionLevel: QrErrorCorrectLevel.M,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      if (appointment.secureToken != null &&
                          appointment.secureToken!.isNotEmpty) ...[
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AafiyaColors.lightBackground,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.qr_code_2_rounded,
                                    size: 16, color: AafiyaColors.secondaryText),
                                const SizedBox(width: 6),
                                Text(
                                  '${strings.secureTokenLabel}: ${appointment.secureToken!.substring(0, 8)}...',
                                  style: AafiyaTypography.caption
                                      .copyWith(fontFamily: 'monospace'),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Appointment Details Card
                      AafiyaCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'تفاصيل الحجز',
                              style: AafiyaTypography.titleMedium
                                  .copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 12),
                            _buildDetailRow(
                              icon: Icons.person_rounded,
                              label: 'المريض',
                              value: appointment.patient.name ?? 'غير محدد',
                              secondary: appointment.patient.phone,
                            ),
                            const Divider(height: 16),
                            _buildDetailRow(
                              icon: Icons.medical_services_outlined,
                              label: 'الطبيب المعالج',
                              value: appointment.doctor.name ?? 'غير محدد',
                              secondary: appointment.doctor.specialty,
                            ),
                            const Divider(height: 16),
                            _buildDetailRow(
                              icon: Icons.local_hospital_outlined,
                              label: 'العيادة',
                              value: appointment.clinic.name ?? 'غير محدد',
                              secondary: appointment.clinic.wilaya,
                            ),
                            const Divider(height: 16),
                            _buildDetailRow(
                              icon: Icons.calendar_today_rounded,
                              label: 'الموعد',
                              value: appointment.appointmentDate ?? 'غير محدد',
                              secondary: appointment.timeSlot != null
                                  ? 'الفترة: ${appointment.timeSlot}'
                                  : null,
                            ),
                            if (appointment.notes != null &&
                                appointment.notes!.trim().isNotEmpty) ...[
                              const Divider(height: 16),
                              _buildDetailRow(
                                icon: Icons.notes_rounded,
                                label: 'ملاحظات',
                                value: appointment.notes!,
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Explanatory Notice
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AafiyaColors.healthBlue.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: AafiyaColors.healthBlue.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.info_outline_rounded,
                                color: AafiyaColors.healthBlue, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'يرجى تزويد المريض برقم المرجع أو رمز الاستجابة السريعة (QR) لإبرازه عند الوصول إلى العيادة لتأكيد الحضور.',
                                style: AafiyaTypography.caption.copyWith(
                                  color: AafiyaColors.primaryText,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Action Buttons
                      if (onBookAnother != null) ...[
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pop();
                            onBookAnother!();
                          },
                          icon: const Icon(Icons.add_rounded),
                          label: Text(strings.bookAnotherAction),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AafiyaColors.healthBlue,
                            foregroundColor: AafiyaColors.pureWhite,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                      OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(strings.dismiss),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    String? secondary,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AafiyaColors.secondaryText),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AafiyaTypography.caption
                    .copyWith(color: AafiyaColors.secondaryText),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: AafiyaTypography.bodyMedium
                    .copyWith(fontWeight: FontWeight.w600),
              ),
              if (secondary != null && secondary.isNotEmpty) ...[
                const SizedBox(height: 1),
                Text(
                  secondary,
                  style: AafiyaTypography.caption
                      .copyWith(color: AafiyaColors.secondaryText),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

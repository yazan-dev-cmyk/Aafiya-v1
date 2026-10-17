import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// Modal bottom sheet presenting the official digital visit pass (QR Pass) for an appointment.
///
/// Implements P-02 Parity Requirements:
/// - Strictly encodes appointment `secureToken` (zero clinical or personal medical data in QR).
/// - Displays booking reference, status, clinic, doctor, date, and time slot.
/// - Gracefully handles missing tokens, terminal/cancelled appointments, and attended appointments.
class VisitPassSheet extends StatelessWidget {
  const VisitPassSheet({
    super.key,
    required this.appointment,
  });

  final Appointment appointment;

  /// Helper to display this visit pass inside a modal bottom sheet.
  static Future<void> show(
    BuildContext context, {
    required Appointment appointment,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => VisitPassSheet(appointment: appointment),
    );
  }

  bool get _hasToken =>
      appointment.secureToken != null && appointment.secureToken!.trim().isNotEmpty;

  bool get _isTerminal =>
      appointment.status == AppointmentStatus.cancelled ||
      appointment.status == AppointmentStatus.rejected ||
      appointment.status == AppointmentStatus.expired ||
      appointment.status == AppointmentStatus.noShow;

  bool get _isAttended => appointment.status == AppointmentStatus.attended;

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

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final statusColor = _resolveStatusColor(appointment.status);
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    return DraggableScrollableSheet(
      initialChildSize: 0.82,
      minChildSize: 0.45,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AafiyaColors.pureWhite,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AafiyaRadius.lg)),
          ),
          child: Column(
            children: [
              // 1. Drag Handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AafiyaColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // 2. Sheet Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                      ),
                      child: const Icon(
                        Icons.qr_code_2_rounded,
                        color: AafiyaColors.healthBlue,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            strings.isArabic
                                ? 'تصريح الزيارة الرقمي'
                                : strings.isFrench
                                    ? 'Pass de visite digital'
                                    : 'Digital Visit Pass',
                            style: AafiyaTypography.titleLarge.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AafiyaColors.primaryText,
                            ),
                          ),
                          Text(
                            strings.isArabic
                                ? 'رمز الدخول الموحد للعيادة'
                                : strings.isFrench
                                    ? 'Code d’accès clinique'
                                    : 'Clinic check-in access code',
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      tooltip: strings.close,
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // 3. Scrollable Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Status Badge & Reference Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                            border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            strings.statusLabel(appointment.status),
                            style: AafiyaTypography.bodyMedium.copyWith(
                              color: statusColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () {
                            Clipboard.setData(ClipboardData(text: appointment.bookingReference));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  strings.isArabic
                                      ? 'تم نسخ رقم الحجز #${appointment.bookingReference}'
                                      : 'Copied booking reference #${appointment.bookingReference}',
                                ),
                                duration: const Duration(seconds: 2),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '#${appointment.bookingReference}',
                                  style: AafiyaTypography.bodyMedium.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AafiyaColors.healthBlue,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(
                                  Icons.copy_rounded,
                                  size: 16,
                                  color: AafiyaColors.healthBlue,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // QR Display Container / Ineligible Card / Missing Token Card
                    Center(
                      child: _buildQrSection(context, strings, isRtl),
                    ),
                    const SizedBox(height: 24),

                    // Appointment Summary Card
                    AafiyaCard(
                      padding: AafiyaSpacing.insetAllMd,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (appointment.doctor.name?.isNotEmpty == true) ...[
                            Row(
                              children: [
                                const Icon(Icons.medical_services_outlined,
                                    size: 18, color: AafiyaColors.healthBlue),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    appointment.doctor.name!,
                                    style: AafiyaTypography.titleMedium.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                          ],
                          if (appointment.clinic.name?.isNotEmpty == true) ...[
                            Row(
                              children: [
                                const Icon(Icons.apartment_rounded,
                                    size: 18, color: AafiyaColors.secondaryText),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    appointment.clinic.name!,
                                    style: AafiyaTypography.bodyMedium,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                          ],
                          Row(
                            children: [
                              const Icon(Icons.calendar_today_outlined,
                                  size: 18, color: AafiyaColors.secondaryText),
                              const SizedBox(width: 8),
                              Text(
                                appointment.appointmentDate?.isNotEmpty == true
                                    ? strings.formatDate(appointment.appointmentDate)
                                    : '-',
                                style: AafiyaTypography.bodyMedium.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (appointment.timeSlot?.isNotEmpty == true) ...[
                                const Text(' • '),
                                Text(
                                  appointment.timeSlot!,
                                  style: AafiyaTypography.bodyMedium.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AafiyaColors.healthBlue,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Guidance Note
                    Container(
                      padding: AafiyaSpacing.insetAllMd,
                      decoration: BoxDecoration(
                        color: AafiyaColors.lightBackground,
                        borderRadius: BorderRadius.circular(AafiyaRadius.md),
                        border: Border.all(color: AafiyaColors.border),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.info_outline_rounded,
                            size: 20,
                            color: AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              strings.isArabic
                                  ? 'وجّه هذا الرمز عند الوصول لمسح مكتب الاستقبال لتسجيل الحضور وتأكيد دورك بالعيادة.'
                                  : strings.isFrench
                                      ? 'Présentez ce code QR à la réception pour valider votre arrivée à la clinique.'
                                      : 'Present this QR code at clinic reception to confirm your arrival and secure your turn.',
                              style: AafiyaTypography.caption.copyWith(
                                color: AafiyaColors.secondaryText,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Close Button
                    AafiyaButton(
                      label: strings.close,
                      onPressed: () => Navigator.of(context).pop(),
                      variant: AafiyaButtonVariant.outline,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildQrSection(BuildContext context, LocalizedStrings strings, bool isRtl) {
    if (!_hasToken) {
      return Container(
        key: const Key('visit_pass_missing_token_card'),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
        decoration: BoxDecoration(
          color: AafiyaColors.warning.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(AafiyaRadius.lg),
          border: Border.all(color: AafiyaColors.warning.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            const Icon(Icons.qr_code_scanner_rounded, size: 48, color: AafiyaColors.warning),
            const SizedBox(height: 12),
            Text(
              strings.isArabic
                  ? 'رمز المرور غير متوفر لهذا الموعد'
                  : 'Check-in token unavailable for this appointment',
              style: AafiyaTypography.bodyMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: AafiyaColors.primaryText,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              strings.isArabic
                  ? 'يرجى مراجعة موظف الاستقبال أو استخدام الرقم المرجعي للحجز.'
                  : 'Please check with reception or provide your booking reference.',
              style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    if (_isTerminal) {
      return Container(
        key: const Key('visit_pass_ineligible_card'),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
        decoration: BoxDecoration(
          color: AafiyaColors.error.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(AafiyaRadius.lg),
          border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            const Icon(Icons.block_rounded, size: 48, color: AafiyaColors.error),
            const SizedBox(height: 12),
            Text(
              strings.isArabic
                  ? 'هذا الموعد غير مؤهل لتسجيل الحضور'
                  : 'This appointment is not eligible for check-in',
              style: AafiyaTypography.bodyMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: AafiyaColors.error,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              strings.isArabic
                  ? 'تم إلغاء الموعد أو انقضاء صلاحيته مسبقاً.'
                  : 'This appointment has been cancelled or has expired.',
              style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return Container(
      key: const Key('visit_pass_qr_container'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AafiyaRadius.lg),
        border: Border.all(color: AafiyaColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          if (_isAttended) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AafiyaColors.success.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                border: Border.all(color: AafiyaColors.success.withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle_rounded, size: 16, color: AafiyaColors.success),
                  const SizedBox(width: 6),
                  Text(
                    strings.isArabic ? 'تم تسجيل الحضور مسبقاً' : 'Attendance Already Recorded',
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.success,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
          QrImageView(
            key: const Key('visit_pass_qr_image'),
            data: appointment.secureToken!,
            version: QrVersions.auto,
            size: 200.0,
            backgroundColor: Colors.white,
            errorCorrectionLevel: QrErrorCorrectLevel.M,
          ),
          const SizedBox(height: 12),
          Text(
            strings.isArabic ? 'تصريح صالح للاستخدام مرة واحدة' : 'Single-use validated pass',
            style: AafiyaTypography.caption.copyWith(
              color: AafiyaColors.secondaryText,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

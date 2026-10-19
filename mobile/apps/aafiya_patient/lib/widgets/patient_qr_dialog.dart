import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Accessible modal dialog presenting an enlarged, high-contrast QR visit pass for clinic check-in.
///
/// Adheres strictly to security and accessibility requirements:
/// - Payload encodes ONLY `appointment.secureToken` (zero clinical or personal data).
/// - Exact 1:1 square aspect ratio with minimum 20px quiet-zone padding on pure white background.
/// - Minimum 48x48px close target with accessible dismiss semantics.
/// - Full RTL and LTR directionality support.
class PatientQrDialog extends StatelessWidget {
  const PatientQrDialog({
    super.key,
    required this.appointment,
  });

  final Appointment appointment;

  /// Helper to display this enlarged QR pass in a dialog.
  static Future<void> show(
    BuildContext context, {
    required Appointment appointment,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (_) => PatientQrDialog(appointment: appointment),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Dialog(
      backgroundColor: AafiyaColors.pureWhite,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AafiyaRadius.sheet),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380.0),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20.0, 16.0, 20.0, 20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Bar: Title & Explicit Close Target
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 40.0,
                          height: 40.0,
                          decoration: BoxDecoration(
                            color: AafiyaColors.tealSoft,
                            borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                          ),
                          child: const Icon(
                            Icons.qr_code_2_rounded,
                            color: AafiyaColors.tealInk,
                            size: 24.0,
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                strings.isArabic
                                    ? 'تصريح الزيارة'
                                    : strings.isFrench
                                        ? 'Pass de visite'
                                        : 'Visit Pass',
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: AafiyaColors.primaryText,
                                ),
                              ),
                              Text(
                                '#${appointment.bookingReference}',
                                style: AafiyaTypography.caption.copyWith(
                                  fontSize: 14.0,
                                  fontWeight: FontWeight.w600,
                                  color: AafiyaColors.royalBlue,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Semantics(
                    button: true,
                    label: strings.close,
                    child: IconButton(
                      icon: const Icon(Icons.close_rounded),
                      tooltip: strings.close,
                      iconSize: 24.0,
                      constraints: const BoxConstraints(minWidth: 48.0, minHeight: 48.0),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16.0),

              // Enlarged QR Container (1:1 Ratio, Pure White, >= 20px Quiet Zone)
              Center(
                child: Container(
                  padding: const EdgeInsets.all(20.0),
                  decoration: BoxDecoration(
                    color: AafiyaColors.pureWhite,
                    borderRadius: BorderRadius.circular(AafiyaRadius.card),
                    border: Border.all(
                      color: AafiyaColors.lineDivider,
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AafiyaColors.navy.withValues(alpha: 0.08),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Semantics(
                    label: strings.isArabic
                        ? 'رمز الاستجابة السريعة لتسجيل الحضور'
                        : strings.isFrench
                            ? 'Code QR pour enregistrement'
                            : 'Check-in QR code',
                    image: true,
                    child: SizedBox(
                      width: 240.0,
                      height: 240.0,
                      child: QrImageView(
                        data: appointment.secureToken ?? '',
                        version: QrVersions.auto,
                        size: 240.0,
                        backgroundColor: AafiyaColors.pureWhite,
                        errorCorrectionLevel: QrErrorCorrectLevel.M,
                        gapless: false,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16.0),

              // Metadata Summary Card
              Container(
                padding: const EdgeInsets.all(12.0),
                decoration: BoxDecoration(
                  color: AafiyaColors.scaffoldBg,
                  borderRadius: BorderRadius.circular(AafiyaRadius.button),
                  border: Border.all(color: AafiyaColors.lineDivider),
                ),
                child: Column(
                  children: [
                    if (appointment.doctor.name != null && appointment.doctor.name!.isNotEmpty)
                      Row(
                        children: [
                          const Icon(
                            Icons.medical_services_outlined,
                            size: 18.0,
                            color: AafiyaColors.royalBlue,
                          ),
                          const SizedBox(width: 8.0),
                          Expanded(
                            child: Text(
                              appointment.doctor.name!,
                              style: AafiyaTypography.bodyMedium.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AafiyaColors.primaryText,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    if (appointment.clinic.name != null && appointment.clinic.name!.isNotEmpty) ...[
                      const SizedBox(height: 6.0),
                      Row(
                        children: [
                          const Icon(
                            Icons.apartment_rounded,
                            size: 18.0,
                            color: AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 8.0),
                          Expanded(
                            child: Text(
                              appointment.clinic.name!,
                              style: AafiyaTypography.bodyMedium.copyWith(
                                color: AafiyaColors.secondaryText,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12.0),

              // Guidance / Single Use Footer Note
              Text(
                strings.isArabic
                    ? 'أظهر هذا الرمز لموظف الاستقبال عند وصولك إلى العيادة'
                    : strings.isFrench
                        ? 'Présentez ce code à la réception lors de votre arrivée'
                        : 'Present this code at reception upon your arrival',
                style: AafiyaTypography.bodyMedium.copyWith(
                  fontSize: 14.0,
                  color: AafiyaColors.secondaryText,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16.0),

              // Copy Booking Reference Action
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: appointment.bookingReference));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        strings.isArabic
                            ? 'تم نسخ رقم الحجز #${appointment.bookingReference}'
                            : strings.isFrench
                                ? 'Numéro de réservation copié #${appointment.bookingReference}'
                                : 'Copied booking reference #${appointment.bookingReference}',
                      ),
                      duration: const Duration(seconds: 2),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(AafiyaRadius.button),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.copy_rounded,
                        size: 18.0,
                        color: AafiyaColors.tealInk,
                      ),
                      const SizedBox(width: 6.0),
                      Text(
                        strings.isArabic
                            ? 'نسخ رقم الحجز'
                            : strings.isFrench
                                ? 'Copier le numéro'
                                : 'Copy Reference',
                        style: AafiyaTypography.bodyMedium.copyWith(
                          fontSize: 14.0,
                          fontWeight: FontWeight.w600,
                          color: AafiyaColors.tealInk,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

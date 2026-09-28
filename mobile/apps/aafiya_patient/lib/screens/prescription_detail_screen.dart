import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Screen displaying complete details of an authorized digital prescription.
///
/// Strictly read-only; no mutation operations permitted for patients.
class PrescriptionDetailScreen extends StatelessWidget {
  const PrescriptionDetailScreen({
    super.key,
    required this.prescription,
  });

  final Prescription prescription;

  static Future<void> show(BuildContext context, Prescription prescription) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PrescriptionDetailScreen(prescription: prescription),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    Color statusColor;
    Color statusBgColor;
    String statusLabel;

    switch (prescription.status.toLowerCase()) {
      case 'active':
        if (prescription.isValid) {
          statusColor = AafiyaColors.success;
          statusBgColor = AafiyaColors.success.withValues(alpha: 0.1);
          statusLabel = strings.statusActive;
        } else {
          statusColor = AafiyaColors.warning;
          statusBgColor = AafiyaColors.warning.withValues(alpha: 0.1);
          statusLabel = strings.filterStatusExpired;
        }
      case 'completed':
        statusColor = AafiyaColors.healthBlue;
        statusBgColor = AafiyaColors.healthBlue.withValues(alpha: 0.1);
        statusLabel = strings.filterStatusCompleted;
      case 'voided':
        statusColor = AafiyaColors.error;
        statusBgColor = AafiyaColors.error.withValues(alpha: 0.1);
        statusLabel = strings.statusVoided;
      case 'expired':
        statusColor = AafiyaColors.warning;
        statusBgColor = AafiyaColors.warning.withValues(alpha: 0.1);
        statusLabel = strings.filterStatusExpired;
      default:
        statusColor = AafiyaColors.secondaryText;
        statusBgColor = AafiyaColors.border;
        statusLabel = prescription.status;
    }

    final qrData = prescription.qrVerificationUrl.isNotEmpty
        ? prescription.qrVerificationUrl
        : 'https://api.aafiya.dz/v/${prescription.secureToken}';

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.prescriptionDetailTitle,
        leading: BackButton(
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: AafiyaSpacing.insetScreen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Read-only Notice Banner
            AafiyaCard(
              borderColor: AafiyaColors.info.withValues(alpha: 0.3),
              backgroundColor: AafiyaColors.info.withValues(alpha: 0.05),
              padding: AafiyaSpacing.insetAllMd,
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined, color: AafiyaColors.info, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      strings.readOnlyPrescriptionNotice,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.primaryText,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Prescription Overview Card
            AafiyaCard(
              padding: AafiyaSpacing.insetAllLg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          prescription.prescriptionReference.isNotEmpty
                              ? prescription.prescriptionReference
                              : strings.prescriptionReference,
                          style: AafiyaTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.primaryText,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: statusBgColor,
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
                  const SizedBox(height: 16),
                  const Divider(color: AafiyaColors.border),
                  const SizedBox(height: 12),

                  // Doctor
                  _buildDetailRow(
                    icon: Icons.person_outline_rounded,
                    label: strings.doctor,
                    value: prescription.doctor.specialty != null &&
                            prescription.doctor.specialty!.isNotEmpty
                        ? '${prescription.doctor.name} (${prescription.doctor.specialty})'
                        : prescription.doctor.name,
                  ),
                  const SizedBox(height: 10),

                  // Clinic
                  if (prescription.clinic.name.isNotEmpty) ...[
                    _buildDetailRow(
                      icon: Icons.local_hospital_outlined,
                      label: strings.clinic,
                      value: prescription.clinic.name,
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Issued On
                  if (prescription.issueDate != null) ...[
                    _buildDetailRow(
                      icon: Icons.calendar_today_outlined,
                      label: strings.issuedOn,
                      value: prescription.issueDate!,
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Valid Until / Expires On
                  if (prescription.expiryDate != null)
                    _buildDetailRow(
                      icon: Icons.event_available_outlined,
                      label: strings.validUntil,
                      value: prescription.expiryDate!,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Prescribed Medications Header
            Row(
              children: [
                const Icon(Icons.medication_liquid_outlined, color: AafiyaColors.healthBlue, size: 22),
                const SizedBox(width: 8),
                Text(
                  '${strings.medications} (${prescription.items.length})',
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Medications List
            if (prescription.items.isEmpty)
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                child: Center(
                  child: Text(
                    strings.noDoctorsFound,
                    style: AafiyaTypography.bodyMedium,
                  ),
                ),
              )
            else
              ...prescription.items.map((item) => _buildMedicationCard(context, strings, item)),

            // Doctor's General Notes
            if (prescription.notes != null && prescription.notes!.trim().isNotEmpty) ...[
              const SizedBox(height: 16),
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                backgroundColor: AafiyaColors.lightBackground,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.note_alt_outlined, size: 18, color: AafiyaColors.secondaryText),
                        const SizedBox(width: 6),
                        Text(
                          strings.doctorNotes,
                          style: AafiyaTypography.caption.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.primaryText,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      prescription.notes!,
                      style: AafiyaTypography.bodyMedium.copyWith(
                        color: AafiyaColors.primaryText,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // QR Code Verification Section (STEP 7)
            AafiyaCard(
              padding: AafiyaSpacing.insetAllLg,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.qr_code_2_rounded, color: AafiyaColors.healthBlue, size: 24),
                      const SizedBox(width: 8),
                      Text(
                        strings.qrVerification,
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    strings.scanQrNotice,
                    textAlign: TextAlign.center,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // QR Code Image Container
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AafiyaColors.border),
                    ),
                    child: QrImageView(
                      data: qrData,
                      version: QrVersions.auto,
                      size: 180.0,
                      backgroundColor: Colors.white,
                      errorCorrectionLevel: QrErrorCorrectLevel.M,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Secure Token Display
                  if (prescription.secureToken.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AafiyaColors.lightBackground,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${strings.qrSecureToken}: ${prescription.secureToken}',
                        style: AafiyaTypography.caption.copyWith(
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.w600,
                          color: AafiyaColors.primaryText,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Copy Link Button
                  OutlinedButton.icon(
                    icon: const Icon(Icons.copy_rounded, size: 16),
                    label: Text(strings.copyVerificationLink),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: qrData));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(strings.linkCopied),
                          duration: const Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AafiyaColors.secondaryText),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: AafiyaTypography.bodyMedium.copyWith(
            color: AafiyaColors.secondaryText,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: AafiyaTypography.bodyMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: AafiyaColors.primaryText,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMedicationCard(
    BuildContext context,
    LocalizedStrings strings,
    PrescriptionItem item,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AafiyaCard(
        padding: AafiyaSpacing.insetAllMd,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Medication Name & Substitution Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    item.medicationName,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.healthBlue,
                    ),
                  ),
                ),
                if (item.substitutionAllowed != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: item.substitutionAllowed!
                          ? AafiyaColors.success.withValues(alpha: 0.1)
                          : AafiyaColors.border,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item.substitutionAllowed!
                          ? strings.substitutionAllowed
                          : strings.substitutionNotAllowed,
                      style: AafiyaTypography.caption.copyWith(
                        color: item.substitutionAllowed!
                            ? AafiyaColors.success
                            : AafiyaColors.secondaryText,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),

            // Dosage & Frequency
            Row(
              children: [
                Expanded(
                  child: _buildItemMeta(
                    label: strings.dosage,
                    value: item.dosage,
                  ),
                ),
                Expanded(
                  child: _buildItemMeta(
                    label: strings.frequency,
                    value: item.frequency,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // Duration
            _buildItemMeta(
              label: strings.duration,
              value: item.duration,
            ),

            // Instructions
            if (item.instructions != null && item.instructions!.trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AafiyaColors.lightBackground,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${strings.instructions}: ${item.instructions}',
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.primaryText,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildItemMeta({required String label, required String value}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$label: ',
          style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
        ),
        Text(
          value,
          style: AafiyaTypography.caption.copyWith(
            fontWeight: FontWeight.w600,
            color: AafiyaColors.primaryText,
          ),
        ),
      ],
    );
  }
}

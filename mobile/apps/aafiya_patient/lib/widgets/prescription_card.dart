import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Card widget representing a digital prescription in a list view.
class PrescriptionCard extends StatelessWidget {
  const PrescriptionCard({
    super.key,
    required this.prescription,
    required this.onTap,
  });

  final Prescription prescription;
  final VoidCallback onTap;

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

    return AafiyaCard(
      onTap: onTap,
      padding: AafiyaSpacing.insetAllMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Header: Reference & Status Chip
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(
                      Icons.receipt_long_rounded,
                      color: AafiyaColors.healthBlue,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        prescription.prescriptionReference.isNotEmpty
                            ? prescription.prescriptionReference
                            : strings.prescriptionReference,
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AafiyaColors.primaryText,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
          const SizedBox(height: 12),

          // Doctor & Specialty Info
          Row(
            children: [
              const Icon(
                Icons.person_outline_rounded,
                size: 18,
                color: AafiyaColors.secondaryText,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  prescription.doctor.name.isNotEmpty
                      ? prescription.doctor.name
                      : strings.doctor,
                  style: AafiyaTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (prescription.doctor.specialty != null &&
                  prescription.doctor.specialty!.isNotEmpty)
                Text(
                  prescription.doctor.specialty!,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),

          // Clinic Info
          if (prescription.clinic.name.isNotEmpty) ...[
            Row(
              children: [
                const Icon(
                  Icons.local_hospital_outlined,
                  size: 18,
                  color: AafiyaColors.secondaryText,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    prescription.clinic.name,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],

          const Divider(height: 1, color: AafiyaColors.border),
          const SizedBox(height: 10),

          // Bottom Info: Date & Medications Count
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.event_outlined,
                    size: 16,
                    color: AafiyaColors.secondaryText,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    prescription.issueDate != null
                        ? '${strings.issuedOn}: ${prescription.issueDate}'
                        : strings.issuedOn,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  const Icon(
                    Icons.medication_outlined,
                    size: 16,
                    color: AafiyaColors.healthBlue,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${prescription.items.length} ${strings.medications}',
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.healthBlue,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Reusable card displaying clinic information for the directory.
///
/// NOTE: Adheres strictly to DISC-01.
/// Contains ZERO booking buttons, slot selectors, or appointment creation triggers.
class ClinicCard extends StatelessWidget {
  const ClinicCard({
    super.key,
    required this.clinic,
    this.onTap,
  });

  final Clinic clinic;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Row: Clinic Icon, Name, and Wilaya Tag
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                  child: const Icon(
                    Icons.local_hospital_rounded,
                    color: AafiyaColors.healthBlue,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        clinic.name,
                        style: AafiyaTypography.titleMedium.copyWith(
                          color: AafiyaColors.primaryText,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (clinic.wilaya != null && clinic.wilaya!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          strings.wilayaName(clinic.wilaya!),
                          style: AafiyaTypography.bodyMedium.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (clinic.wilaya != null && clinic.wilaya!.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                      border: Border.all(
                        color: AafiyaColors.healthBlue.withValues(alpha: 0.25),
                      ),
                    ),
                    child: Text(
                      strings.wilayaName(clinic.wilaya!),
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.healthBlue,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ],
            ),

            const SizedBox(height: 12),
            const Divider(height: 1, color: AafiyaColors.border),
            const SizedBox(height: 10),

            // Street Address (if available)
            if (clinic.address != null && clinic.address!.isNotEmpty) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    size: 16,
                    color: AafiyaColors.secondaryText,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      clinic.address!,
                      style: AafiyaTypography.bodyMedium.copyWith(
                        color: AafiyaColors.primaryText,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],

            // Phone Contact (Informational only)
            if (clinic.phone != null && clinic.phone!.isNotEmpty) ...[
              Row(
                children: [
                  const Icon(
                    Icons.phone_outlined,
                    size: 16,
                    color: AafiyaColors.healthBlue,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${strings.callClinic}: ',
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    clinic.phone!,
                    style: AafiyaTypography.bodyMedium.copyWith(
                      color: AafiyaColors.healthBlue,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],

            // Medical Director (if available)
            if (clinic.director != null) ...[
              Row(
                children: [
                  const Icon(
                    Icons.person_outline_rounded,
                    size: 16,
                    color: AafiyaColors.secondaryText,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${strings.director}: ${clinic.director!.name}${clinic.director!.specialty != null && clinic.director!.specialty!.isNotEmpty ? ' (${strings.specialtyName(clinic.director!.specialty!)})' : ''}',
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],

            // Affiliated Doctors summary badge
            if (clinic.doctors.isNotEmpty) ...[
              const SizedBox(height: 4),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AafiyaColors.lightBackground,
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                    child: Text(
                      '${strings.doctorsCount}: ${clinic.doctors.length}',
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  for (final doc in clinic.doctors.take(3))
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AafiyaColors.lightBackground,
                        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                      ),
                      child: Text(
                        doc.name,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.primaryText,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  if (clinic.doctors.length > 3)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: AafiyaColors.lightBackground,
                        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                      ),
                      child: Text(
                        '+${clinic.doctors.length - 3}',
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                          fontSize: 11,
                        ),
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
}

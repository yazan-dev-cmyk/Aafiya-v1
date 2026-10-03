import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Reusable card displaying doctor information for the directory.
///
/// NOTE: Adheres strictly to DISC-01.
/// Contains ZERO booking buttons, slot selectors, or appointment creation triggers.
class DoctorCard extends StatelessWidget {
  const DoctorCard({
    super.key,
    required this.doctor,
    this.onTap,
  });

  final Doctor doctor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final specialtyText = doctor.medicalSpecialty != null
        ? doctor.localizedSpecialty(strings.locale.languageCode)
        : (doctor.specialty.isNotEmpty ? strings.specialtyName(doctor.specialty) : strings.doctor);

    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Row: Avatar, Name, Specialty, and Verified Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                  child: const Icon(
                    Icons.person_outline_rounded,
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
                        doctor.name.isNotEmpty ? doctor.name : strings.doctor,
                        style: AafiyaTypography.titleMedium.copyWith(
                          color: AafiyaColors.primaryText,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        specialtyText.isNotEmpty ? specialtyText : strings.doctor,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.secondaryText,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                if (doctor.isVerified) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AafiyaColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                      border: Border.all(
                        color: AafiyaColors.success.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.verified_rounded,
                          size: 14,
                          color: AafiyaColors.success,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          strings.verifiedDoctor,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.success,
                            fontWeight: FontWeight.w700,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),

            // Bio (if present)
            if (doctor.bio != null && doctor.bio!.trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                doctor.bio!.trim(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AafiyaTypography.bodyMedium.copyWith(
                  color: AafiyaColors.primaryText.withValues(alpha: 0.8),
                  fontSize: 13,
                  height: 1.35,
                ),
              ),
            ],

            const SizedBox(height: 12),
            const Divider(height: 1, color: AafiyaColors.border),
            const SizedBox(height: 10),

            // Affiliated Clinics Section Header
            Row(
              children: [
                const Icon(
                  Icons.local_hospital_outlined,
                  size: 16,
                  color: AafiyaColors.healthBlue,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    strings.affiliatedClinics,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.primaryText,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Clinics List
            if (doctor.clinics.isNotEmpty) ...[
              for (final clinic in doctor.clinics)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: AafiyaColors.lightBackground,
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          clinic.name,
                          style: AafiyaTypography.bodyMedium.copyWith(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                        if ((clinic.wilaya != null && clinic.wilaya!.isNotEmpty) ||
                            (clinic.address != null && clinic.address!.isNotEmpty)) ...[
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 13,
                                color: AafiyaColors.secondaryText,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  [
                                    if (clinic.wilaya != null && clinic.wilaya!.isNotEmpty)
                                      strings.wilayaName(clinic.wilaya!),
                                    if (clinic.address != null && clinic.address!.isNotEmpty)
                                      clinic.address!,
                                  ].join(' - '),
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
                        ],
                        if (clinic.phone != null && clinic.phone!.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(
                                Icons.phone_outlined,
                                size: 13,
                                color: AafiyaColors.healthBlue,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                clinic.phone!,
                                style: AafiyaTypography.caption.copyWith(
                                  color: AafiyaColors.healthBlue,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ] else ...[
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  strings.noAffiliatedClinics,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

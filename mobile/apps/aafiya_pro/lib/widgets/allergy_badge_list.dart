import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Read-only list displaying patient allergies with high-visibility severity badges.
///
/// Strictly enforces DISC-02: Zero clinical authoring, zero edit/delete controls.
class AllergyBadgeList extends StatelessWidget {
  const AllergyBadgeList({
    super.key,
    required this.allergies,
  });

  final List<PatientAllergy> allergies;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    if (allergies.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: AafiyaSpacing.sm),
        child: Row(
          children: [
            const Icon(
              Icons.check_circle_outline,
              color: AafiyaColors.success,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                strings.noKnownAllergies,
                style: AafiyaTypography.bodyMedium.copyWith(
                  color: AafiyaColors.secondaryText,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (int i = 0; i < allergies.length; i++) ...[
          if (i > 0) const SizedBox(height: AafiyaSpacing.sm),
          _AllergyCard(allergy: allergies[i]),
        ],
      ],
    );
  }
}

class _AllergyCard extends StatelessWidget {
  const _AllergyCard({required this.allergy});

  final PatientAllergy allergy;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final (severityColor, severityLabel) = _resolveSeverity(allergy, strings);

    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: severityColor.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        border: Border.all(
          color: severityColor.withValues(alpha: 0.35),
          width: 1.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Icon(
                allergy.isLifeThreatening || allergy.isSevere
                    ? Icons.warning_amber_rounded
                    : Icons.info_outline,
                color: severityColor,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  allergy.allergen,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: severityColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  border: Border.all(
                    color: severityColor.withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  severityLabel,
                  style: AafiyaTypography.caption.copyWith(
                    color: severityColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          if (allergy.reaction != null && allergy.reaction!.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              '${strings.reaction}: ${allergy.reaction!.trim()}',
              style: AafiyaTypography.bodyMedium.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
          ],
          if (allergy.diagnosedAt != null && allergy.diagnosedAt!.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              '${strings.diagnosedDate}: ${allergy.diagnosedAt!.trim()}',
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
          ],
          if (allergy.notes != null && allergy.notes!.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              allergy.notes!.trim(),
              style: AafiyaTypography.caption.copyWith(
                fontStyle: FontStyle.italic,
                color: AafiyaColors.secondaryText,
              ),
            ),
          ],
        ],
      ),
    );
  }

  (Color, String) _resolveSeverity(PatientAllergy allergy, LocalizedStrings strings) {
    if (allergy.isLifeThreatening) {
      return (AafiyaColors.error, strings.severityLifeThreatening);
    }
    if (allergy.isSevere) {
      return (AafiyaColors.error, strings.severitySevere);
    }
    if (allergy.isModerate) {
      return (AafiyaColors.warning, strings.severityModerate);
    }
    return (AafiyaColors.info, strings.severityMild);
  }
}

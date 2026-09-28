import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Read-only list displaying patient chronic conditions with status badges.
///
/// Strictly enforces DISC-02: Zero clinical authoring, zero edit/delete controls.
class ChronicConditionsList extends StatelessWidget {
  const ChronicConditionsList({
    super.key,
    required this.conditions,
  });

  final List<ChronicCondition> conditions;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    if (conditions.isEmpty) {
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
                strings.noKnownChronicConditions,
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
        for (int i = 0; i < conditions.length; i++) ...[
          if (i > 0) const SizedBox(height: AafiyaSpacing.sm),
          _ChronicConditionCard(condition: conditions[i]),
        ],
      ],
    );
  }
}

class _ChronicConditionCard extends StatelessWidget {
  const _ChronicConditionCard({required this.condition});

  final ChronicCondition condition;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final (statusColor, statusLabel) = _resolveStatus(condition.status, strings);

    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        border: Border.all(color: AafiyaColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Icon(
                Icons.healing_outlined,
                color: AafiyaColors.healthBlue,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  condition.conditionName,
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
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  border: Border.all(
                    color: statusColor.withValues(alpha: 0.35),
                  ),
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
          if (condition.icd10Code != null && condition.icd10Code!.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AafiyaColors.lightBackground,
                borderRadius: BorderRadius.circular(AafiyaRadius.sm),
              ),
              child: Text(
                'ICD-10: ${condition.icd10Code!.trim()}',
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AafiyaColors.secondaryText,
                ),
              ),
            ),
          ],
          if (condition.diagnosedDate != null && condition.diagnosedDate!.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              '${strings.diagnosedDate}: ${condition.diagnosedDate!.trim()}',
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
          ],
          if (condition.notes != null && condition.notes!.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              condition.notes!.trim(),
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

  (Color, String) _resolveStatus(String status, LocalizedStrings strings) {
    return switch (status.toLowerCase().trim()) {
      'active' => (AafiyaColors.warning, strings.conditionStatusActive),
      'managed' => (AafiyaColors.info, strings.conditionStatusManaged),
      'remission' => (AafiyaColors.success, strings.conditionStatusRemission),
      'resolved' => (AafiyaColors.secondaryText, strings.conditionStatusResolved),
      _ => (AafiyaColors.secondaryText, status),
    };
  }
}

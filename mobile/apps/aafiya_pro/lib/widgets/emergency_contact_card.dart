import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Read-only card displaying patient emergency contacts.
///
/// Strictly enforces DISC-02: Zero clinical authoring, zero edit/delete controls.
class EmergencyContactCard extends StatelessWidget {
  const EmergencyContactCard({
    super.key,
    required this.contacts,
  });

  final List<EmergencyContact> contacts;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    if (contacts.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: AafiyaSpacing.sm),
        child: Row(
          children: [
            const Icon(
              Icons.contact_phone_outlined,
              color: AafiyaColors.secondaryText,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                strings.noEmergencyContactsRecorded,
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
        for (int i = 0; i < contacts.length; i++) ...[
          if (i > 0) const SizedBox(height: AafiyaSpacing.sm),
          _SingleContactTile(contact: contacts[i]),
        ],
      ],
    );
  }
}

class _SingleContactTile extends StatelessWidget {
  const _SingleContactTile({required this.contact});

  final EmergencyContact contact;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        border: Border.all(color: AafiyaColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: const Icon(
              Icons.person_outline,
              color: AafiyaColors.healthBlue,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        contact.name,
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AafiyaColors.primaryText,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (contact.isPrimary) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AafiyaColors.healthBlue.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                        ),
                        child: Text(
                          strings.primaryContactBadge,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.healthBlue,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                if (contact.relationship.isNotEmpty)
                  Text(
                    '${strings.relationship}: ${contact.relationship}',
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                if (contact.phone.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(
                        Icons.phone_outlined,
                        size: 14,
                        color: AafiyaColors.secondaryText,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        contact.phone,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.primaryText,
                          fontWeight: FontWeight.w500,
                        ),
                        textDirection: TextDirection.ltr,
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

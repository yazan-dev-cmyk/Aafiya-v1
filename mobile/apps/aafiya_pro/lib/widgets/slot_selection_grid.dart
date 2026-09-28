import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Interactive grid widget for selecting available hourly appointment slots (TASK-05-02).
///
/// Visual states:
/// - Available: selectable, displays remaining capacity vs total capacity.
/// - Selected: highlighted border and background tint.
/// - Full / Unavailable: disabled state, displays "Full" badge, non-interactive.
/// - Loading: displays circular loading indicator.
class SlotSelectionGrid extends StatelessWidget {
  const SlotSelectionGrid({
    super.key,
    required this.slots,
    this.selectedSlot,
    this.onSlotSelected,
    this.isLoading = false,
  });

  final List<AppointmentSlot> slots;
  final String? selectedSlot;
  final ValueChanged<AppointmentSlot>? onSlotSelected;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    if (isLoading) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AafiyaSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AafiyaColors.healingGreen,
              ),
              const SizedBox(height: AafiyaSpacing.sm),
              Text(
                strings.loadingSlotsPrompt,
                style: AafiyaTypography.caption.copyWith(
                  color: AafiyaColors.secondaryText,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (slots.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(AafiyaSpacing.md),
        decoration: BoxDecoration(
          color: AafiyaColors.lightBackground,
          borderRadius: BorderRadius.circular(AafiyaRadius.md),
          border: Border.all(color: AafiyaColors.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.event_busy_rounded,
              color: AafiyaColors.secondaryText,
              size: 20,
            ),
            const SizedBox(width: AafiyaSpacing.sm),
            Flexible(
              child: Text(
                strings.noSlotsAvailable,
                style: AafiyaTypography.bodyMedium.copyWith(
                  color: AafiyaColors.secondaryText,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 400 ? 3 : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: AafiyaSpacing.sm,
            mainAxisSpacing: AafiyaSpacing.sm,
            childAspectRatio: 2.3,
          ),
          itemCount: slots.length,
          itemBuilder: (context, index) {
            final slot = slots[index];
            final isFull = !slot.isAvailable || slot.available <= 0;
            final isSelected = selectedSlot == slot.timeSlot;

            return _SlotCard(
              key: ValueKey('slot_tile_${slot.timeSlot}'),
              slot: slot,
              isFull: isFull,
              isSelected: isSelected,
              strings: strings,
              onTap: isFull || onSlotSelected == null
                  ? null
                  : () => onSlotSelected!(slot),
            );
          },
        );
      },
    );
  }
}

class _SlotCard extends StatelessWidget {
  const _SlotCard({
    super.key,
    required this.slot,
    required this.isFull,
    required this.isSelected,
    required this.strings,
    this.onTap,
  });

  final AppointmentSlot slot;
  final bool isFull;
  final bool isSelected;
  final LocalizedStrings strings;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final borderColor = isSelected
        ? AafiyaColors.healingGreen
        : isFull
            ? AafiyaColors.border.withValues(alpha: 0.5)
            : AafiyaColors.border;

    final backgroundColor = isSelected
        ? AafiyaColors.healingGreen.withValues(alpha: 0.12)
        : isFull
            ? AafiyaColors.lightBackground.withValues(alpha: 0.7)
            : AafiyaColors.pureWhite;

    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(AafiyaRadius.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AafiyaRadius.md),
            border: Border.all(
              color: borderColor,
              width: isSelected ? 2 : 1,
            ),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AafiyaSpacing.sm,
            vertical: 6,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.access_time_rounded,
                    size: 14,
                    color: isFull
                        ? AafiyaColors.secondaryText.withValues(alpha: 0.5)
                        : isSelected
                            ? AafiyaColors.healingGreen
                            : AafiyaColors.primaryText,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    slot.timeSlot,
                    style: AafiyaTypography.bodyMedium.copyWith(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: isFull
                          ? AafiyaColors.secondaryText.withValues(alpha: 0.5)
                          : isSelected
                              ? AafiyaColors.healingGreen
                              : AafiyaColors.primaryText,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              if (isFull)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: AafiyaColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  ),
                  child: Text(
                    strings.slotFullBadge,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.error,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                )
              else
                Text(
                  strings.slotCapacityAvailable(slot.available, slot.maxCapacity),
                  style: AafiyaTypography.caption.copyWith(
                    color: isSelected
                        ? AafiyaColors.healingGreen
                        : AafiyaColors.secondaryText,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    fontSize: 10,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

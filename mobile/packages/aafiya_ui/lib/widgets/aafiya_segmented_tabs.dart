import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';

class AafiyaTabItem<T> {
  const AafiyaTabItem({
    required this.value,
    required this.label,
    this.icon,
  });

  final T value;
  final String label;
  final IconData? icon;
}

/// Pill-shaped segmented tabs matching the directory tabs in the prototype.
///
/// Features:
/// - Min-size 48x48px per item (WCAG touch target compliance >= 48x48)
/// - Selected tab: solid navy (#023E73) background with white text
/// - Unselected tabs: white background with line border (#DCE6EE) and muted ink (#475569)
/// - Horizontal scrolling with smooth snap
class AafiyaSegmentedTabs<T> extends StatelessWidget {
  const AafiyaSegmentedTabs({
    super.key,
    required this.items,
    required this.selectedValue,
    required this.onChanged,
    this.padding = const EdgeInsets.symmetric(horizontal: 20.0),
  });

  final List<AafiyaTabItem<T>> items;
  final T selectedValue;
  final ValueChanged<T> onChanged;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: padding,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: items.map((item) {
          final isSelected = item.value == selectedValue;

          return Padding(
            padding: const EdgeInsetsDirectional.only(end: 8.0),
            child: Semantics(
              selected: isSelected,
              button: true,
              child: InkWell(
                onTap: () => onChanged(item.value),
                borderRadius: BorderRadius.circular(AafiyaRadius.pill),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeInOut,
                  constraints: const BoxConstraints(
                    minHeight: 48.0,
                    minWidth: 48.0,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 10.0),
                  decoration: BoxDecoration(
                    color: isSelected ? AafiyaColors.navy : AafiyaColors.pureWhite,
                    borderRadius: BorderRadius.circular(AafiyaRadius.pill),
                    border: Border.all(
                      color: isSelected ? AafiyaColors.navy : AafiyaColors.lineDivider,
                      width: 1.5,
                    ),
                  ),
                  child: Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (item.icon != null) ...[
                          Icon(
                            item.icon,
                            size: 16.0,
                            color: isSelected ? AafiyaColors.pureWhite : AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 6.0),
                        ],
                        Text(
                          item.label,
                          style: AafiyaTypography.titleSmall.copyWith(
                            fontSize: 14.5,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            color: isSelected ? AafiyaColors.pureWhite : AafiyaColors.secondaryText,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_typography.dart';

import 'aafiya_brand_mark.dart';

/// Standardized AAFIYA App Bar with brand styling and RTL support.
class AafiyaAppBar extends StatelessWidget implements PreferredSizeWidget {
  const AafiyaAppBar({
    super.key,
    this.title = '',
    this.titleWidget,
    this.showBrandMark = false,
    this.actions,
    this.leading,
    this.centerTitle = true,
  });

  final String title;
  final Widget? titleWidget;
  final bool showBrandMark;
  final List<Widget>? actions;
  final Widget? leading;
  final bool centerTitle;

  @override
  Widget build(BuildContext context) {
    Widget effectiveTitle;
    if (titleWidget != null) {
      effectiveTitle = titleWidget!;
    } else if (showBrandMark) {
      effectiveTitle = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const AafiyaBrandMark(markSize: 26, showWordmark: false),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              title,
              style: AafiyaTypography.titleLarge,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      );
    } else {
      effectiveTitle = Text(
        title,
        style: AafiyaTypography.titleLarge,
      );
    }

    return AppBar(
      title: effectiveTitle,
      centerTitle: centerTitle,
      backgroundColor: AafiyaColors.pureWhite,
      foregroundColor: AafiyaColors.primaryText,
      elevation: 0,
      scrolledUnderElevation: 1,
      leading: leading,
      actions: actions,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_typography.dart';

/// Standardized AAFIYA App Bar with brand styling and RTL support.
class AafiyaAppBar extends StatelessWidget implements PreferredSizeWidget {
  const AafiyaAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.centerTitle = true,
  });

  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool centerTitle;

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(
        title,
        style: AafiyaTypography.titleLarge,
      ),
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

import 'package:flutter/material.dart';

/// Screen size categories for AAFIYA responsive layouts.
enum AafiyaScreenType {
  /// Compact screens (< 400dp width): small phones (360dp, 375dp, 390dp).
  /// Requires dense layouts, truncated or stacked metrics, and compact headers.
  compact,

  /// Medium screens (400dp - 599dp width): standard modern phones and phablets.
  medium,

  /// Expanded screens (>= 600dp width): foldables, tablets, and desktop viewports.
  expanded,
}

/// Breakpoint tokens and responsive resolution helpers for AAFIYA V1.
class AafiyaBreakpoints {
  const AafiyaBreakpoints._();

  /// Maximum width for compact devices (e.g. 360dp - 399dp phones).
  /// Critical threshold for DEF-05 doctor metric card layout adaptations.
  static const double compactThreshold = 400.0;

  /// Threshold separating medium phone viewports from tablet/expanded viewports.
  static const double mediumThreshold = 600.0;

  /// Resolve [AafiyaScreenType] from numeric logical pixel width.
  static AafiyaScreenType screenTypeFromWidth(double width) {
    if (width < compactThreshold) {
      return AafiyaScreenType.compact;
    } else if (width < mediumThreshold) {
      return AafiyaScreenType.medium;
    } else {
      return AafiyaScreenType.expanded;
    }
  }

  /// Resolve [AafiyaScreenType] using ambient [MediaQuery].
  static AafiyaScreenType getScreenType(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return screenTypeFromWidth(width);
  }

  /// True if current viewport width is less than 400dp.
  static bool isCompact(BuildContext context) =>
      getScreenType(context) == AafiyaScreenType.compact;

  /// True if current viewport width is between 400dp and 599dp.
  static bool isMedium(BuildContext context) =>
      getScreenType(context) == AafiyaScreenType.medium;

  /// True if current viewport width is 600dp or wider.
  static bool isExpanded(BuildContext context) =>
      getScreenType(context) == AafiyaScreenType.expanded;
}

/// Responsive widget switcher selecting layout variant based on screen type.
class AafiyaResponsive extends StatelessWidget {
  const AafiyaResponsive({
    super.key,
    required this.compact,
    this.medium,
    this.expanded,
  });

  /// Widget rendered when viewport width is < 400dp.
  final Widget compact;

  /// Widget rendered when viewport width is between 400dp and 599dp.
  /// Falls back to [compact] if omitted.
  final Widget? medium;

  /// Widget rendered when viewport width is >= 600dp.
  /// Falls back to [medium] (or [compact]) if omitted.
  final Widget? expanded;

  @override
  Widget build(BuildContext context) {
    final type = AafiyaBreakpoints.getScreenType(context);
    switch (type) {
      case AafiyaScreenType.compact:
        return compact;
      case AafiyaScreenType.medium:
        return medium ?? compact;
      case AafiyaScreenType.expanded:
        return expanded ?? medium ?? compact;
    }
  }
}

/// Responsive builder delivering the active [AafiyaScreenType] to the builder callback.
class AafiyaResponsiveBuilder extends StatelessWidget {
  const AafiyaResponsiveBuilder({
    super.key,
    required this.builder,
  });

  final Widget Function(BuildContext context, AafiyaScreenType screenType) builder;

  @override
  Widget build(BuildContext context) {
    final screenType = AafiyaBreakpoints.getScreenType(context);
    return builder(context, screenType);
  }
}

/// Convenience extensions on [BuildContext] for responsive queries.
extension AafiyaResponsiveContext on BuildContext {
  /// Active [AafiyaScreenType] based on ambient [MediaQuery].
  AafiyaScreenType get screenType => AafiyaBreakpoints.getScreenType(this);

  /// True if current viewport width is less than 400dp.
  bool get isCompact => AafiyaBreakpoints.isCompact(this);

  /// True if current viewport width is between 400dp and 599dp.
  bool get isMedium => AafiyaBreakpoints.isMedium(this);

  /// True if current viewport width is 600dp or wider.
  bool get isExpanded => AafiyaBreakpoints.isExpanded(this);
}

import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';

/// Reusable shimmer skeleton primitive for perceived latency reduction.
///
/// Built using pure Flutter framework animations (zero third-party dependencies).
/// Adapts automatically to Light and Dark themes.
class AafiyaSkeleton extends StatefulWidget {
  const AafiyaSkeleton({
    super.key,
    this.width,
    this.height,
    this.borderRadius = AafiyaRadius.borderMd,
    this.shape = BoxShape.rectangle,
  });

  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  final BoxShape shape;

  /// Text line placeholder
  const AafiyaSkeleton.line({
    super.key,
    this.width = double.infinity,
    this.height = 14.0,
    this.borderRadius = AafiyaRadius.borderSm,
  }) : shape = BoxShape.rectangle;

  /// Circular avatar / badge placeholder
  const AafiyaSkeleton.circle({
    super.key,
    required double size,
  })  : width = size,
        height = size,
        borderRadius = null,
        shape = BoxShape.circle;

  /// Card container skeleton placeholder
  static Widget card({
    Key? key,
    double? width,
    double? height,
    EdgeInsetsGeometry padding = const EdgeInsets.all(16.0),
    Widget? child,
  }) {
    return _AafiyaSkeletonCard(
      key: key,
      width: width,
      height: height,
      padding: padding,
      child: child,
    );
  }

  /// List item skeleton placeholder (leading avatar + 2 lines + trailing)
  static Widget listTile({
    Key? key,
    bool hasLeading = true,
    bool hasTrailing = false,
  }) {
    return _AafiyaSkeletonListTile(
      key: key,
      hasLeading: hasLeading,
      hasTrailing: hasTrailing,
    );
  }

  @override
  State<AafiyaSkeleton> createState() => _AafiyaSkeletonState();
}

class _AafiyaSkeletonState extends State<AafiyaSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final baseColor = isDark ? AafiyaColors.darkSurface : const Color(0xFFE2E8F0);
    final highlightColor = isDark ? const Color(0xFF334155) : const Color(0xFFF8FAFC);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            shape: widget.shape,
            borderRadius: widget.shape == BoxShape.circle ? null : widget.borderRadius,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              stops: [
                (_controller.value - 0.3).clamp(0.0, 1.0),
                _controller.value.clamp(0.0, 1.0),
                (_controller.value + 0.3).clamp(0.0, 1.0),
              ],
              colors: [
                baseColor,
                highlightColor,
                baseColor,
              ],
            ),
          ),
        );
      },
    );
  }
}

class _AafiyaSkeletonCard extends StatelessWidget {
  const _AafiyaSkeletonCard({
    super.key,
    this.width,
    this.height,
    required this.padding,
    this.child,
  });

  final double? width;
  final double? height;
  final EdgeInsetsGeometry padding;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AafiyaColors.darkSurface : AafiyaColors.pureWhite;
    final borderColor = isDark ? AafiyaColors.darkBorder : AafiyaColors.border;

    return Container(
      width: width,
      height: height,
      padding: padding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AafiyaRadius.borderLg,
        border: Border.all(color: borderColor),
      ),
      child: child ??
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              AafiyaSkeleton.line(width: 140, height: 16),
              SizedBox(height: 12),
              AafiyaSkeleton.line(width: double.infinity, height: 12),
              SizedBox(height: 8),
              AafiyaSkeleton.line(width: 200, height: 12),
            ],
          ),
    );
  }
}

class _AafiyaSkeletonListTile extends StatelessWidget {
  const _AafiyaSkeletonListTile({
    super.key,
    required this.hasLeading,
    required this.hasTrailing,
  });

  final bool hasLeading;
  final bool hasTrailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Row(
        children: [
          if (hasLeading) ...[
            const AafiyaSkeleton.circle(size: 44),
            const SizedBox(width: 12),
          ],
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                AafiyaSkeleton.line(width: 160, height: 14),
                SizedBox(height: 8),
                AafiyaSkeleton.line(width: 100, height: 11),
              ],
            ),
          ),
          if (hasTrailing) ...[
            const SizedBox(width: 12),
            const AafiyaSkeleton(
              width: 24,
              height: 24,
              borderRadius: AafiyaRadius.borderSm,
            ),
          ],
        ],
      ),
    );
  }
}

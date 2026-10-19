import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_typography.dart';

/// Interactive circular shortcut tile matching the 4-grid shortcuts in the prototype.
///
/// Features:
/// - 58x58 circular icon container
/// - Tactile scale feedback animation on press
/// - 14pt readable label with center alignment
/// - Minimum touch target compliant (height >= 48px)
class AafiyaShortcutTile extends StatefulWidget {
  const AafiyaShortcutTile({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
    this.backgroundColor = const Color(0xFFE6F1F9),
    this.iconColor = AafiyaColors.royalBlue,
    this.textColor,
    this.size = 58.0,
  });

  /// The text label below the circular icon.
  final String label;

  /// IconData or Widget displayed in the center of the circle.
  final IconData icon;

  /// Callback when tapped.
  final VoidCallback onTap;

  /// Background tint of the circular container.
  final Color backgroundColor;

  /// Color of the icon inside the circular container.
  final Color iconColor;

  /// Optional text color (e.g. for emergency shortcut #B91C1C).
  final Color? textColor;

  /// Diameter of the circular icon container (defaults to 58.0).
  final double size;

  @override
  State<AafiyaShortcutTile> createState() => _AafiyaShortcutTileState();
}

class _AafiyaShortcutTileState extends State<AafiyaShortcutTile> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final effectiveTextColor = widget.textColor ?? AafiyaColors.primaryText;

    return Semantics(
      button: true,
      label: widget.label,
      child: InkWell(
        onTap: widget.onTap,
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        borderRadius: BorderRadius.circular(16.0),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2.0, vertical: 4.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              AnimatedScale(
                scale: _isPressed ? 0.94 : 1.0,
                duration: const Duration(milliseconds: 120),
                curve: Curves.easeOut,
                child: Container(
                  width: widget.size,
                  height: widget.size,
                  decoration: BoxDecoration(
                    color: widget.backgroundColor,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      widget.icon,
                      color: widget.iconColor,
                      size: widget.size * 0.44,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8.0),
              Text(
                widget.label,
                style: AafiyaTypography.shortcutLabel.copyWith(
                  color: effectiveTextColor,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

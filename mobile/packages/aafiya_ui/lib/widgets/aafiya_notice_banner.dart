import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';

/// Reusable notice banner adhering to the approved reference design:
/// - Background: noticeBg (#E1F8ED)
/// - Border: noticeBorder (#B9EFD3, 1px)
/// - Text: noticeText (#16764E, 14pt, weight 600)
/// - Radius: 22px (AafiyaRadius.ticket)
class AafiyaNoticeBanner extends StatelessWidget {
  const AafiyaNoticeBanner({
    super.key,
    required this.message,
    this.icon = Icons.verified_user_rounded,
    this.margin,
    this.padding = const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
    this.backgroundColor = AafiyaColors.noticeBg,
    this.borderColor = AafiyaColors.noticeBorder,
    this.textColor = AafiyaColors.noticeText,
  });

  final String message;
  final IconData icon;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry padding;
  final Color backgroundColor;
  final Color borderColor;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AafiyaRadius.ticket),
        border: Border.all(
          color: borderColor,
          width: 1.0,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 24.0,
            color: textColor,
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Text(
              message,
              style: AafiyaTypography.bodyMedium.copyWith(
                color: textColor,
                fontSize: 14.0,
                fontWeight: FontWeight.w600,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

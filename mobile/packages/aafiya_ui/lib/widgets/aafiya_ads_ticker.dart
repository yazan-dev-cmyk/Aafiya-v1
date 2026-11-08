import 'dart:async';
import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';

/// AAFIYA Advertising Ticker Widget.
///
/// Displays active, targeted promotional campaigns in compliance with:
/// - Zero Mock Ads policy: renders `SizedBox.shrink()` when `ads` is empty.
/// - RTL / LTR adaptive layout.
/// - Click telemetry routing via `onAdClick`.
/// - Automatic rotation with user pause / navigation controls.
class AafiyaAdsTicker extends StatefulWidget {
  const AafiyaAdsTicker({
    super.key,
    required this.ads,
    required this.onAdClick,
    this.rotationInterval = const Duration(seconds: 6),
    this.autoRotate = true,
    this.margin,
  });

  final List<AdsTickerItem> ads;
  final ValueChanged<AdsTickerItem> onAdClick;
  final Duration rotationInterval;
  final bool autoRotate;
  final EdgeInsetsGeometry? margin;

  /// Validates whether a target URL is safe for navigation.
  /// - External URLs must strictly use https:// with no embedded credentials.
  /// - Internal URLs must strictly start with a single '/' and contain no backslashes or traversal.
  static ({bool isSafe, bool isExternal, String url}) validateTargetUrl(
      String? rawUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) {
      return (isSafe: false, isExternal: false, url: '');
    }
    final trimmed = rawUrl.trim();
    final lower = trimmed.toLowerCase();

    // Reject dangerous schemes
    if (lower.startsWith('javascript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('file:') ||
        lower.startsWith('vbscript:')) {
      return (isSafe: false, isExternal: false, url: '');
    }

    // Reject protocol-relative or backslashes
    if (trimmed.startsWith('//') || trimmed.contains('\\')) {
      return (isSafe: false, isExternal: false, url: '');
    }

    // External URLs: strictly HTTPS only
    if (lower.startsWith('https://')) {
      try {
        final uri = Uri.parse(trimmed);
        if (uri.scheme == 'https' &&
            uri.userInfo.isEmpty &&
            uri.host.isNotEmpty) {
          return (isSafe: true, isExternal: true, url: trimmed);
        }
      } catch (_) {
        return (isSafe: false, isExternal: false, url: '');
      }
      return (isSafe: false, isExternal: false, url: '');
    }

    // Reject unencrypted HTTP external URLs
    if (lower.startsWith('http://')) {
      return (isSafe: false, isExternal: false, url: '');
    }

    // Internal URLs: must start with a single '/' and prevent traversal
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      if (trimmed.contains('..')) {
        return (isSafe: false, isExternal: false, url: '');
      }
      return (isSafe: true, isExternal: false, url: trimmed);
    }

    return (isSafe: false, isExternal: false, url: '');
  }

  @override
  State<AafiyaAdsTicker> createState() => _AafiyaAdsTickerState();
}

class _AafiyaAdsTickerState extends State<AafiyaAdsTicker> {
  int _currentIndex = 0;
  Timer? _rotationTimer;
  bool _isPaused = false;

  @override
  void initState() {
    super.initState();
    _startRotation();
  }

  @override
  void didUpdateWidget(covariant AafiyaAdsTicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.ads.length != oldWidget.ads.length) {
      if (_currentIndex >= widget.ads.length) {
        _currentIndex = 0;
      }
      _startRotation();
    }
  }

  void _startRotation() {
    _stopRotation();
    if (widget.autoRotate && widget.ads.length > 1 && !_isPaused) {
      _rotationTimer = Timer.periodic(widget.rotationInterval, (_) {
        if (!mounted) return;
        setState(() {
          _currentIndex = (_currentIndex + 1) % widget.ads.length;
        });
      });
    }
  }

  void _stopRotation() {
    _rotationTimer?.cancel();
    _rotationTimer = null;
  }

  void _togglePause() {
    setState(() {
      _isPaused = !_isPaused;
      if (_isPaused) {
        _stopRotation();
      } else {
        _startRotation();
      }
    });
  }

  void _nextAd() {
    if (widget.ads.isEmpty) return;
    setState(() {
      _currentIndex = (_currentIndex + 1) % widget.ads.length;
    });
  }

  void _prevAd() {
    if (widget.ads.isEmpty) return;
    setState(() {
      _currentIndex =
          (_currentIndex - 1 + widget.ads.length) % widget.ads.length;
    });
  }

  @override
  void dispose() {
    _stopRotation();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.ads.isEmpty) {
      return const SizedBox.shrink();
    }

    final strings = LocalizedStrings.of(context);
    final ad = widget.ads[_currentIndex];
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    return Container(
      margin: widget.margin ??
          const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: AafiyaRadius.borderMd,
        border: Border.all(
          color: const Color(0xFFE2E8F0),
          width: 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 8.0,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: AafiyaRadius.borderMd,
          onTap: () => widget.onAdClick(ad),
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Header: Sponsored Chip + Pager Indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8.0, vertical: 3.0),
                      decoration: BoxDecoration(
                        color: AafiyaColors.tealSoft,
                        borderRadius: BorderRadius.circular(6.0),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.campaign_rounded,
                            size: 14.0,
                            color: AafiyaColors.tealInk,
                          ),
                          const SizedBox(width: 4.0),
                          Text(
                            strings.adsTickerSponsored,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.tealInk,
                              fontWeight: FontWeight.bold,
                              fontSize: 10.0,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (widget.ads.length > 1)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: Icon(
                              _isPaused
                                  ? Icons.play_arrow_rounded
                                  : Icons.pause_rounded,
                              size: 16.0,
                              color: AafiyaColors.secondaryText,
                            ),
                            tooltip: _isPaused
                                ? strings.adsTickerPlay
                                : strings.adsTickerPause,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                              minWidth: 44.0,
                              minHeight: 44.0,
                            ),
                            onPressed: _togglePause,
                          ),
                          const SizedBox(width: 4.0),
                          IconButton(
                            icon: Icon(
                              isRtl
                                  ? Icons.chevron_right_rounded
                                  : Icons.chevron_left_rounded,
                              size: 18.0,
                              color: AafiyaColors.secondaryText,
                            ),
                            tooltip: strings.adsTickerPrevious,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                              minWidth: 44.0,
                              minHeight: 44.0,
                            ),
                            onPressed: _prevAd,
                          ),
                          Text(
                            '${_currentIndex + 1}/${widget.ads.length}',
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                              fontSize: 11.0,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          IconButton(
                            icon: Icon(
                              isRtl
                                  ? Icons.chevron_left_rounded
                                  : Icons.chevron_right_rounded,
                              size: 18.0,
                              color: AafiyaColors.secondaryText,
                            ),
                            tooltip: strings.adsTickerNext,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                              minWidth: 44.0,
                              minHeight: 44.0,
                            ),
                            onPressed: _nextAd,
                          ),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: 8.0),

                // Main Content Body: Optional Image Thumbnail + Text
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (ad.bannerImageUrl != null &&
                        ad.bannerImageUrl!.trim().isNotEmpty) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8.0),
                        child: Image.network(
                          ad.bannerImageUrl!,
                          width: 48.0,
                          height: 48.0,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                      ),
                      const SizedBox(width: 10.0),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ad.title,
                            style: AafiyaTypography.titleSmall.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AafiyaColors.primaryText,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            ad.content,
                            style: AafiyaTypography.bodySmall.copyWith(
                              color: AafiyaColors.secondaryText,
                              height: 1.3,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8.0),
                    Icon(
                      isRtl
                          ? Icons.arrow_back_ios_new_rounded
                          : Icons.arrow_forward_ios_rounded,
                      size: 14.0,
                      color: AafiyaColors.tealInk,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';

import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';

/// Reusable offline status banner with animated transitions and auto-dismiss on reconnection.
///
/// Enforces Decisions D-06-01-C1:
/// - Listens reactively to [ConnectivityService.onConnectivityChanged].
/// - Displays prominent warning banner when offline.
/// - Transitions to green "Reconnected" banner for 2.5s upon network restoration.
/// - RTL-compliant and styled to AAFIYA tokens.
class AafiyaOfflineBanner extends StatefulWidget {
  const AafiyaOfflineBanner({
    super.key,
    required this.connectivityService,
    this.reconnectDisplayDuration = const Duration(milliseconds: 2500),
  });

  final ConnectivityService connectivityService;
  final Duration reconnectDisplayDuration;

  @override
  State<AafiyaOfflineBanner> createState() => _AafiyaOfflineBannerState();
}

class _AafiyaOfflineBannerState extends State<AafiyaOfflineBanner>
    with SingleTickerProviderStateMixin {
  StreamSubscription<bool>? _subscription;
  bool _isOnline = true;
  bool _wasOffline = false;
  bool _showReconnected = false;
  Timer? _dismissTimer;

  late final AnimationController _animController;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    ));

    _initConnectivity();
  }

  Future<void> _initConnectivity() async {
    final initialOnline = await widget.connectivityService.checkConnectivity();
    if (mounted) {
      setState(() {
        _isOnline = initialOnline;
        if (!_isOnline) {
          _wasOffline = true;
          _animController.value = 1.0;
        }
      });
    }

    _subscription = widget.connectivityService.onConnectivityChanged.listen((online) {
      if (!mounted) return;

      if (!online) {
        // Went offline
        _dismissTimer?.cancel();
        setState(() {
          _isOnline = false;
          _wasOffline = true;
          _showReconnected = false;
        });
        _animController.forward();
      } else if (_wasOffline) {
        // Transitioned from offline to online
        setState(() {
          _isOnline = true;
          _showReconnected = true;
        });

        _dismissTimer?.cancel();
        _dismissTimer = Timer(widget.reconnectDisplayDuration, () {
          if (mounted) {
            _animController.reverse().then((_) {
              if (mounted) {
                setState(() {
                  _showReconnected = false;
                  _wasOffline = false;
                });
              }
            });
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _subscription?.cancel();
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // If online and not showing reconnect message, hide completely
    if (_isOnline && !_showReconnected) {
      return const SizedBox.shrink();
    }

    final strings = LocalizedStrings.of(context);
    final isReconnected = _showReconnected;

    final Color bgColor = isReconnected ? AafiyaColors.success : const Color(0xFFDC2626); // Alert red
    final IconData icon = isReconnected ? Icons.wifi_rounded : Icons.wifi_off_rounded;
    final String message = isReconnected ? strings.offlineReconnected : strings.offlineBannerTitle;

    return SlideTransition(
      position: _slideAnimation,
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: bgColor,
            boxShadow: const [
              BoxShadow(
                color: Color(0x33000000),
                blurRadius: 8,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Flexible(
                child: Text(
                  message,
                  style: AafiyaTypography.labelLarge.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

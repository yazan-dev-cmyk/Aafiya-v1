import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import '../utils/qr_token_sanitizer.dart';

/// Modal bottom sheet providing the camera viewfinder to scan appointment QR tokens.
///
/// Ensures strict camera lifecycle management:
/// - Disposes camera controller when closed.
/// - Pauses camera on app background/inactive transitions.
/// - Debounces and stops scanning on first valid token detection.
/// - Never automatically submits check-in; returns validated token to caller.
class QrScannerSheet extends StatefulWidget {
  const QrScannerSheet({
    super.key,
    this.controller,
  });

  /// Optional injected controller for testing.
  final MobileScannerController? controller;

  /// Convenience method to display the scanner modal sheet.
  /// Returns the validated 64-character token, or null if canceled.
  static Future<String?> show(
    BuildContext context, {
    MobileScannerController? controller,
  }) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      enableDrag: false,
      builder: (ctx) => QrScannerSheet(controller: controller),
    );
  }

  @override
  State<QrScannerSheet> createState() => _QrScannerSheetState();
}

class _QrScannerSheetState extends State<QrScannerSheet>
    with WidgetsBindingObserver {
  late final MobileScannerController _controller;
  bool _ownsController = false;
  bool _isProcessing = false;
  bool _isDisposed = false;
  MobileScannerException? _scannerError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    if (widget.controller != null) {
      _controller = widget.controller!;
      _ownsController = false;
    } else {
      _controller = MobileScannerController(
        formats: const [BarcodeFormat.qrCode],
        detectionSpeed: DetectionSpeed.normal,
      );
      _ownsController = true;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_isDisposed) return;

    if (!_controller.value.hasCameraPermission) {
      return;
    }

    switch (state) {
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
        _controller.stop();
        break;
      case AppLifecycleState.resumed:
        if (!_isProcessing) {
          _controller.start();
        }
        break;
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    WidgetsBinding.instance.removeObserver(this);
    if (_ownsController) {
      _controller.dispose();
    }
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing || _isDisposed) return;

    for (final barcode in capture.barcodes) {
      final rawValue = barcode.rawValue;
      if (rawValue == null || rawValue.isEmpty) continue;

      final sanitizedToken = QrTokenSanitizer.sanitize(rawValue);
      if (sanitizedToken != null) {
        // Atomic lock: prevent duplicate callbacks and double submissions
        setState(() {
          _isProcessing = true;
        });

        HapticFeedback.mediumImpact();
        _controller.stop();

        if (mounted) {
          Navigator.of(context).pop(sanitizedToken);
        }
        return;
      }
    }
  }

  void _onScannerError(MobileScannerException error) {
    if (_isDisposed) return;
    setState(() {
      _scannerError = error;
    });
  }

  void _retryPermission() {
    setState(() {
      _scannerError = null;
    });
    _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final size = MediaQuery.of(context).size;
    final sheetHeight = size.height * 0.85;

    return Container(
      height: sheetHeight,
      decoration: const BoxDecoration(
        color: AafiyaColors.darkSurface,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AafiyaRadius.xl),
        ),
      ),
      child: Column(
        children: [
          // Drag handle & Top Bar
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AafiyaSpacing.md,
              vertical: AafiyaSpacing.sm,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Close button
                IconButton(
                  key: const Key('qr_scanner_close_button'),
                  icon: const Icon(Icons.close_rounded, color: Colors.white),
                  onPressed: () => Navigator.of(context).pop(),
                  tooltip: strings.cancel,
                ),

                // Sheet Title
                Text(
                  strings.qrScannerTitle,
                  style: AafiyaTypography.titleMedium.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                // Torch Toggle
                ValueListenableBuilder<MobileScannerState>(
                  valueListenable: _controller,
                  builder: (context, state, _) {
                    final isTorchOn = state.torchState == TorchState.on;
                    return IconButton(
                      key: const Key('qr_scanner_torch_button'),
                      icon: Icon(
                        isTorchOn
                            ? Icons.flash_on_rounded
                            : Icons.flash_off_rounded,
                        color: isTorchOn ? Colors.amber : Colors.white,
                      ),
                      onPressed: () => _controller.toggleTorch(),
                      tooltip: strings.scannerTorchToggle,
                    );
                  },
                ),
              ],
            ),
          ),

          // Viewfinder Camera Area
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                if (_scannerError != null)
                  _buildErrorView(strings)
                else
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AafiyaRadius.lg),
                    child: MobileScanner(
                      controller: _controller,
                      onDetect: _onDetect,
                      errorBuilder: (context, error) {
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          _onScannerError(error);
                        });
                        return _buildErrorView(strings);
                      },
                    ),
                  ),

                // Scanning Cutout Reticle Overlay
                if (_scannerError == null)
                  IgnorePointer(
                    child: Container(
                      width: 250,
                      height: 250,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: _isProcessing
                              ? AafiyaColors.healingGreen
                              : Colors.white.withValues(alpha: 0.8),
                          width: 2.5,
                        ),
                        borderRadius: BorderRadius.circular(AafiyaRadius.lg),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Bottom Prompt and Manual Entry Fallback Button
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AafiyaSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    strings.qrScannerPrompt,
                    textAlign: TextAlign.center,
                    style: AafiyaTypography.bodySmall.copyWith(
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: AafiyaSpacing.md),
                  OutlinedButton.icon(
                    key: const Key('qr_scanner_manual_entry_fallback'),
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.keyboard_outlined, size: 18),
                    label: Text(strings.checkInTokenLabel),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white38),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AafiyaSpacing.lg,
                        vertical: AafiyaSpacing.sm,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(LocalizedStrings strings) {
    final isPermissionDenied =
        _scannerError?.errorCode == MobileScannerErrorCode.permissionDenied;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AafiyaSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isPermissionDenied
                  ? Icons.no_photography_outlined
                  : Icons.error_outline_rounded,
              color: AafiyaColors.warning,
              size: 48,
            ),
            const SizedBox(height: AafiyaSpacing.md),
            Text(
              isPermissionDenied
                  ? strings.cameraPermissionTitle
                  : strings.qrScanInvalidToken,
              textAlign: TextAlign.center,
              style: AafiyaTypography.titleMedium.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: AafiyaSpacing.sm),
            Text(
              isPermissionDenied
                  ? strings.cameraPermissionSettingsGuidance
                  : strings.cameraPermissionMessage,
              textAlign: TextAlign.center,
              style: AafiyaTypography.bodySmall.copyWith(
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: AafiyaSpacing.lg),
            if (isPermissionDenied)
              AafiyaButton(
                label: strings.retry,
                onPressed: _retryPermission,
                icon: const Icon(Icons.refresh_rounded, size: 18),
              ),
          ],
        ),
      ),
    );
  }
}

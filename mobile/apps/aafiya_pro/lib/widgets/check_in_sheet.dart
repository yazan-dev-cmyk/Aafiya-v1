import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import '../utils/qr_token_sanitizer.dart';
import 'qr_scanner_sheet.dart';

/// Modal bottom sheet allowing the clinic assistant to check in a patient
/// using an appointment secure QR token.
class CheckInSheet extends StatefulWidget {
  const CheckInSheet({
    super.key,
    required this.queueService,
    this.onCheckInSuccess,
    this.scannerOpener,
  });

  final AssistantQueueService queueService;
  final VoidCallback? onCheckInSuccess;
  final Future<String?> Function(BuildContext context)? scannerOpener;

  /// Convenience method to display the check-in modal sheet.
  static Future<bool?> show(
    BuildContext context, {
    required AssistantQueueService queueService,
    VoidCallback? onCheckInSuccess,
    Future<String?> Function(BuildContext context)? scannerOpener,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
        ),
        child: CheckInSheet(
          queueService: queueService,
          onCheckInSuccess: onCheckInSuccess,
          scannerOpener: scannerOpener,
        ),
      ),
    );
  }

  @override
  State<CheckInSheet> createState() => _CheckInSheetState();
}

class _CheckInSheetState extends State<CheckInSheet> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;
  String? _infoMessage;

  @override
  void initState() {
    super.initState();
    _tokenController.addListener(() {
      if (_infoMessage != null && mounted) {
        setState(() {
          _infoMessage = null;
        });
      }
    });
  }

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _openScanner() async {
    if (_isLoading) return;

    setState(() {
      _errorMessage = null;
      _infoMessage = null;
    });

    final scannedToken = widget.scannerOpener != null
        ? await widget.scannerOpener!(context)
        : await QrScannerSheet.show(context);

    if (!mounted || scannedToken == null) return;

    // Strict local validation before initiating request
    final validatedToken = QrTokenSanitizer.sanitize(scannedToken);
    if (validatedToken == null) {
      final strings = LocalizedStrings.of(context);
      setState(() {
        _errorMessage = strings.qrScanInvalidToken;
        _infoMessage = null;
      });
      return;
    }

    // Populate field for visual confirmation and recovery
    _tokenController.text = validatedToken;

    // Automatically initiate check-in API request without requiring extra confirmation tap
    await _executeCheckIn(validatedToken, isAutoScan: true);
  }

  Future<void> _submitCheckIn() async {
    if (_isLoading) return;
    final strings = LocalizedStrings.of(context);
    final rawToken = _tokenController.text.trim();

    if (rawToken.isEmpty) {
      setState(() {
        _errorMessage = strings.invalidTokenPrompt;
        _infoMessage = null;
      });
      return;
    }

    // In manual entry, if user pasted a pass URL, extract the token; otherwise send the entered token
    final token = QrTokenSanitizer.sanitize(rawToken) ?? rawToken;

    await _executeCheckIn(token, isAutoScan: false);
  }

  Future<void> _executeCheckIn(String token, {required bool isAutoScan}) async {
    if (_isLoading) return;
    final strings = LocalizedStrings.of(context);

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _infoMessage = isAutoScan ? strings.autoCheckingInPrompt : null;
    });

    try {
      final result = await widget.queueService.checkInAppointment(token);

      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _infoMessage = null;
      });

      switch (result) {
        case ApiSuccess(:final data):
          final appointment = data.appointment;
          final identifier = appointment.bookingReference.isNotEmpty
              ? appointment.bookingReference
              : (appointment.patient.name ?? '');

          switch (data.result) {
            case CheckInResult.checkedIn:
              final messenger = ScaffoldMessenger.of(context);
              Navigator.of(context).pop(true);
              widget.onCheckInSuccess?.call();
              final label = identifier.isNotEmpty
                  ? '${strings.checkInSuccess} ($identifier)'
                  : strings.checkInSuccess;
              messenger.showSnackBar(
                SnackBar(
                  content: Text(label),
                  backgroundColor: AafiyaColors.healingGreen,
                  behavior: SnackBarBehavior.floating,
                ),
              );

            case CheckInResult.alreadyCheckedIn:
              final messenger = ScaffoldMessenger.of(context);
              Navigator.of(context).pop(true);
              widget.onCheckInSuccess?.call();
              final label = identifier.isNotEmpty
                  ? '${strings.alreadyCheckedInNotice} ($identifier)'
                  : strings.alreadyCheckedInNotice;
              messenger.showSnackBar(
                SnackBar(
                  content: Text(label),
                  backgroundColor: AafiyaColors.healthBlue,
                  behavior: SnackBarBehavior.floating,
                ),
              );

            case CheckInResult.unknown:
              // Missing or unrecognized discriminator: contract mismatch, do not guess
              setState(() {
                _errorMessage = strings.checkInContractMismatchError;
              });
          }

        case ApiFailure(:final exception):
          setState(() {
            _errorMessage = exception.message.isNotEmpty
                ? exception.message
                : strings.invalidTokenPrompt;
          });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _infoMessage = null;
        _errorMessage =
            e.toString().isNotEmpty ? e.toString() : strings.invalidTokenPrompt;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Container(
      decoration: const BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AafiyaRadius.xl),
        ),
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AafiyaSpacing.lg,
        vertical: AafiyaSpacing.xl,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AafiyaColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Header
            Row(
              children: [
                InkWell(
                  key: const Key('check_in_header_qr_icon_button'),
                  onTap: _isLoading ? null : _openScanner,
                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                  child: Container(
                    padding: const EdgeInsets.all(AafiyaSpacing.sm),
                    decoration: BoxDecoration(
                      color: AafiyaColors.healingGreen.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AafiyaRadius.md),
                    ),
                    child: const Icon(
                      Icons.qr_code_scanner_rounded,
                      color: AafiyaColors.healingGreen,
                      size: 24,
                    ),
                  ),
                ),
                const SizedBox(width: AafiyaSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        strings.assistantCheckInTab,
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        strings.checkInCodePrompt,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AafiyaSpacing.lg),

            // Camera Scan Action Button
            OutlinedButton.icon(
              key: const Key('check_in_scan_button'),
              onPressed: _isLoading ? null : _openScanner,
              icon: const Icon(Icons.qr_code_scanner_rounded, size: 20),
              label: Text(strings.scanQrCodeButton),
              style: OutlinedButton.styleFrom(
                foregroundColor: AafiyaColors.healingGreen,
                side: const BorderSide(color: AafiyaColors.healingGreen),
                padding: const EdgeInsets.symmetric(
                  horizontal: AafiyaSpacing.md,
                  vertical: AafiyaSpacing.sm + 2,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                ),
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Token input field
            AafiyaTextField(
              controller: _tokenController,
              label: strings.checkInTokenLabel,
              hintText: strings.checkInTokenHint,
              prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
              enabled: !_isLoading,
            ),

            if (_infoMessage != null) ...[
              const SizedBox(height: AafiyaSpacing.sm),
              Container(
                key: const Key('check_in_info_message_banner'),
                padding: const EdgeInsets.all(AafiyaSpacing.sm),
                decoration: BoxDecoration(
                  color: AafiyaColors.healingGreen.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  border: Border.all(
                    color: AafiyaColors.healingGreen.withValues(alpha: 0.25),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_outline_rounded,
                      color: AafiyaColors.healingGreen,
                      size: 18,
                    ),
                    const SizedBox(width: AafiyaSpacing.xs),
                    Expanded(
                      child: Text(
                        _infoMessage!,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.healingGreen,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (_errorMessage != null) ...[
              const SizedBox(height: AafiyaSpacing.sm),
              Container(
                key: const Key('check_in_error_message_banner'),
                padding: const EdgeInsets.all(AafiyaSpacing.sm),
                decoration: BoxDecoration(
                  color: AafiyaColors.error.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  border: Border.all(
                    color: AafiyaColors.error.withValues(alpha: 0.25),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      color: AafiyaColors.error,
                      size: 18,
                    ),
                    const SizedBox(width: AafiyaSpacing.xs),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: AafiyaSpacing.lg),

            // Action buttons
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: _isLoading
                        ? null
                        : () => Navigator.of(context).pop(false),
                    child: Text(strings.cancel),
                  ),
                ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  flex: 2,
                  child: AafiyaButton(
                    label: strings.submitCheckIn,
                    isLoading: _isLoading,
                    onPressed: _submitCheckIn,
                    icon: const Icon(Icons.check_circle_outline_rounded,
                        size: 18),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AafiyaSpacing.xs),
          ],
        ),
      ),
    );
  }
}

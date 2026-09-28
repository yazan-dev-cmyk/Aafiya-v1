import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal bottom sheet allowing the clinic assistant to check in a patient
/// using an appointment secure QR token.
class CheckInSheet extends StatefulWidget {
  const CheckInSheet({
    super.key,
    required this.queueService,
    this.onCheckInSuccess,
  });

  final AssistantQueueService queueService;
  final VoidCallback? onCheckInSuccess;

  /// Convenience method to display the check-in modal sheet.
  static Future<bool?> show(
    BuildContext context, {
    required AssistantQueueService queueService,
    VoidCallback? onCheckInSuccess,
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

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _submitCheckIn() async {
    final strings = LocalizedStrings.of(context);
    final token = _tokenController.text.trim();

    if (token.isEmpty) {
      setState(() {
        _errorMessage = strings.invalidTokenPrompt;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.queueService.checkInAppointment(token);

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    switch (result) {
      case ApiSuccess(:final data):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '${strings.checkInSuccess} (${data.bookingReference.isNotEmpty ? data.bookingReference : data.patient.name ?? ""})',
            ),
            backgroundColor: AafiyaColors.healingGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onCheckInSuccess?.call();
        Navigator.of(context).pop(true);

      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message.isNotEmpty
              ? exception.message
              : strings.invalidTokenPrompt;
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
                Container(
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

            // Token input field
            AafiyaTextField(
              controller: _tokenController,
              label: strings.checkInTokenLabel,
              hintText: strings.checkInTokenHint,
              prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
              enabled: !_isLoading,
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: AafiyaSpacing.sm),
              Container(
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
                    onPressed: _isLoading ? null : () => Navigator.of(context).pop(false),
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
                    icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
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

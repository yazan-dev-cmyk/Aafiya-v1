import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_core/models/patient_share_token.dart';
import 'package:aafiya_core/services/patient_share_service.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal dialog for generating an encrypted medical-record share token with mandatory PIN.
///
/// Implements strict security controls:
/// - Enforces mandatory PIN (4 to 8 digits) per DEC-P05-03.
/// - Restricts duration options strictly to '24h', '7d', and '30d'.
/// - Restricts scope strictly to 'all_emr' per DEC-P05-01.
/// - Displays token, share URL, and PIN with explicit one-time warning.
/// - Zero persistent storage or diagnostic logging of credentials.
class PatientShareRecordDialog extends StatefulWidget {
  const PatientShareRecordDialog({
    super.key,
    required this.apiClient,
    this.service,
    this.onShareCreated,
  });

  final ApiClient apiClient;
  final PatientShareService? service;
  final ValueChanged<PatientShareToken>? onShareCreated;

  /// Helper to display this dialog inside a modal bottom sheet.
  static Future<PatientShareToken?> show(
    BuildContext context, {
    required ApiClient apiClient,
    PatientShareService? service,
    ValueChanged<PatientShareToken>? onShareCreated,
  }) {
    return showModalBottomSheet<PatientShareToken>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PatientShareRecordDialog(
        apiClient: apiClient,
        service: service,
        onShareCreated: onShareCreated,
      ),
    );
  }

  @override
  State<PatientShareRecordDialog> createState() => _PatientShareRecordDialogState();
}

class _PatientShareRecordDialogState extends State<PatientShareRecordDialog> {
  late final PatientShareService _service;
  final _formKey = GlobalKey<FormState>();
  final _pinController = TextEditingController();

  String _selectedDuration = '24h';
  bool _isLoading = false;
  String? _errorMessage;
  PatientShareToken? _createdShare;
  String? _createdPin;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? PatientShareService(widget.apiClient);
  }

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleGenerate() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final pin = _pinController.text.trim();
    final result = await _service.createShare(
      pin: pin,
      duration: _selectedDuration,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _createdShare = data;
          _createdPin = pin;
          _isLoading = false;
        });
        widget.onShareCreated?.call(data);

      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message;
          _isLoading = false;
        });
    }
  }

  Future<void> _copyToClipboard(String text, String successMessage) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(successMessage),
        backgroundColor: AafiyaColors.success,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    return Container(
      decoration: const BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: _createdShare == null
            ? _buildConfigurationForm(context, strings, isRtl)
            : _buildCredentialsResult(context, strings, isRtl),
      ),
    );
  }

  Widget _buildConfigurationForm(
    BuildContext context,
    LocalizedStrings strings,
    bool isRtl,
  ) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
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
          const SizedBox(height: 16),
          Row(
            children: [
              const CircleAvatar(
                backgroundColor: AafiyaColors.lightBackground,
                child: Icon(Icons.share_rounded, color: AafiyaColors.healthBlue),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strings.shareMedicalRecordTitle,
                      style: AafiyaTypography.titleLarge,
                    ),
                    Text(
                      strings.sharedRecordSecurityNotice,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Duration Selector
          Text(
            strings.shareDurationLabel,
            style: AafiyaTypography.labelLarge,
          ),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: [
              ButtonSegment<String>(
                value: '24h',
                label: Text(strings.duration24h),
              ),
              ButtonSegment<String>(
                value: '7d',
                label: Text(strings.duration7d),
              ),
              ButtonSegment<String>(
                value: '30d',
                label: Text(strings.duration30d),
              ),
            ],
            selected: {_selectedDuration},
            onSelectionChanged: (newSelection) {
              setState(() {
                _selectedDuration = newSelection.first;
              });
            },
          ),
          const SizedBox(height: 16),

          // Mandatory PIN Input
          Text(
            strings.sharePinInputLabel,
            style: AafiyaTypography.labelLarge,
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _pinController,
            keyboardType: TextInputType.number,
            maxLength: 8,
            obscureText: true,
            decoration: InputDecoration(
              hintText: strings.sharePinInputHint,
              prefixIcon: const Icon(Icons.pin_rounded),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              counterText: '',
            ),
            validator: (value) {
              final pin = value?.trim() ?? '';
              if (pin.isEmpty || pin.length < 4 || pin.length > 8) {
                return strings.sharedRecordPinValidation;
              }
              if (!RegExp(r'^[0-9]+$').hasMatch(pin)) {
                return strings.sharedRecordPinValidation;
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AafiyaColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AafiyaColors.error),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: AafiyaColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: AafiyaTypography.bodySmall.copyWith(color: AafiyaColors.error),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          AafiyaButton(
            label: strings.createShareButton,
            isLoading: _isLoading,
            onPressed: _isLoading ? null : _handleGenerate,
          ),
        ],
      ),
    );
  }

  Widget _buildCredentialsResult(
    BuildContext context,
    LocalizedStrings strings,
    bool isRtl,
  ) {
    final share = _createdShare!;
    final pin = _createdPin ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
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
        const SizedBox(height: 16),
        Row(
          children: [
            const CircleAvatar(
              backgroundColor: AafiyaColors.healingGreenSurface,
              child: Icon(Icons.check_circle_rounded, color: AafiyaColors.success),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    strings.shareCreatedSuccess,
                    style: AafiyaTypography.titleLarge,
                  ),
                  Text(
                    '${strings.expiresOn} ${share.expiresAt.toLocal().toString().split('.').first}',
                    style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Security Notice
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AafiyaColors.warning.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AafiyaColors.warning),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.warning_amber_rounded, color: AafiyaColors.warning),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  strings.shareOneTimeNotice,
                  style: AafiyaTypography.bodySmall.copyWith(color: AafiyaColors.warning),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Share URL Card
        if (share.shareUrl != null) ...[
          Text(strings.sharedRecordTokenLabel, style: AafiyaTypography.labelLarge),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AafiyaColors.lightBackground,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AafiyaColors.border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    share.shareUrl!,
                    style: AafiyaTypography.bodySmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy_rounded, color: AafiyaColors.healthBlue),
                  tooltip: strings.copyShareUrl,
                  onPressed: () => _copyToClipboard(share.shareUrl!, strings.copiedToClipboard),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // PIN Card
        if (pin.isNotEmpty) ...[
          Text(strings.sharedRecordPinLabel, style: AafiyaTypography.labelLarge),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AafiyaColors.lightBackground,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AafiyaColors.border),
            ),
            child: Row(
              children: [
                Text(
                  pin,
                  style: AafiyaTypography.titleLarge.copyWith(
                    letterSpacing: 4,
                    color: AafiyaColors.healthBlue,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.copy_rounded, color: AafiyaColors.healthBlue),
                  tooltip: strings.copyPin,
                  onPressed: () => _copyToClipboard(pin, strings.copiedToClipboard),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        AafiyaButton(
          label: strings.dismiss,
          onPressed: () => Navigator.of(context).pop(share),
        ),
      ],
    );
  }
}

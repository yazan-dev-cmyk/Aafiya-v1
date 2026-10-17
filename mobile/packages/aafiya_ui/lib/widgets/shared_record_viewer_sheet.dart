import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';

import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';

/// Self-contained recipient modal sheet for decrypting and viewing shared medical records.
///
/// Implements strict recipient security controls:
/// - Strictly in-memory volatile state; no persistence or cache writes.
/// - PIN is immediately wiped on HTTP 410 (expired/revoked) or 423 (locked).
/// - Token and PIN are cleared on disposal.
/// - Token is preserved only for retry upon HTTP 403 (wrong PIN).
/// - Read-only rendering with zero prohibited PII (no phone, email, national ID, address).
/// - RTL and LTR support based on active [AafiyaLocale].
class SharedRecordViewerSheet extends StatefulWidget {
  const SharedRecordViewerSheet({
    super.key,
    required this.apiClient,
    this.initialToken,
    this.service,
  });

  final ApiClient apiClient;
  final String? initialToken;
  final SharedRecordService? service;

  /// Helper to display this viewer sheet inside a modal bottom sheet.
  static Future<void> show(
    BuildContext context, {
    required ApiClient apiClient,
    String? initialToken,
    SharedRecordService? service,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SharedRecordViewerSheet(
        apiClient: apiClient,
        initialToken: initialToken,
        service: service,
      ),
    );
  }

  @override
  State<SharedRecordViewerSheet> createState() => _SharedRecordViewerSheetState();
}

class _SharedRecordViewerSheetState extends State<SharedRecordViewerSheet> {
  late final TextEditingController _tokenController;
  late final TextEditingController _pinController;
  late final SharedRecordService _service;

  bool _isLoading = false;
  String? _errorMessage;
  bool _isTerminal = false;
  SharedPatientRecord? _record;

  @override
  void initState() {
    super.initState();
    _tokenController = TextEditingController(text: widget.initialToken ?? '');
    _pinController = TextEditingController();
    _service = widget.service ?? SharedRecordService(widget.apiClient);
  }

  @override
  void dispose() {
    // Zero-residue cleanup: Wipe credentials from volatile memory on dismiss
    _pinController.clear();
    _tokenController.clear();
    _pinController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  String _cleanToken(String raw) {
    final trimmed = raw.trim();
    if (trimmed.contains('#token=')) {
      return trimmed.split('#token=').last.split('&').first;
    }
    if (trimmed.contains('token=')) {
      final uri = Uri.tryParse(trimmed);
      if (uri != null && uri.queryParameters.containsKey('token')) {
        return uri.queryParameters['token']!;
      }
    }
    return trimmed;
  }

  Future<void> _handleResolve() async {
    final strings = LocalizedStrings.of(context);
    final token = _cleanToken(_tokenController.text);
    final pin = _pinController.text.trim();

    if (token.isEmpty) {
      setState(() {
        _errorMessage = strings.sharedRecordNotFound;
      });
      return;
    }

    if (pin.length < 4 || pin.length > 8 || !RegExp(r'^\d+$').hasMatch(pin)) {
      setState(() {
        _errorMessage = strings.sharedRecordPinValidation;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _service.resolveSharedRecord(token: token, pin: pin);

    if (!mounted) return;

    switch (result) {
      case SharedRecordSuccess(:final record):
        setState(() {
          _isLoading = false;
          _record = record;
          _errorMessage = null;
        });
        // Clear sensitive PIN from input once decrypted
        _pinController.clear();

      case SharedRecordWrongPinFailure(:final remainingAttempts):
        setState(() {
          _isLoading = false;
          _errorMessage = remainingAttempts != null
              ? '${strings.sharedRecordWrongPin}. ${strings.sharedRecordRemainingAttempts(remainingAttempts)}'
              : strings.sharedRecordWrongPin;
        });
        // Retain token for retry, clear PIN input for user convenience
        _pinController.clear();

      case SharedRecordExpiredOrRevokedFailure():
        setState(() {
          _isLoading = false;
          _isTerminal = true;
          _errorMessage = strings.sharedRecordExpiredOrRevoked;
        });
        // Security requirement: Wipe both token and PIN immediately on terminal state
        _pinController.clear();
        _tokenController.clear();

      case SharedRecordLockedFailure():
        setState(() {
          _isLoading = false;
          _isTerminal = true;
          _errorMessage = strings.sharedRecordLocked;
        });
        // Security requirement: Wipe PIN immediately on lockout
        _pinController.clear();

      case SharedRecordNotFoundFailure():
        setState(() {
          _isLoading = false;
          _isTerminal = true;
          _errorMessage = strings.sharedRecordNotFound;
        });
        _pinController.clear();
        _tokenController.clear();

      case SharedRecordInsecureSchemeFailure():
        setState(() {
          _isLoading = false;
          _errorMessage = strings.sharedRecordHttpsRequired;
        });

      case SharedRecordRateLimitFailure():
        setState(() {
          _isLoading = false;
          _errorMessage = strings.sharedRecordRateLimited;
        });

      case SharedRecordValidationFailure(:final message):
        setState(() {
          _isLoading = false;
          _errorMessage = message;
        });

      case SharedRecordNetworkFailure(:final message):
        setState(() {
          _isLoading = false;
          _errorMessage = message;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final mediaQuery = MediaQuery.of(context);
    final bottomInset = mediaQuery.viewInsets.bottom;
    final availableHeight = mediaQuery.size.height - bottomInset;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: availableHeight * 0.90,
        ),
        decoration: const BoxDecoration(
          color: AafiyaColors.pureWhite,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AafiyaRadius.lg),
          ),
        ),
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.opaque,
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Drag handle pill
                Center(
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: AafiyaSpacing.sm),
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AafiyaColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),

                // Header title
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AafiyaSpacing.lg,
                    vertical: AafiyaSpacing.sm,
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.lock_person_outlined,
                        color: AafiyaColors.primaryBlue,
                        size: 24,
                      ),
                      const SizedBox(width: AafiyaSpacing.sm),
                      Expanded(
                        child: Text(
                          strings.sharedRecordViewerTitle,
                          style: AafiyaTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.primaryBlue,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: AafiyaColors.secondaryText),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: AafiyaColors.border),

                // Main body
                Flexible(
                  child: SingleChildScrollView(
                    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.all(AafiyaSpacing.lg),
                    child: _record != null
                        ? _buildRecordView(context, _record!, strings)
                        : _buildResolutionForm(context, strings),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildResolutionForm(BuildContext context, LocalizedStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          strings.sharedRecordEnterPinPrompt,
          style: AafiyaTypography.bodyMedium.copyWith(
            color: AafiyaColors.secondaryText,
          ),
        ),
        const SizedBox(height: AafiyaSpacing.lg),

        // Token Input (if not prefilled or allowed to edit)
        if (widget.initialToken == null || widget.initialToken!.isEmpty) ...[
          Text(
            strings.sharedRecordTokenLabel,
            style: AafiyaTypography.bodySmall.copyWith(
              fontWeight: FontWeight.w600,
              color: AafiyaColors.primaryBlue,
            ),
          ),
          const SizedBox(height: AafiyaSpacing.xs),
          TextField(
            controller: _tokenController,
            enabled: !_isLoading && !_isTerminal,
            decoration: InputDecoration(
              hintText: strings.sharedRecordTokenPlaceholder,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                borderSide: const BorderSide(color: AafiyaColors.border),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: AafiyaSpacing.md,
                vertical: AafiyaSpacing.sm,
              ),
            ),
          ),
          const SizedBox(height: AafiyaSpacing.md),
        ],

        // PIN Input Field
        Text(
          strings.sharedRecordPinLabel,
          style: AafiyaTypography.bodySmall.copyWith(
            fontWeight: FontWeight.w600,
            color: AafiyaColors.primaryBlue,
          ),
        ),
        const SizedBox(height: AafiyaSpacing.xs),
        TextField(
          controller: _pinController,
          enabled: !_isLoading && !_isTerminal,
          keyboardType: TextInputType.number,
          obscureText: true,
          maxLength: 8,
          decoration: InputDecoration(
            hintText: '••••',
            counterText: '',
            prefixIcon: const Icon(Icons.pin_outlined),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
              borderSide: const BorderSide(color: AafiyaColors.border),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AafiyaSpacing.md,
              vertical: AafiyaSpacing.sm,
            ),
          ),
        ),
        const SizedBox(height: AafiyaSpacing.md),

        // Error message banner
        if (_errorMessage != null) ...[
          Container(
            padding: const EdgeInsets.all(AafiyaSpacing.md),
            decoration: BoxDecoration(
              color: _isTerminal ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
              border: Border.all(
                color: _isTerminal ? const Color(0xFFF87171) : const Color(0xFFFCD34D),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _isTerminal ? Icons.error_outline : Icons.warning_amber_rounded,
                  color: _isTerminal ? const Color(0xFFDC2626) : const Color(0xFFD97706),
                  size: 20,
                ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: AafiyaTypography.bodySmall.copyWith(
                      color: _isTerminal ? const Color(0xFF991B1B) : const Color(0xFF92400E),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AafiyaSpacing.lg),
        ],

        // Submit Button
        if (!_isTerminal) ...[
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleResolve,
              style: ElevatedButton.styleFrom(
                backgroundColor: AafiyaColors.primaryBlue,
                foregroundColor: AafiyaColors.pureWhite,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(AafiyaColors.pureWhite),
                      ),
                    )
                  : Text(
                      strings.sharedRecordResolveButton,
                      style: AafiyaTypography.labelLarge.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildRecordView(
    BuildContext context,
    SharedPatientRecord record,
    LocalizedStrings strings,
  ) {
    final patient = record.patient;
    final metadata = record.shareMetadata;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Privacy & Verification notice
        Container(
          padding: const EdgeInsets.all(AafiyaSpacing.md),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(AafiyaRadius.md),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Row(
            children: [
              const Icon(Icons.verified_outlined, color: Color(0xFF16A34A), size: 20),
              const SizedBox(width: AafiyaSpacing.sm),
              Expanded(
                child: Text(
                  metadata.authorizedClinicalScope ?? strings.sharedRecordSecurityNotice,
                  style: AafiyaTypography.bodySmall.copyWith(
                    color: const Color(0xFF166534),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AafiyaSpacing.lg),

        // Patient Summary Card
        Card(
          elevation: 0,
          color: const Color(0xFFF8FAFC),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AafiyaRadius.md),
            side: const BorderSide(color: AafiyaColors.border),
          ),
          child: Padding(
            padding: const EdgeInsets.all(AafiyaSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  patient.fullName,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryBlue,
                  ),
                ),
                const SizedBox(height: AafiyaSpacing.xs),
                Wrap(
                  spacing: AafiyaSpacing.md,
                  runSpacing: AafiyaSpacing.xs,
                  children: [
                    Text('MRN: ${patient.mrn}', style: AafiyaTypography.bodySmall),
                    if (patient.gender != null)
                      Text('${strings.isArabic ? "الجنس" : "Gender"}: ${patient.gender}',
                          style: AafiyaTypography.bodySmall),
                    if (patient.bloodGroup != null)
                      Text('${strings.isArabic ? "فصيلة الدم" : "Blood"}: ${patient.bloodGroup}',
                          style: AafiyaTypography.bodySmall),
                    if (patient.dateOfBirth != null)
                      Text('${strings.isArabic ? "تاريخ الميلاد" : "DOB"}: ${patient.dateOfBirth}',
                          style: AafiyaTypography.bodySmall),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AafiyaSpacing.lg),

        // Allergies Section
        _buildSectionHeader(Icons.warning_amber_rounded, strings.sharedRecordAllergiesTitle),
        const SizedBox(height: AafiyaSpacing.sm),
        if (patient.allergies.isEmpty)
          _buildEmptyItem(strings.sharedRecordNoAllergies)
        else
          ...patient.allergies.map((allergy) => Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: AafiyaSpacing.xs),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  side: const BorderSide(color: AafiyaColors.border),
                ),
                child: ListTile(
                  dense: true,
                  title: Text(allergy.allergen, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    [
                      if (allergy.severity != null) allergy.severity,
                      if (allergy.reaction != null) allergy.reaction,
                      if (allergy.diagnosedAt != null) allergy.diagnosedAt,
                    ].join(' • '),
                  ),
                ),
              )),
        const SizedBox(height: AafiyaSpacing.lg),

        // Chronic Conditions Section
        _buildSectionHeader(Icons.healing_outlined, strings.sharedRecordConditionsTitle),
        const SizedBox(height: AafiyaSpacing.sm),
        if (patient.chronicConditions.isEmpty)
          _buildEmptyItem(strings.sharedRecordNoConditions)
        else
          ...patient.chronicConditions.map((condition) => Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: AafiyaSpacing.xs),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  side: const BorderSide(color: AafiyaColors.border),
                ),
                child: ListTile(
                  dense: true,
                  title: Text(condition.conditionName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    [
                      if (condition.icd10Code != null) 'ICD: ${condition.icd10Code}',
                      if (condition.status != null) condition.status,
                      if (condition.diagnosedDate != null) condition.diagnosedDate,
                    ].join(' • '),
                  ),
                ),
              )),
        const SizedBox(height: AafiyaSpacing.lg),

        // Current Medications Section
        _buildSectionHeader(Icons.medication_outlined, strings.sharedRecordMedicationsTitle),
        const SizedBox(height: AafiyaSpacing.sm),
        if (patient.currentMedications.isEmpty)
          _buildEmptyItem(strings.sharedRecordNoMedications)
        else
          ...patient.currentMedications.map((med) => Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: AafiyaSpacing.xs),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  side: const BorderSide(color: AafiyaColors.border),
                ),
                child: ListTile(
                  dense: true,
                  title: Text(med.medicationName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    [
                      if (med.dosage != null) med.dosage,
                      if (med.frequency != null) med.frequency,
                      if (med.startDate != null) 'Since: ${med.startDate}',
                    ].join(' • '),
                  ),
                ),
              )),
      ],
    );
  }

  Widget _buildSectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AafiyaColors.primaryBlue),
        const SizedBox(width: AafiyaSpacing.xs),
        Text(
          title,
          style: AafiyaTypography.titleSmall.copyWith(
            fontWeight: FontWeight.bold,
            color: AafiyaColors.primaryBlue,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyItem(String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AafiyaSpacing.xs),
      child: Text(
        label,
        style: AafiyaTypography.bodySmall.copyWith(
          color: AafiyaColors.secondaryText,
          fontStyle: FontStyle.italic,
        ),
      ),
    );
  }
}

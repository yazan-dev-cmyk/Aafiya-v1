import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal bottom sheet presenting public prescription verification results.
///
/// Implements ADR-06-03-01 Revision 2.1:
/// - Public verification via `GET /api/v1/v/{token}`
/// - Strictly unauthenticated / public access
/// - ZERO private EHR requests (never calls `GET /api/v1/prescriptions/{id}`)
/// - ZERO augmentation from authenticated user/patient state
/// - Displays only data returned by the public verification endpoint
class PrescriptionVerificationSheet extends StatefulWidget {
  const PrescriptionVerificationSheet({
    super.key,
    required this.apiClient,
    required this.token,
    this.prescriptionService,
  });

  final ApiClient apiClient;
  final String token;
  final PrescriptionService? prescriptionService;

  /// Helper to display this verification sheet inside a modal bottom sheet.
  static Future<void> show(
    BuildContext context, {
    required ApiClient apiClient,
    required String token,
    PrescriptionService? prescriptionService,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PrescriptionVerificationSheet(
        apiClient: apiClient,
        token: token,
        prescriptionService: prescriptionService,
      ),
    );
  }

  @override
  State<PrescriptionVerificationSheet> createState() =>
      _PrescriptionVerificationSheetState();
}

class _PrescriptionVerificationSheetState
    extends State<PrescriptionVerificationSheet> {
  late final PrescriptionService _prescriptionService;

  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _verificationData;

  @override
  void initState() {
    super.initState();
    _prescriptionService = widget.prescriptionService ?? PrescriptionService(widget.apiClient);
    _verifyPrescription();
  }

  Future<void> _verifyPrescription() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _verificationData = null;
    });

    final result = await _prescriptionService.verifyToken(widget.token);

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        final isValid = data['is_valid'] == true;
        if (isValid) {
          setState(() {
            _isLoading = false;
            _verificationData = data;
          });
        } else {
          final message = data['message'] as String?;
          setState(() {
            _isLoading = false;
            _errorMessage = message;
          });
        }

      case ApiFailure(:final exception):
        setState(() {
          _isLoading = false;
          _errorMessage = exception.message;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final mediaQuery = MediaQuery.of(context);

    return Container(
      constraints: BoxConstraints(
        maxHeight: mediaQuery.size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AafiyaRadius.lg),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle pill
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AafiyaColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const Icon(
                    Icons.verified_outlined,
                    color: AafiyaColors.healthBlue,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      strings.qrVerification,
                      style: AafiyaTypography.titleLarge.copyWith(
                        color: AafiyaColors.primaryText,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    tooltip: strings.close,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Body Content
            Flexible(
              child: _buildBody(context, strings),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, LocalizedStrings strings) {
    if (_isLoading) {
      return Padding(
        padding: const EdgeInsets.all(48),
        child: AafiyaLoadingView(message: strings.loadingPrescriptions),
      );
    }

    if (_errorMessage != null || _verificationData == null) {
      final defaultError = strings.isArabic
          ? 'رمز التحقق غير صالح أو لم يتم العثور على الوصفة الطبية.'
          : strings.isFrench
              ? 'Code de vérification invalide ou ordonnance introuvable.'
              : 'Invalid verification code or prescription not found.';

      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AafiyaErrorView(
              title: strings.errorTitle,
              message: _errorMessage ?? defaultError,
              onRetry: _verifyPrescription,
              retryLabel: strings.retry,
            ),
          ],
        ),
      );
    }

    final data = _verificationData!;
    final status = (data['verification_status'] as String? ?? 'active').toLowerCase();
    final reference = data['prescription_reference'] as String? ?? '';
    final doctorName = data['doctor_name'] as String?;
    final doctorSpecialty = data['doctor_specialty'] as String?;
    final clinicName = data['clinic_name'] as String?;
    final patientName = data['patient_name'] as String?;
    final issueDate = data['issue_date'] as String?;
    final expiryDate = data['expiry_date'] as String?;
    final rawItems = data['items'];
    final items = rawItems is List ? rawItems : const [];

    Color statusColor;
    Color statusBgColor;
    String statusLabel;

    switch (status) {
      case 'active':
        statusColor = AafiyaColors.success;
        statusBgColor = AafiyaColors.success.withValues(alpha: 0.12);
        statusLabel = strings.statusActive;
      case 'expired':
        statusColor = AafiyaColors.warning;
        statusBgColor = AafiyaColors.warning.withValues(alpha: 0.12);
        statusLabel = strings.filterStatusExpired;
      case 'voided':
        statusColor = AafiyaColors.error;
        statusBgColor = AafiyaColors.error.withValues(alpha: 0.12);
        statusLabel = strings.statusVoided;
      default:
        statusColor = AafiyaColors.secondaryText;
        statusBgColor = AafiyaColors.border;
        statusLabel = status;
    }

    return SingleChildScrollView(
      padding: AafiyaSpacing.insetScreen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Status & Reference Header Card
          AafiyaCard(
            padding: AafiyaSpacing.insetAllMd,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    statusLabel,
                    style: AafiyaTypography.titleMedium.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (reference.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    '${strings.prescriptionReference}: #$reference',
                    style: AafiyaTypography.bodyMedium.copyWith(
                      color: AafiyaColors.secondaryText,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),

          // 2. Doctor Information Card
          if (doctorName != null && doctorName.isNotEmpty) ...[
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.medical_services_outlined,
                        color: AafiyaColors.healthBlue,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        strings.doctor,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    doctorName,
                    style: AafiyaTypography.titleMedium.copyWith(
                      color: AafiyaColors.primaryText,
                    ),
                  ),
                  if (doctorSpecialty != null && doctorSpecialty.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      doctorSpecialty,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.secondaryText,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // 3. Clinic Information Card
          if (clinicName != null && clinicName.isNotEmpty) ...[
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.local_hospital_outlined,
                        color: AafiyaColors.healthBlue,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        strings.clinic,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    clinicName,
                    style: AafiyaTypography.titleMedium.copyWith(
                      color: AafiyaColors.primaryText,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // 4. Patient Information Card
          if (patientName != null && patientName.isNotEmpty) ...[
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.person_outline,
                        color: AafiyaColors.healthBlue,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        strings.fullNameLabel,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    patientName,
                    style: AafiyaTypography.titleMedium.copyWith(
                      color: AafiyaColors.primaryText,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // 5. Dates Card
          if (issueDate != null || expiryDate != null) ...[
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Row(
                children: [
                  if (issueDate != null)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            strings.issuedOn,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            issueDate,
                            style: AafiyaTypography.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (expiryDate != null)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            strings.expiresOn,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            expiryDate,
                            style: AafiyaTypography.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // 6. Prescribed Medications Card
          if (items.isNotEmpty) ...[
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.medication_outlined,
                        color: AafiyaColors.healthBlue,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${strings.medications} (${items.length})',
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  ...items.map((rawItem) {
                    final item = rawItem is Map<String, dynamic>
                        ? rawItem
                        : (rawItem as Map).cast<String, dynamic>();

                    final medName = item['medication_name'] as String? ?? '';
                    final dosage = item['dosage'] as String?;
                    final frequency = item['frequency'] as String?;
                    final duration = item['duration'] as String?;
                    final instructions = item['instructions'] as String?;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AafiyaColors.lightBackground,
                          borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                          border: Border.all(color: AafiyaColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              medName,
                              style: AafiyaTypography.bodyMedium.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AafiyaColors.primaryText,
                              ),
                            ),
                            if (dosage != null || frequency != null) ...[
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  if (dosage != null)
                                    Text(
                                      '${strings.dosage}: $dosage',
                                      style: AafiyaTypography.bodySmall.copyWith(
                                        color: AafiyaColors.secondaryText,
                                      ),
                                    ),
                                  if (dosage != null && frequency != null)
                                    const Text(' • '),
                                  if (frequency != null)
                                    Text(
                                      '${strings.frequency}: $frequency',
                                      style: AafiyaTypography.bodySmall.copyWith(
                                        color: AafiyaColors.secondaryText,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                            if (duration != null && duration.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                '${strings.duration}: $duration',
                                style: AafiyaTypography.bodySmall.copyWith(
                                  color: AafiyaColors.secondaryText,
                                ),
                              ),
                            ],
                            if (instructions != null && instructions.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                '${strings.instructions}: $instructions',
                                style: AafiyaTypography.bodySmall.copyWith(
                                  color: AafiyaColors.secondaryText,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // 7. Read-Only Notice
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AafiyaColors.healthBlue.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AafiyaRadius.sm),
              border: Border.all(
                color: AafiyaColors.healthBlue.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline,
                  color: AafiyaColors.healthBlue,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    strings.readOnlyPrescriptionNotice,
                    style: AafiyaTypography.bodySmall.copyWith(
                      color: AafiyaColors.healthBlue,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 8. Close Button
          AafiyaButton(
            label: strings.close,
            variant: AafiyaButtonVariant.secondary,
            onPressed: () => Navigator.of(context).pop(),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

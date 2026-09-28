import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import '../widgets/allergy_badge_list.dart';
import '../widgets/chronic_conditions_list.dart';
import '../widgets/emergency_contact_card.dart';

/// Read-only modal sheet presenting the authorized Patient Medical Summary.
///
/// Features:
/// - Fetches patient summary via `GET /api/v1/patients/{patientId}` using [EmergencyProfileService].
/// - Strictly read-only presentation (DISC-02, SEC-05).
/// - Whitelist data minimization: Strictly renders verified clinical summary fields
///   (patient identity, blood group, allergies with severity, chronic conditions, emergency contact).
///   Zero exposure of patient personal phone, email, national ID, or address.
/// - Clinic context propagation & stale response protection.
/// - Distinct handling for 403 Forbidden vs general errors vs empty states.
class PatientSummarySheet extends StatefulWidget {
  const PatientSummarySheet({
    super.key,
    required this.apiClient,
    required this.patientId,
    required this.patientName,
    this.mrn,
  });

  final ApiClient apiClient;
  final String patientId;
  final String patientName;
  final String? mrn;

  /// Convenience launcher to open the medical summary as a modal bottom sheet.
  static Future<void> show(
    BuildContext context, {
    required ApiClient apiClient,
    required String patientId,
    required String patientName,
    String? mrn,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PatientSummarySheet(
        apiClient: apiClient,
        patientId: patientId,
        patientName: patientName,
        mrn: mrn,
      ),
    );
  }

  @override
  State<PatientSummarySheet> createState() => _PatientSummarySheetState();
}

class _PatientSummarySheetState extends State<PatientSummarySheet> {
  late final EmergencyProfileService _service;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isAccessDenied = false;
  EmergencyProfile? _profile;

  @override
  void initState() {
    super.initState();
    _service = EmergencyProfileService(widget.apiClient);
    _fetchSummary();
  }

  Future<void> _fetchSummary() async {
    final clinicIdAtStart = widget.apiClient.activeClinicId;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _isAccessDenied = false;
    });

    final result = await _service.getPatientSummary(widget.patientId);

    if (!mounted) return;

    // Stale response guard: Discard if clinic context switched during in-flight fetch
    if (widget.apiClient.activeClinicId != clinicIdAtStart) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _profile = data;
          _isLoading = false;
        });

      case ApiFailure(:final exception):
        final isDenied = exception is ForbiddenException ||
            exception.toString().contains('403');

        setState(() {
          _isAccessDenied = isDenied;
          _errorMessage = exception.message;
          _isLoading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final maxHeight = MediaQuery.of(context).size.height * 0.88;

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: const BoxDecoration(
        color: AafiyaColors.lightBackground,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AafiyaRadius.xl),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildDragHandle(),
          _buildHeader(context, strings),
          const Divider(height: 1, color: AafiyaColors.border),
          Expanded(
            child: _buildBody(context, strings),
          ),
        ],
      ),
    );
  }

  Widget _buildDragHandle() {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(top: 10, bottom: 6),
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: AafiyaColors.border,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, LocalizedStrings strings) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AafiyaSpacing.lg,
        vertical: AafiyaSpacing.sm,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AafiyaRadius.sm),
            ),
            child: const Icon(
              Icons.medical_information_outlined,
              color: AafiyaColors.healthBlue,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.patientSummaryTitle,
                  style: AafiyaTypography.titleLarge.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
                Text(
                  widget.patientName,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: AafiyaColors.secondaryText),
            tooltip: strings.closeButtonLabel,
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context, LocalizedStrings strings) {
    if (_isLoading) {
      return AafiyaLoadingView(message: strings.loadingPatientSummary);
    }

    if (_isAccessDenied) {
      return _buildAccessDeniedView(strings);
    }

    if (_errorMessage != null) {
      return AafiyaErrorView(
        message: _errorMessage!,
        retryLabel: strings.retryLoadingProfile,
        onRetry: _fetchSummary,
      );
    }

    final profile = _profile;
    if (profile == null) {
      return const SizedBox.shrink();
    }

    return RefreshIndicator(
      onRefresh: _fetchSummary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Read-Only Banner
            _buildReadOnlyBanner(strings),
            const SizedBox(height: AafiyaSpacing.md),

            // Patient Identity & Blood Group
            _buildIdentityCard(profile, strings),
            const SizedBox(height: AafiyaSpacing.md),

            // Allergies Section (High Visibility)
            _buildSectionHeader(
              icon: Icons.warning_amber_rounded,
              iconColor: profile.hasAllergies ? AafiyaColors.error : AafiyaColors.secondaryText,
              title: '${strings.allergiesTitle} (${profile.allergies.length})',
            ),
            const SizedBox(height: AafiyaSpacing.xs),
            AllergyBadgeList(allergies: profile.allergies),
            const SizedBox(height: AafiyaSpacing.md),

            // Chronic Conditions Section
            _buildSectionHeader(
              icon: Icons.healing_outlined,
              iconColor: profile.hasChronicConditions ? AafiyaColors.warning : AafiyaColors.secondaryText,
              title: '${strings.chronicConditionsTitle} (${profile.chronicConditions.length})',
            ),
            const SizedBox(height: AafiyaSpacing.xs),
            ChronicConditionsList(conditions: profile.chronicConditions),
            const SizedBox(height: AafiyaSpacing.md),

            // Emergency Contacts Section
            _buildSectionHeader(
              icon: Icons.contact_phone_outlined,
              iconColor: AafiyaColors.healthBlue,
              title: '${strings.emergencyContactsTitle} (${profile.emergencyContacts.length})',
            ),
            const SizedBox(height: AafiyaSpacing.xs),
            EmergencyContactCard(contacts: profile.emergencyContacts),
            const SizedBox(height: AafiyaSpacing.xl),
          ],
        ),
      ),
    );
  }

  Widget _buildReadOnlyBanner(LocalizedStrings strings) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AafiyaColors.info.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
        border: Border.all(
          color: AafiyaColors.info.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.lock_outline,
            color: AafiyaColors.info,
            size: 18,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              strings.readOnlySummaryNotice,
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.primaryText,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIdentityCard(EmergencyProfile profile, LocalizedStrings strings) {
    final effectiveMrn = profile.mrn.isNotEmpty ? profile.mrn : (widget.mrn ?? '');
    final bloodGroup = profile.bloodGroup;

    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Blood Group indicator if present
          if (bloodGroup != null && bloodGroup.trim().isNotEmpty) ...[
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: AafiyaColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                border: Border.all(
                  color: AafiyaColors.error.withValues(alpha: 0.3),
                  width: 1.2,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.water_drop,
                    color: AafiyaColors.error,
                    size: 18,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    bloodGroup.trim(),
                    style: AafiyaTypography.titleMedium.copyWith(
                      color: AafiyaColors.error,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
          ],
          // Identity Text Details (Safe whitelisted clinical demographics)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.fullName.isNotEmpty ? profile.fullName : widget.patientName,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
                if (effectiveMrn.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AafiyaColors.lightBackground,
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                    child: Text(
                      'MRN: $effectiveMrn',
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
                if (profile.dateOfBirth != null && profile.dateOfBirth!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    profile.dateOfBirth!,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required Color iconColor,
    required String title,
  }) {
    return Row(
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: AafiyaTypography.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
            color: AafiyaColors.primaryText,
          ),
        ),
      ],
    );
  }

  Widget _buildAccessDeniedView(LocalizedStrings strings) {
    return Padding(
      padding: AafiyaSpacing.insetScreen,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AafiyaColors.error.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.gpp_bad_outlined,
                color: AafiyaColors.error,
                size: 48,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              strings.accessDeniedPatientSummary,
              textAlign: TextAlign.center,
              style: AafiyaTypography.titleMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: AafiyaColors.primaryText,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? strings.accessDeniedPatientSummary,
              textAlign: TextAlign.center,
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
            const SizedBox(height: 20),
            AafiyaButton(
              label: strings.retryLoadingProfile,
              variant: AafiyaButtonVariant.secondary,
              onPressed: _fetchSummary,
            ),
          ],
        ),
      ),
    );
  }
}

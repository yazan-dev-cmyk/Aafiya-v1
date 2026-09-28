import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Screen displaying the authenticated patient's Emergency Medical Profile.
///
/// STRICTLY READ-ONLY: No edit, save, update, or delete operations exist.
/// Medical records may only be altered by authorized clinical personnel.
class EmergencyProfileScreen extends StatefulWidget {
  const EmergencyProfileScreen({
    super.key,
    required this.apiClient,
  });

  final ApiClient apiClient;

  static Future<void> show(BuildContext context, {required ApiClient apiClient}) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => EmergencyProfileScreen(apiClient: apiClient),
      ),
    );
  }

  @override
  State<EmergencyProfileScreen> createState() => _EmergencyProfileScreenState();
}

class _EmergencyProfileScreenState extends State<EmergencyProfileScreen> {
  late final EmergencyProfileService _profileService;
  bool _isLoading = false;
  String? _errorMessage;
  EmergencyProfile? _profile;

  @override
  void initState() {
    super.initState();
    _profileService = EmergencyProfileService(widget.apiClient);
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _profileService.getEmergencyProfile();

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _profile = data;
          _isLoading = false;
        });

      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message;
          _isLoading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.emergencyProfileTitle,
        leading: BackButton(
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _buildContent(context, strings),
    );
  }

  Widget _buildContent(BuildContext context, LocalizedStrings strings) {
    if (_isLoading) {
      return AafiyaLoadingView(message: strings.loadingEmergencyProfile);
    }

    if (_errorMessage != null) {
      return AafiyaErrorView(
        message: _errorMessage!,
        retryLabel: strings.retryLoadingProfile,
        onRetry: _fetchProfile,
      );
    }

    if (_profile == null) {
      return RefreshIndicator(
        onRefresh: _fetchProfile,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: AafiyaEmptyView(
            icon: Icons.medical_information_outlined,
            title: strings.emergencyProfileTitle,
            message: strings.noEmergencyContacts,
          ),
        ),
      );
    }

    final profile = _profile!;

    return RefreshIndicator(
      onRefresh: _fetchProfile,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Read-Only Policy Banner
            AafiyaCard(
              borderColor: AafiyaColors.info.withValues(alpha: 0.3),
              backgroundColor: AafiyaColors.info.withValues(alpha: 0.05),
              padding: AafiyaSpacing.insetAllMd,
              child: Row(
                children: [
                  const Icon(Icons.privacy_tip_outlined, color: AafiyaColors.info, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      strings.readOnlyProfileNotice,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.primaryText,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Emergency Hero: Blood Group & Identity
            AafiyaCard(
              backgroundColor: AafiyaColors.pureWhite,
              padding: AafiyaSpacing.insetAllLg,
              child: Row(
                children: [
                  // Blood Group Badge
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AafiyaColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.water_drop, color: AafiyaColors.error, size: 24),
                        const SizedBox(height: 2),
                        Text(
                          profile.bloodGroup != null && profile.bloodGroup!.isNotEmpty
                              ? profile.bloodGroup!
                              : '--',
                          style: AafiyaTypography.titleMedium.copyWith(
                            color: AafiyaColors.error,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Patient Identity Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          profile.fullName.isNotEmpty ? profile.fullName : strings.appBrandName,
                          style: AafiyaTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${strings.bloodType}: ${profile.bloodGroup ?? strings.unknownBloodType}',
                          style: AafiyaTypography.bodyMedium.copyWith(
                            color: AafiyaColors.secondaryText,
                          ),
                        ),
                        if (profile.mrn.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            'MRN: ${profile.mrn}',
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
            ),
            const SizedBox(height: 16),

            // Chronic Condition Indicator Section
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(
                              Icons.healing_outlined,
                              color: AafiyaColors.healthBlue,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                strings.chronicConditionsTitle,
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: profile.isChronic
                              ? AafiyaColors.warning.withValues(alpha: 0.15)
                              : AafiyaColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          profile.isChronic
                              ? strings.isChronicPatient
                              : strings.notChronicPatient,
                          style: AafiyaTypography.caption.copyWith(
                            color: profile.isChronic
                                ? AafiyaColors.warning
                                : AafiyaColors.success,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (profile.chronicConditions.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    const Divider(color: AafiyaColors.border),
                    const SizedBox(height: 8),
                    ...profile.chronicConditions.map(
                      (condition) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.circle, size: 8, color: AafiyaColors.warning),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    condition.conditionName,
                                    style: AafiyaTypography.bodyMedium.copyWith(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (condition.icd10Code != null)
                                    Text(
                                      'ICD-10: ${condition.icd10Code}',
                                      style: AafiyaTypography.caption.copyWith(
                                        color: AafiyaColors.secondaryText,
                                      ),
                                    ),
                                  if (condition.notes != null)
                                    Text(
                                      condition.notes!,
                                      style: AafiyaTypography.caption,
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    Text(
                      strings.noChronicConditions,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Medical Allergies Section
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: AafiyaColors.error,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${strings.allergiesTitle} (${profile.allergies.length})',
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (profile.allergies.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Text(
                        strings.noAllergies,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                      ),
                    )
                  else
                    ...profile.allergies.map(
                      (allergy) => _buildAllergyTile(context, strings, allergy),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Emergency Contacts Section
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.contact_phone_outlined,
                        color: AafiyaColors.healthBlue,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${strings.emergencyContactsTitle} (${profile.emergencyContacts.length})',
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (profile.emergencyContacts.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Text(
                        strings.noEmergencyContacts,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                      ),
                    )
                  else
                    ...profile.emergencyContacts.map(
                      (contact) => _buildContactTile(context, strings, contact),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildAllergyTile(
    BuildContext context,
    LocalizedStrings strings,
    PatientAllergy allergy,
  ) {
    Color severityColor;
    String severityLabel;

    if (allergy.isSevere) {
      severityColor = AafiyaColors.error;
      severityLabel = strings.severitySevere;
    } else if (allergy.isModerate) {
      severityColor = AafiyaColors.warning;
      severityLabel = strings.severityModerate;
    } else {
      severityColor = AafiyaColors.healthBlue;
      severityLabel = strings.severityMild;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AafiyaColors.lightBackground,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AafiyaColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  allergy.allergen,
                  style: AafiyaTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: severityColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  severityLabel,
                  style: AafiyaTypography.caption.copyWith(
                    color: severityColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          if (allergy.reaction != null && allergy.reaction!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              '${strings.reaction}: ${allergy.reaction}',
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
          ],
          if (allergy.notes != null && allergy.notes!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              allergy.notes!,
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.primaryText,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContactTile(
    BuildContext context,
    LocalizedStrings strings,
    EmergencyContact contact,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AafiyaColors.lightBackground,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AafiyaColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AafiyaColors.healthBlue.withValues(alpha: 0.1),
            child: const Icon(Icons.person, color: AafiyaColors.healthBlue, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        contact.name,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (contact.isPrimary) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AafiyaColors.success.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          strings.primaryContact,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.success,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${strings.relationship}: ${contact.relationship}',
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                ),
                Text(
                  contact.phone,
                  style: AafiyaTypography.caption.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AafiyaColors.primaryText,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.phone_in_talk, color: AafiyaColors.healthBlue),
            tooltip: strings.call,
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${contact.name}: ${contact.phone}'),
                  duration: const Duration(seconds: 3),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

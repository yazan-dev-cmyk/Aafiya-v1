import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Clinic Context Selector widget for AAFIYA Pro Doctor Shell.
///
/// Displays the doctor's active clinic context, highlights primary and
/// medical director affiliations, and enables modal switching when the
/// doctor practices across multiple authorized clinics.
class ClinicContextSelector extends StatelessWidget {
  const ClinicContextSelector({
    super.key,
    required this.sessionManager,
    this.onClinicSwitched,
  });

  final AuthSessionManager sessionManager;
  final ValueChanged<DoctorClinic>? onClinicSwitched;

  void _showClinicSwitcherSheet(BuildContext context, LocalizedStrings strings) {
    final activeClinics = sessionManager.authorizedClinics.where((c) => c.isActive).toList();
    if (activeClinics.isEmpty) return;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AafiyaRadius.lg)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AafiyaSpacing.lg,
              vertical: AafiyaSpacing.md,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
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
                const SizedBox(height: AafiyaSpacing.md),
                Row(
                  children: [
                    const Icon(
                      Icons.swap_horiz_rounded,
                      color: AafiyaColors.healthBlue,
                      size: 24,
                    ),
                    const SizedBox(width: AafiyaSpacing.sm),
                    Text(
                      strings.switchClinic,
                      style: AafiyaTypography.titleLarge,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  strings.availableClinics,
                  style: AafiyaTypography.bodySmall.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AafiyaSpacing.md),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: activeClinics.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (ctx, index) {
                      final clinic = activeClinics[index];
                      final isSelected = clinic.id == sessionManager.activeClinicId;

                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: AafiyaSpacing.xs,
                          vertical: AafiyaSpacing.xs,
                        ),
                        leading: CircleAvatar(
                          backgroundColor: isSelected
                              ? AafiyaColors.healthBlue
                              : AafiyaColors.lightBackground,
                          foregroundColor: isSelected
                              ? AafiyaColors.pureWhite
                              : AafiyaColors.secondaryText,
                          child: const Icon(Icons.local_hospital_rounded, size: 20),
                        ),
                        title: Row(
                          children: [
                            Expanded(
                              child: Text(
                                clinic.name,
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ),
                            if (clinic.isMedicalDirector) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AafiyaColors.warning.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  strings.directorPosition,
                                  style: AafiyaTypography.caption.copyWith(
                                    color: AafiyaColors.warning,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                            if (clinic.isPrimary) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  strings.primaryClinicBadge,
                                  style: AafiyaTypography.caption.copyWith(
                                    color: AafiyaColors.healthBlue,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        subtitle: Text(
                          [clinic.wilaya, clinic.address].whereType<String>().where((s) => s.isNotEmpty).join(' • '),
                          style: AafiyaTypography.caption,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle_rounded, color: AafiyaColors.healthBlue)
                            : null,
                        onTap: () {
                          Navigator.of(sheetContext).pop();
                          if (!isSelected) {
                            final success = sessionManager.switchActiveClinic(clinic.id);
                            if (success) {
                              onClinicSwitched?.call(clinic);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(strings.clinicSwitchSuccess),
                                  duration: const Duration(seconds: 2),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            }
                          }
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: AafiyaSpacing.sm),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return ListenableBuilder(
      listenable: sessionManager,
      builder: (context, _) {
        final activeClinic = sessionManager.activeClinic;
        final activeClinics = sessionManager.authorizedClinics.where((c) => c.isActive).toList();
        final hasMultipleClinics = activeClinics.length > 1;

        if (activeClinic == null) {
          return AafiyaCard(
            backgroundColor: AafiyaColors.warning.withValues(alpha: 0.08),
            borderColor: AafiyaColors.warning.withValues(alpha: 0.3),
            padding: AafiyaSpacing.insetAllMd,
            child: Row(
              children: [
                const Icon(
                  Icons.warning_amber_rounded,
                  color: AafiyaColors.warning,
                  size: 24,
                ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    strings.noClinicsAssigned,
                    style: AafiyaTypography.bodySmall.copyWith(
                      color: AafiyaColors.primaryText,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return AafiyaCard(
          backgroundColor: AafiyaColors.lightBackground,
          borderColor: AafiyaColors.healthBlue.withValues(alpha: 0.2),
          padding: AafiyaSpacing.insetAllMd,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                    child: const Icon(
                      Icons.local_hospital_rounded,
                      color: AafiyaColors.healthBlue,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              strings.activeClinic,
                              style: AafiyaTypography.caption.copyWith(
                                color: AafiyaColors.secondaryText,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          activeClinic.name,
                          style: AafiyaTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.primaryText,
                          ),
                        ),
                        if (activeClinic.wilaya != null || activeClinic.address != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            [activeClinic.wilaya, activeClinic.address]
                                .whereType<String>()
                                .where((s) => s.isNotEmpty)
                                .join(' - '),
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (hasMultipleClinics)
                    OutlinedButton.icon(
                      onPressed: () => _showClinicSwitcherSheet(context, strings),
                      icon: const Icon(Icons.swap_horiz_rounded, size: 18),
                      label: Text(strings.changeClinic),
                      style: OutlinedButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        foregroundColor: AafiyaColors.healthBlue,
                        side: const BorderSide(color: AafiyaColors.healthBlue),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AafiyaSpacing.xs),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: activeClinic.isMedicalDirector
                          ? AafiyaColors.warning.withValues(alpha: 0.15)
                          : AafiyaColors.healthBlue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          activeClinic.isMedicalDirector
                              ? Icons.admin_panel_settings_rounded
                              : Icons.medical_services_rounded,
                          size: 14,
                          color: activeClinic.isMedicalDirector
                              ? AafiyaColors.warning
                              : AafiyaColors.healthBlue,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          activeClinic.isMedicalDirector
                              ? strings.directorPosition
                              : strings.doctorPosition,
                          style: AafiyaTypography.caption.copyWith(
                            color: activeClinic.isMedicalDirector
                                ? AafiyaColors.warning
                                : AafiyaColors.healthBlue,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (activeClinic.isPrimary)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AafiyaColors.border,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        strings.primaryClinicBadge,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

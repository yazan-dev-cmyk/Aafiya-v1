import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Persistent reminder banner shown on the Doctor Operational Dashboard
/// whenever clinic operating hours or doctor weekly working hours remain incomplete.
class DoctorSetupReminderBanner extends StatelessWidget {
  const DoctorSetupReminderBanner({
    super.key,
    required this.isDirector,
    required this.isClinicConfigured,
    required this.isScheduleActivated,
    this.isLoading = false,
    this.errorMessage,
    required this.onConfigureClinic,
    required this.onConfigureDoctorSchedule,
    required this.onRefresh,
  });

  final bool isDirector;
  final bool? isClinicConfigured;
  final bool? isScheduleActivated;
  final bool isLoading;
  final String? errorMessage;
  final VoidCallback onConfigureClinic;
  final VoidCallback onConfigureDoctorSchedule;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const SizedBox.shrink();
    }

    final strings = LocalizedStrings.of(context);

    // 1. Error state — never assume complete on failure, display retry
    if (errorMessage != null) {
      return Container(
        margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
        padding: AafiyaSpacing.insetAllMd,
        decoration: BoxDecoration(
          color: AafiyaColors.error.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(AafiyaRadius.md),
          border: Border.all(
            color: AafiyaColors.error.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: AafiyaColors.error,
              size: 22,
            ),
            const SizedBox(width: AafiyaSpacing.sm),
            Expanded(
              child: Text(
                strings.onboardingErrorCheckingStatus,
                style: AafiyaTypography.bodySmall.copyWith(
                  color: AafiyaColors.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(
                Icons.refresh_rounded,
                color: AafiyaColors.error,
                size: 20,
              ),
              tooltip: strings.retry,
              onPressed: onRefresh,
            ),
          ],
        ),
      );
    }

    // If both configured and activated, no banner needed
    if (isClinicConfigured == true && isScheduleActivated == true) {
      return const SizedBox.shrink();
    }

    // 2. Clinic Operating Hours Unconfigured
    if (isClinicConfigured == false) {
      if (isDirector) {
        return Container(
          margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
          padding: AafiyaSpacing.insetAllMd,
          decoration: BoxDecoration(
            color: AafiyaColors.warning.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(AafiyaRadius.md),
            border: Border.all(
              color: AafiyaColors.warning.withValues(alpha: 0.35),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.warning_amber_rounded,
                    color: AafiyaColors.warning,
                    size: 24,
                  ),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          strings.onboardingDirectorStep1Title,
                          style: AafiyaTypography.titleSmall.copyWith(
                            color: AafiyaColors.warning,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          strings.onboardingDirectorReminderBanner,
                          style: AafiyaTypography.bodySmall.copyWith(
                            color: AafiyaColors.primaryText,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(
                      Icons.refresh_rounded,
                      size: 20,
                      color: AafiyaColors.secondaryText,
                    ),
                    tooltip: strings.refreshDashboard,
                    onPressed: onRefresh,
                  ),
                ],
              ),
              const SizedBox(height: AafiyaSpacing.sm),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: FilledButton.icon(
                  onPressed: onConfigureClinic,
                  style: FilledButton.styleFrom(
                    backgroundColor: AafiyaColors.warning,
                    foregroundColor: Colors.black87,
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                  ),
                  icon: const Icon(Icons.store_mall_directory_outlined, size: 16),
                  label: Text(
                    strings.onboardingConfigureClinicAction,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        );
      } else {
        // Employed doctor: cannot configure clinic hours, show waiting notice
        return Container(
          margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
          padding: AafiyaSpacing.insetAllMd,
          decoration: BoxDecoration(
            color: AafiyaColors.info.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(AafiyaRadius.md),
            border: Border.all(
              color: AafiyaColors.info.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.hourglass_empty_rounded,
                color: AafiyaColors.info,
                size: 22,
              ),
              const SizedBox(width: AafiyaSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strings.onboardingEmployedWaitingTitle,
                      style: AafiyaTypography.titleSmall.copyWith(
                        color: AafiyaColors.info,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      strings.onboardingEmployedWaitingBanner,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.primaryText,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(
                  Icons.refresh_rounded,
                  size: 20,
                  color: AafiyaColors.secondaryText,
                ),
                tooltip: strings.refreshDashboard,
                onPressed: onRefresh,
              ),
            ],
          ),
        );
      }
    }

    // 3. Clinic Hours Configured, but Doctor Weekly Schedule is Not Activated
    if (isScheduleActivated == false) {
      return Container(
        margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
        padding: AafiyaSpacing.insetAllMd,
        decoration: BoxDecoration(
          color: AafiyaColors.primaryBlue.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(AafiyaRadius.md),
          border: Border.all(
            color: AafiyaColors.primaryBlue.withValues(alpha: 0.3),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.schedule_rounded,
                  color: AafiyaColors.primaryBlue,
                  size: 24,
                ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        strings.onboardingDoctorActivationBanner,
                        style: AafiyaTypography.bodySmall.copyWith(
                          color: AafiyaColors.primaryText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(
                    Icons.refresh_rounded,
                    size: 20,
                    color: AafiyaColors.secondaryText,
                  ),
                  tooltip: strings.refreshDashboard,
                  onPressed: onRefresh,
                ),
              ],
            ),
            const SizedBox(height: AafiyaSpacing.sm),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: FilledButton.icon(
                onPressed: onConfigureDoctorSchedule,
                style: FilledButton.styleFrom(
                  backgroundColor: AafiyaColors.primaryBlue,
                  foregroundColor: Colors.white,
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  ),
                ),
                icon: const Icon(Icons.event_available_rounded, size: 16),
                label: Text(
                  strings.onboardingConfigureDoctorAction,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }
}

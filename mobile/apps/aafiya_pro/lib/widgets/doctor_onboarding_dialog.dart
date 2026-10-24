import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Role-aware operational onboarding dialog for clinic operating hours and doctor schedules.
class DoctorOnboardingDialog extends StatelessWidget {
  const DoctorOnboardingDialog({
    super.key,
    required this.isDirector,
    required this.clinicName,
    required this.isClinicConfigured,
    required this.isScheduleActivated,
    required this.onConfigureClinic,
    required this.onConfigureDoctorSchedule,
    required this.onLater,
  });

  final bool isDirector;
  final String clinicName;
  final bool isClinicConfigured;
  final bool isScheduleActivated;
  final VoidCallback onConfigureClinic;
  final VoidCallback onConfigureDoctorSchedule;
  final VoidCallback onLater;

  static Future<void> show(
    BuildContext context, {
    required bool isDirector,
    required String clinicName,
    required bool isClinicConfigured,
    required bool isScheduleActivated,
    required VoidCallback onConfigureClinic,
    required VoidCallback onConfigureDoctorSchedule,
    required VoidCallback onLater,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => DoctorOnboardingDialog(
        isDirector: isDirector,
        clinicName: clinicName,
        isClinicConfigured: isClinicConfigured,
        isScheduleActivated: isScheduleActivated,
        onConfigureClinic: onConfigureClinic,
        onConfigureDoctorSchedule: onConfigureDoctorSchedule,
        onLater: onLater,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    final needsClinicHours = isDirector && !isClinicConfigured;
    final needsDoctorHours = isClinicConfigured && !isScheduleActivated;
    final isEmployedWaiting = !isDirector && !isClinicConfigured;

    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AafiyaRadius.lg),
      ),
      contentPadding: AafiyaSpacing.insetAllLg,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AafiyaColors.primaryBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AafiyaRadius.pill),
                  border: Border.all(
                    color: AafiyaColors.primaryBlue.withValues(alpha: 0.25),
                  ),
                ),
                child: Text(
                  strings.onboardingBadge,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.primaryBlue,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: AafiyaSpacing.xs),
              Expanded(
                child: Text(
                  '• $clinicName',
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AafiyaSpacing.sm),
          Text(
            isDirector
                ? strings.onboardingDirectorTitle
                : strings.onboardingEmployedTitle,
            style: AafiyaTypography.titleMedium.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Stepper indicator for Director
            if (isDirector) ...[
              _buildStepIndicator(
                stepNumber: 1,
                title: strings.onboardingDirectorStep1Title,
                isCompleted: isClinicConfigured,
                isCurrent: !isClinicConfigured,
              ),
              const SizedBox(height: AafiyaSpacing.sm),
              _buildStepIndicator(
                stepNumber: 2,
                title: strings.onboardingDirectorStep2Title,
                isCompleted: isScheduleActivated,
                isCurrent: isClinicConfigured && !isScheduleActivated,
              ),
              const SizedBox(height: AafiyaSpacing.md),
            ],

            // 2. Explanatory Context Card
            Container(
              padding: AafiyaSpacing.insetAllMd,
              decoration: BoxDecoration(
                color: (needsClinicHours || isEmployedWaiting)
                    ? AafiyaColors.warning.withValues(alpha: 0.08)
                    : AafiyaColors.primaryBlue.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                border: Border.all(
                  color: (needsClinicHours || isEmployedWaiting)
                      ? AafiyaColors.warning.withValues(alpha: 0.3)
                      : AafiyaColors.primaryBlue.withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        (needsClinicHours || isEmployedWaiting)
                            ? Icons.info_outline_rounded
                            : Icons.check_circle_outline_rounded,
                        color: (needsClinicHours || isEmployedWaiting)
                            ? AafiyaColors.warning
                            : AafiyaColors.primaryBlue,
                        size: 20,
                      ),
                      const SizedBox(width: AafiyaSpacing.xs),
                      Expanded(
                        child: Text(
                          needsClinicHours
                              ? strings.onboardingDirectorStep1Title
                              : isEmployedWaiting
                                  ? strings.onboardingEmployedWaitingTitle
                                  : strings.onboardingDirectorStep2Title,
                          style: AafiyaTypography.bodyMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: (needsClinicHours || isEmployedWaiting)
                                ? AafiyaColors.warning
                                : AafiyaColors.primaryBlue,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    needsClinicHours
                        ? strings.onboardingDirectorStep1Desc
                        : isEmployedWaiting
                            ? strings.onboardingEmployedWaitingDesc
                            : isDirector
                                ? strings.onboardingDirectorStep2Desc
                                : strings.onboardingEmployedReadyDesc,
                    style: AafiyaTypography.bodySmall.copyWith(
                      color: AafiyaColors.primaryText,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      actionsPadding: const EdgeInsets.symmetric(
        horizontal: AafiyaSpacing.md,
        vertical: AafiyaSpacing.sm,
      ),
      actions: [
        // Secondary Action: Later
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            onLater();
          },
          child: Text(
            strings.onboardingLaterAction,
            style: const TextStyle(color: AafiyaColors.secondaryText),
          ),
        ),

        // Primary Action
        if (needsClinicHours)
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              onConfigureClinic();
            },
            style: FilledButton.styleFrom(
              backgroundColor: AafiyaColors.warning,
              foregroundColor: Colors.black87,
            ),
            icon: const Icon(Icons.store_mall_directory_outlined, size: 18),
            label: Text(
              strings.onboardingConfigureClinicAction,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          )
        else if (needsDoctorHours)
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              onConfigureDoctorSchedule();
            },
            style: FilledButton.styleFrom(
              backgroundColor: AafiyaColors.primaryBlue,
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.event_available_rounded, size: 18),
            label: Text(
              strings.onboardingConfigureDoctorAction,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          )
        else if (isEmployedWaiting)
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              onLater();
            },
            style: FilledButton.styleFrom(
              backgroundColor: AafiyaColors.info,
              foregroundColor: Colors.white,
            ),
            child: Text(
              strings.onboardingUnderstoodAction,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
      ],
    );
  }

  Widget _buildStepIndicator({
    required int stepNumber,
    required String title,
    required bool isCompleted,
    required bool isCurrent,
  }) {
    final Color color = isCompleted
        ? AafiyaColors.success
        : isCurrent
            ? AafiyaColors.primaryBlue
            : AafiyaColors.secondaryText;

    return Row(
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: isCompleted
                ? AafiyaColors.success
                : isCurrent
                    ? AafiyaColors.primaryBlue
                    : Colors.transparent,
            border: Border.all(
              color: color,
              width: 1.5,
            ),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isCompleted
                ? const Icon(Icons.check, size: 14, color: Colors.white)
                : Text(
                    '$stepNumber',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color:
                          isCurrent ? Colors.white : AafiyaColors.secondaryText,
                    ),
                  ),
          ),
        ),
        const SizedBox(width: AafiyaSpacing.sm),
        Expanded(
          child: Text(
            title,
            style: AafiyaTypography.bodyMedium.copyWith(
              fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
              color: isCurrent
                  ? AafiyaColors.primaryText
                  : AafiyaColors.secondaryText,
            ),
          ),
        ),
      ],
    );
  }
}

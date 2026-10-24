import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal dialog for reviewing weekly schedule and permanently activating it.
///
/// Invariants:
/// - Irreversible lock policy: Permanent lock under V1 (DEC-HOURS-01).
/// - Mandatory user acknowledgment checkbox before activation button is unlocked.
/// - Single-click execution: Activation request disables button, showing loading indicator.
class ScheduleActivationDialog extends StatefulWidget {
  const ScheduleActivationDialog({
    super.key,
    required this.days,
    required this.onConfirm,
  });

  final List<DoctorDayScheduleItem> days;
  final Future<void> Function() onConfirm;

  static Future<bool?> show(
    BuildContext context, {
    required List<DoctorDayScheduleItem> days,
    required Future<void> Function() onConfirm,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => ScheduleActivationDialog(
        days: days,
        onConfirm: onConfirm,
      ),
    );
  }

  @override
  State<ScheduleActivationDialog> createState() =>
      _ScheduleActivationDialogState();
}

class _ScheduleActivationDialogState extends State<ScheduleActivationDialog> {
  bool _hasConfirmedIrreversibility = false;
  bool _isActivating = false;
  String? _errorMessage;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final openDays = widget.days.where((d) => !d.isClosed).toList();
    final totalSlots = openDays.fold<int>(0, (sum, d) => sum + d.slots.length);

    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AafiyaRadius.lg),
      ),
      contentPadding: AafiyaSpacing.insetAllMd,
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AafiyaColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
            ),
            child: const Icon(
              Icons.lock_outline_rounded,
              color: AafiyaColors.warning,
              size: 24,
            ),
          ),
          const SizedBox(width: AafiyaSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  strings.activationDialogTitle,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  strings.activationDialogSubtitle,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Schedule Summary Card
            Container(
              padding: AafiyaSpacing.insetAllSm,
              decoration: BoxDecoration(
                color: AafiyaColors.lightBackground,
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                border: Border.all(color: AafiyaColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          strings.openDaysCountLabel,
                          style: AafiyaTypography.caption,
                        ),
                        Text(
                          '${openDays.length} / 7',
                          style: AafiyaTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.primaryBlue,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 36,
                    color: AafiyaColors.border,
                  ),
                  const SizedBox(width: AafiyaSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          strings.totalSlotsCountLabel,
                          style: AafiyaTypography.caption,
                        ),
                        Text(
                          '$totalSlots',
                          style: AafiyaTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.healthBlue,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Open Days Chip List
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: widget.days.map((d) {
                final dayName = strings.getDayName(d.dayOfWeek);
                final isOpen = !d.isClosed;
                return Chip(
                  label: Text(
                      '$dayName (${isOpen ? d.slots.length : strings.closedDayLabel})'),
                  labelStyle: AafiyaTypography.caption.copyWith(
                    color: isOpen
                        ? AafiyaColors.healthBlue
                        : AafiyaColors.secondaryText,
                    fontWeight: isOpen ? FontWeight.bold : FontWeight.normal,
                  ),
                  backgroundColor: isOpen
                      ? AafiyaColors.healthBlue.withValues(alpha: 0.1)
                      : AafiyaColors.lightBackground,
                  side: BorderSide(
                    color:
                        isOpen ? AafiyaColors.healthBlue : AafiyaColors.border,
                  ),
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Critical Irreversibility Alert Banner
            Container(
              padding: AafiyaSpacing.insetAllSm,
              decoration: BoxDecoration(
                color: AafiyaColors.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                border: Border.all(
                    color: AafiyaColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.warning_amber_rounded,
                    color: AafiyaColors.error,
                    size: 22,
                  ),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Text(
                      strings.activationIrreversibleWarning,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.error,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Mandatory Confirmation Checkbox
            CheckboxListTile(
              key: const Key('activation_irreversible_checkbox'),
              contentPadding: EdgeInsets.zero,
              value: _hasConfirmedIrreversibility,
              onChanged: _isActivating
                  ? null
                  : (val) {
                      setState(() {
                        _hasConfirmedIrreversibility = val ?? false;
                      });
                    },
              title: Text(
                strings.activationIrreversibleCheckbox,
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AafiyaColors.primaryText,
                ),
              ),
              controlAffinity: ListTileControlAffinity.leading,
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: AafiyaSpacing.sm),
              Text(
                _errorMessage!,
                style: AafiyaTypography.caption.copyWith(
                  color: AafiyaColors.error,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed:
              _isActivating ? null : () => Navigator.of(context).pop(false),
          child: Text(strings.cancel),
        ),
        ElevatedButton(
          key: const Key('confirm_activation_button'),
          onPressed: (_hasConfirmedIrreversibility && !_isActivating)
              ? () async {
                  setState(() {
                    _isActivating = true;
                    _errorMessage = null;
                  });
                  try {
                    await widget.onConfirm();
                    if (context.mounted) {
                      Navigator.of(context).pop(true);
                    }
                  } catch (e) {
                    if (mounted) {
                      setState(() {
                        _isActivating = false;
                        _errorMessage = e.toString();
                      });
                    }
                  }
                }
              : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AafiyaColors.error,
            foregroundColor: AafiyaColors.pureWhite,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AafiyaRadius.sm),
            ),
          ),
          child: _isActivating
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(AafiyaColors.pureWhite),
                  ),
                )
              : Text(strings.confirmAndActivate),
        ),
      ],
    );
  }
}

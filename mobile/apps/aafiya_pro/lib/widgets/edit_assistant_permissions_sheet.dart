import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal bottom sheet for updating Layer 4 delegated permissions for a clinic assistant.
///
/// Under Layer 4 RBAC, assistants may ONLY hold permissions within the safe ceiling:
/// - `booking.manage_queue`
/// - `booking.confirm_attendance`
/// - `booking.create`
/// - `patient.view_contacts`
class EditAssistantPermissionsSheet extends StatefulWidget {
  const EditAssistantPermissionsSheet({
    super.key,
    required this.staffService,
    required this.clinicId,
    required this.assistant,
    required this.onUpdated,
  });

  final ClinicStaffService staffService;
  final String clinicId;
  final ClinicAssistantStaff assistant;
  final VoidCallback onUpdated;

  static Future<void> show(
    BuildContext context, {
    required ClinicStaffService staffService,
    required String clinicId,
    required ClinicAssistantStaff assistant,
    required VoidCallback onUpdated,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => EditAssistantPermissionsSheet(
        staffService: staffService,
        clinicId: clinicId,
        assistant: assistant,
        onUpdated: onUpdated,
      ),
    );
  }

  @override
  State<EditAssistantPermissionsSheet> createState() =>
      _EditAssistantPermissionsSheetState();
}

class _EditAssistantPermissionsSheetState
    extends State<EditAssistantPermissionsSheet> {
  late final Set<String> _selectedPermissions;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedPermissions = Set<String>.from(widget.assistant.permissions);
  }

  Future<void> _savePermissions() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.staffService.updateAssistantPermissions(
      widget.clinicId,
      widget.assistant.id,
      permissions: _selectedPermissions.toList(),
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        final strings = LocalizedStrings.of(context);
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.permissionsUpdated),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onUpdated();
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
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    final permissionsConfig = [
      (
        key: 'booking.manage_queue',
        title: strings.permManageQueueTitle,
        desc: strings.permManageQueueDesc,
        icon: Icons.low_priority_rounded,
      ),
      (
        key: 'booking.confirm_attendance',
        title: strings.permConfirmAttendanceTitle,
        desc: strings.permConfirmAttendanceDesc,
        icon: Icons.how_to_reg_rounded,
      ),
      (
        key: 'booking.create',
        title: strings.permCreateBookingTitle,
        desc: strings.permCreateBookingDesc,
        icon: Icons.calendar_today_rounded,
      ),
      (
        key: 'patient.view_contacts',
        title: strings.permViewContactsTitle,
        desc: strings.permViewContactsDesc,
        icon: Icons.contact_phone_rounded,
      ),
      (
        key: 'booking.confirm',
        title: strings.permConfirmBookingTitle,
        desc: strings.permConfirmBookingDesc,
        icon: Icons.verified_outlined,
      ),
    ];

    return Material(
      color: AafiyaColors.pureWhite,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(AafiyaRadius.lg)),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          AafiyaSpacing.lg,
          AafiyaSpacing.md,
          AafiyaSpacing.lg,
          AafiyaSpacing.lg + bottomInset,
        ),
        child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 36,
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
              const CircleAvatar(
                backgroundColor: AafiyaColors.lightBackground,
                foregroundColor: AafiyaColors.healthBlue,
                child: Icon(Icons.security_rounded),
              ),
              const SizedBox(width: AafiyaSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strings.editPermissions,
                      style: AafiyaTypography.titleMedium.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      widget.assistant.name,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const Divider(height: AafiyaSpacing.lg),

          if (_errorMessage != null) ...[
            Container(
              padding: AafiyaSpacing.insetAllSm,
              decoration: BoxDecoration(
                color: AafiyaColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AafiyaRadius.sm),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded,
                      color: AafiyaColors.error, size: 20),
                  const SizedBox(width: AafiyaSpacing.xs),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AafiyaSpacing.sm),
          ],

          // Permissions Checkboxes
          ...permissionsConfig.map((item) {
            final isChecked = _selectedPermissions.contains(item.key);
            return CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              secondary: Icon(
                item.icon,
                color: isChecked ? AafiyaColors.healthBlue : AafiyaColors.secondaryText,
                size: 24,
              ),
              title: Text(
                item.title,
                style: AafiyaTypography.bodyLarge.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(
                item.desc,
                style: AafiyaTypography.caption.copyWith(
                  color: AafiyaColors.secondaryText,
                ),
              ),
              activeColor: AafiyaColors.healthBlue,
              value: isChecked,
              onChanged: _isLoading
                  ? null
                  : (val) {
                      setState(() {
                        if (val == true) {
                          _selectedPermissions.add(item.key);
                        } else {
                          _selectedPermissions.remove(item.key);
                        }
                      });
                    },
            );
          }),

          const SizedBox(height: AafiyaSpacing.lg),

          // Save Button
          AafiyaButton(
            label: strings.savePermissions,
            isLoading: _isLoading,
            onPressed: _isLoading ? null : _savePermissions,
          ),
        ],
      ),
    ),
  );
}
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'edit_assistant_permissions_sheet.dart';

/// Modal bottom sheet presenting complete details and management actions
/// for an employed doctor or clinic assistant.
///
/// Guarded operations:
/// - Self-protection / Primary Director protection: cannot suspend or detach self or primary director.
/// - Doctor account sovereignty: Director does not edit personal credentials; only manages clinic membership.
/// - Assistant Layer 4 RBAC delegation.
class StaffDetailSheet extends StatefulWidget {
  const StaffDetailSheet({
    super.key,
    required this.staffService,
    required this.clinicId,
    required this.currentUser,
    required this.onUpdated,
    this.doctor,
    this.assistant,
  }) : assert(doctor != null || assistant != null);

  final ClinicStaffService staffService;
  final String clinicId;
  final User currentUser;
  final VoidCallback onUpdated;
  final ClinicDoctorStaff? doctor;
  final ClinicAssistantStaff? assistant;

  static Future<void> showDoctor(
    BuildContext context, {
    required ClinicStaffService staffService,
    required String clinicId,
    required ClinicDoctorStaff doctor,
    required User currentUser,
    required VoidCallback onUpdated,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StaffDetailSheet(
        staffService: staffService,
        clinicId: clinicId,
        doctor: doctor,
        currentUser: currentUser,
        onUpdated: onUpdated,
      ),
    );
  }

  static Future<void> showAssistant(
    BuildContext context, {
    required ClinicStaffService staffService,
    required String clinicId,
    required ClinicAssistantStaff assistant,
    required User currentUser,
    required VoidCallback onUpdated,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StaffDetailSheet(
        staffService: staffService,
        clinicId: clinicId,
        assistant: assistant,
        currentUser: currentUser,
        onUpdated: onUpdated,
      ),
    );
  }

  @override
  State<StaffDetailSheet> createState() => _StaffDetailSheetState();
}

class _StaffDetailSheetState extends State<StaffDetailSheet> {
  bool _isLoading = false;
  String? _errorMessage;

  bool get _isDoctor => widget.doctor != null;

  bool get _isSelf {
    if (_isDoctor) {
      final doc = widget.doctor!;
      final matchUserId = doc.userId != null &&
          doc.userId.toString() == widget.currentUser.id.toString();
      final matchEmail = doc.email != null &&
          doc.email!.trim().toLowerCase() ==
              widget.currentUser.email.trim().toLowerCase();
      final isPrimary = doc.isPrimary;
      return matchUserId || matchEmail || isPrimary;
    }
    return false;
  }

  String get _name => _isDoctor ? widget.doctor!.name : widget.assistant!.name;
  String? get _email =>
      _isDoctor ? widget.doctor!.email : widget.assistant!.email;
  String? get _phone =>
      _isDoctor ? widget.doctor!.phone : widget.assistant!.phone;
  bool get _isActive =>
      _isDoctor ? widget.doctor!.isActive : widget.assistant!.isActive;

  Future<void> _toggleStatus() async {
    final strings = LocalizedStrings.of(context);
    final willSuspend = _isActive;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(
          willSuspend ? strings.confirmSuspendTitle : strings.confirmActivateTitle,
          style: AafiyaTypography.titleMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        content: Text(
          willSuspend
              ? strings.confirmSuspendMessage
              : strings.confirmActivateMessage,
          style: AafiyaTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  willSuspend ? AafiyaColors.error : AafiyaColors.healthBlue,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            child: Text(
                willSuspend ? strings.suspendStaff : strings.activateStaff),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final targetActive = !willSuspend;
    final result = _isDoctor
        ? await widget.staffService.updateDoctorStatus(
            widget.clinicId,
            widget.doctor!.id,
            isActive: targetActive,
          )
        : await widget.staffService.updateAssistantStatus(
            widget.clinicId,
            widget.assistant!.id,
            isActive: targetActive,
          );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.staffStatusUpdated),
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

  Future<void> _detachOrDelete() async {
    final strings = LocalizedStrings.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(
          _isDoctor
              ? strings.confirmDetachDoctorTitle
              : strings.confirmDeleteAssistantTitle,
          style: AafiyaTypography.titleMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        content: Text(
          _isDoctor
              ? strings.confirmDetachDoctorMessage
              : strings.confirmDeleteAssistantMessage,
          style: AafiyaTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.error,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            child: Text(
              _isDoctor ? strings.detachDoctor : strings.deleteAssistant,
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = _isDoctor
        ? await widget.staffService.detachDoctor(
            widget.clinicId,
            widget.doctor!.id,
          )
        : await widget.staffService.deleteAssistant(
            widget.clinicId,
            widget.assistant!.id,
          );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                _isDoctor ? strings.doctorDetached : strings.assistantDeleted),
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

    return Container(
      decoration: const BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AafiyaRadius.lg)),
      ),
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
              CircleAvatar(
                backgroundColor: _isDoctor
                    ? AafiyaColors.healthBlue.withValues(alpha: 0.1)
                    : AafiyaColors.healingGreen.withValues(alpha: 0.1),
                foregroundColor: _isDoctor
                    ? AafiyaColors.healthBlue
                    : AafiyaColors.healingGreen,
                child: Icon(
                  _isDoctor
                      ? Icons.medical_services_rounded
                      : Icons.support_agent_rounded,
                ),
              ),
              const SizedBox(width: AafiyaSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _name,
                      style: AafiyaTypography.titleLarge.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      _isDoctor
                          ? (widget.doctor!.isDirector
                              ? strings.directorBadge
                              : strings.doctorBadge)
                          : strings.assistantBadge,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontWeight: FontWeight.w600,
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

          // Status & Position Badges
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _isActive
                      ? AafiyaColors.success.withValues(alpha: 0.1)
                      : AafiyaColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  _isActive ? strings.activeStatus : strings.suspendedStatus,
                  style: AafiyaTypography.caption.copyWith(
                    color: _isActive ? AafiyaColors.success : AafiyaColors.error,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (_isDoctor && widget.doctor!.isPrimary)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AafiyaColors.warning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    strings.primaryBadge,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.warning,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AafiyaSpacing.md),

          // Details List
          AafiyaCard(
            padding: AafiyaSpacing.insetAllMd,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_email != null && _email!.isNotEmpty) ...[
                  _buildDetailRow(Icons.email_outlined, strings.emailLabel, _email!),
                  const SizedBox(height: AafiyaSpacing.sm),
                ],
                if (_phone != null && _phone!.isNotEmpty) ...[
                  _buildDetailRow(Icons.phone_outlined, strings.phoneLabel, _phone!),
                  const SizedBox(height: AafiyaSpacing.sm),
                ],
                if (_isDoctor && widget.doctor!.specialty != null) ...[
                  _buildDetailRow(
                    Icons.local_hospital_outlined,
                    strings.specialtyLabel,
                    widget.doctor!.specialty!,
                  ),
                  const SizedBox(height: AafiyaSpacing.sm),
                ],
                if (_isDoctor && widget.doctor!.licenseNumber != null) ...[
                  _buildDetailRow(
                    Icons.badge_outlined,
                    strings.licenseNumberLabel,
                    widget.doctor!.licenseNumber!,
                  ),
                  const SizedBox(height: AafiyaSpacing.sm),
                ],
                if (_isDoctor && widget.doctor!.joinedAt != null) ...[
                  _buildDetailRow(
                    Icons.calendar_today_outlined,
                    strings.joinedAtLabel,
                    widget.doctor!.joinedAt!,
                  ),
                ],
                if (!_isDoctor && widget.assistant!.createdAt != null) ...[
                  _buildDetailRow(
                    Icons.calendar_today_outlined,
                    strings.joinedAtLabel,
                    widget.assistant!.createdAt!,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AafiyaSpacing.md),

          // Assistant Layer 4 permissions summary
          if (!_isDoctor) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  strings.permissionsLabel,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    EditAssistantPermissionsSheet.show(
                      context,
                      staffService: widget.staffService,
                      clinicId: widget.clinicId,
                      assistant: widget.assistant!,
                      onUpdated: widget.onUpdated,
                    );
                  },
                  icon: const Icon(Icons.edit_outlined, size: 16),
                  label: Text(strings.editPermissions),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: widget.assistant!.permissions.isEmpty
                  ? [
                      Text(
                        strings.noStaffFound,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                      )
                    ]
                  : widget.assistant!.permissions.map((p) {
                      return Chip(
                        label: Text(
                          _getPermissionLabel(p, strings),
                          style: AafiyaTypography.caption,
                        ),
                        backgroundColor:
                            AafiyaColors.healthBlue.withValues(alpha: 0.1),
                        side: BorderSide.none,
                        visualDensity: VisualDensity.compact,
                      );
                    }).toList(),
            ),
            const SizedBox(height: AafiyaSpacing.md),
          ],

          // Actions
          if (_isSelf) ...[
            Container(
              padding: AafiyaSpacing.insetAllMd,
              decoration: BoxDecoration(
                color: AafiyaColors.lightBackground,
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                border: Border.all(color: AafiyaColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded,
                      color: AafiyaColors.secondaryText),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Text(
                      strings.cannotModifySelfNotice,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isLoading ? null : _toggleStatus,
                    icon: Icon(
                      _isActive
                          ? Icons.pause_circle_outline_rounded
                          : Icons.play_circle_outline_rounded,
                      color: _isActive
                          ? AafiyaColors.warning
                          : AafiyaColors.success,
                    ),
                    label: Text(
                      _isActive ? strings.suspendStaff : strings.activateStaff,
                      style: TextStyle(
                        color: _isActive
                            ? AafiyaColors.warning
                            : AafiyaColors.success,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: _isActive
                            ? AafiyaColors.warning
                            : AafiyaColors.success,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isLoading ? null : _detachOrDelete,
                    icon: const Icon(Icons.delete_outline_rounded,
                        color: AafiyaColors.error),
                    label: Text(
                      _isDoctor
                          ? strings.detachDoctor
                          : strings.deleteAssistant,
                      style: const TextStyle(color: AafiyaColors.error),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AafiyaColors.error),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AafiyaColors.secondaryText),
        const SizedBox(width: AafiyaSpacing.sm),
        Text(
          '$label: ',
          style: AafiyaTypography.caption.copyWith(
            fontWeight: FontWeight.w600,
            color: AafiyaColors.secondaryText,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: AafiyaTypography.bodyMedium,
          ),
        ),
      ],
    );
  }

  String _getPermissionLabel(String key, LocalizedStrings strings) {
    return switch (key) {
      'booking.manage_queue' => strings.permManageQueueTitle,
      'booking.confirm_attendance' => strings.permConfirmAttendanceTitle,
      'booking.create' => strings.permCreateBookingTitle,
      'patient.view_contacts' => strings.permViewContactsTitle,
      'booking.confirm' => strings.permConfirmBookingTitle,
      _ => key,
    };
  }
}

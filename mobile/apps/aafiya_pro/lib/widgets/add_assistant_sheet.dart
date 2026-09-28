import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal bottom sheet for provisioning a new clinic assistant.
///
/// Features:
/// - Identity inputs: name, email, phone, password.
/// - Layer 4 Delegated Permissions selector:
///   * `booking.manage_queue`
///   * `booking.confirm_attendance`
///   * `booking.create`
///   * `patient.view_contacts`
class AddAssistantSheet extends StatefulWidget {
  const AddAssistantSheet({
    super.key,
    required this.staffService,
    required this.clinicId,
    required this.onCreated,
  });

  final ClinicStaffService staffService;
  final String clinicId;
  final VoidCallback onCreated;

  static Future<void> show(
    BuildContext context, {
    required ClinicStaffService staffService,
    required String clinicId,
    required VoidCallback onCreated,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddAssistantSheet(
        staffService: staffService,
        clinicId: clinicId,
        onCreated: onCreated,
      ),
    );
  }

  @override
  State<AddAssistantSheet> createState() => _AddAssistantSheetState();
}

class _AddAssistantSheetState extends State<AddAssistantSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  final Set<String> _selectedPermissions = {
    'booking.manage_queue',
    'booking.confirm_attendance',
    'booking.create',
  };

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.staffService.createAssistant(
      widget.clinicId,
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      password: _passwordController.text,
      permissions: _selectedPermissions.toList(),
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        final strings = LocalizedStrings.of(context);
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.assistantCreated),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onCreated();
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
      ),
      (
        key: 'booking.confirm_attendance',
        title: strings.permConfirmAttendanceTitle,
        desc: strings.permConfirmAttendanceDesc,
      ),
      (
        key: 'booking.create',
        title: strings.permCreateBookingTitle,
        desc: strings.permCreateBookingDesc,
      ),
      (
        key: 'patient.view_contacts',
        title: strings.permViewContactsTitle,
        desc: strings.permViewContactsDesc,
      ),
      (
        key: 'booking.confirm',
        title: strings.permConfirmBookingTitle,
        desc: strings.permConfirmBookingDesc,
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
        child: SingleChildScrollView(
        child: Form(
          key: _formKey,
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
                    child: Icon(Icons.person_add_alt_1_rounded),
                  ),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Text(
                      strings.addAssistant,
                      style: AafiyaTypography.titleLarge.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
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

              // Name
              AafiyaTextField(
                label: strings.fullNameLabel,
                controller: _nameController,
                prefixIcon: const Icon(Icons.person_outline_rounded),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return strings.fieldRequired;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AafiyaSpacing.sm),

              // Email
              AafiyaTextField(
                label: strings.emailLabel,
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                prefixIcon: const Icon(Icons.email_outlined),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return strings.fieldRequired;
                  }
                  if (!val.contains('@') || !val.contains('.')) {
                    return strings.invalidEmail;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AafiyaSpacing.sm),

              // Phone
              AafiyaTextField(
                label: strings.phoneLabel,
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                prefixIcon: const Icon(Icons.phone_outlined),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return strings.fieldRequired;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AafiyaSpacing.sm),

              // Password
              AafiyaTextField(
                label: strings.passwordLabel,
                controller: _passwordController,
                obscureText: true,
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                validator: (val) {
                  if (val == null || val.isEmpty) {
                    return strings.fieldRequired;
                  }
                  if (val.length < 8) {
                    return strings.passwordTooShort;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AafiyaSpacing.md),

              // Permissions section
              Text(
                strings.permissionsLabel,
                style: AafiyaTypography.titleMedium.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AafiyaSpacing.xs),

              ...permissionsConfig.map((item) {
                final isChecked = _selectedPermissions.contains(item.key);
                return CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    item.title,
                    style: AafiyaTypography.bodyMedium.copyWith(
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

              // Submit Button
              AafiyaButton(
                label: strings.addAssistant,
                isLoading: _isLoading,
                onPressed: _isLoading ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';

import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_button.dart';
import 'aafiya_text_field.dart';

/// AAFIYA Password Recovery Bottom Sheet.
///
/// Features:
/// - Email input with format validation.
/// - Atomic backend call to POST /api/v1/auth/forgot-password.
/// - Uniform recovery feedback to prevent account enumeration (DEC-PWR-05 / DEC-PWR-06).
/// - Graceful rate-limit (429) and captcha/validation error handling.
/// - Accessible RTL and LTR support via [LocalizedStrings].
class AafiyaForgotPasswordSheet extends StatefulWidget {
  const AafiyaForgotPasswordSheet({
    super.key,
    required this.apiClient,
    this.onSuccess,
  });

  final ApiClient apiClient;
  final VoidCallback? onSuccess;

  static Future<void> show(
    BuildContext context, {
    required ApiClient apiClient,
    VoidCallback? onSuccess,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: AafiyaForgotPasswordSheet(
          apiClient: apiClient,
          onSuccess: onSuccess,
        ),
      ),
    );
  }

  @override
  State<AafiyaForgotPasswordSheet> createState() => _AafiyaForgotPasswordSheetState();
}

class _AafiyaForgotPasswordSheetState extends State<AafiyaForgotPasswordSheet> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  bool _isLoading = false;
  bool _submitted = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final loc = LocalizedStrings.of(context);

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final email = _emailController.text.trim().toLowerCase();

    try {
      final result = await widget.apiClient.post(
        ApiEndpoints.forgotPassword,
        body: {
          'email': email,
          'locale': Localizations.localeOf(context).languageCode,
        },
        requiresAuth: false,
      );

      if (!mounted) return;

      if (result.isSuccess) {
        setState(() {
          _isLoading = false;
          _submitted = true;
        });
        widget.onSuccess?.call();
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = result.exceptionOrNull?.message ?? loc.uniformRecoveryNotice;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = loc.uniformRecoveryNotice;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = LocalizedStrings.of(context);
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AafiyaRadius.sheet),
        ),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: AafiyaSpacing.lg,
            vertical: AafiyaSpacing.md,
          ),
          child: _submitted ? _buildSuccessView(loc) : _buildFormView(loc),
        ),
      ),
    );
  }

  Widget _buildFormView(LocalizedStrings loc) {
    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header Icon & Title
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AafiyaRadius.card),
                ),
                child: const Icon(
                  Icons.lock_reset_rounded,
                  color: AafiyaColors.healthBlue,
                  size: 24,
                ),
              ),
              const SizedBox(width: AafiyaSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      loc.forgotPasswordTitle,
                      style: AafiyaTypography.titleMedium.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      loc.forgotPasswordDesc,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: AafiyaSpacing.lg),

          // Error banner if any
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(AafiyaSpacing.sm),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(AafiyaRadius.card),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline_rounded, color: Colors.red.shade700, size: 20),
                  const SizedBox(width: AafiyaSpacing.xs),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: Colors.red.shade800,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),
          ],

          // Email Input
          AafiyaTextField(
            controller: _emailController,
            label: loc.emailLabel,
            hintText: 'name@example.com',
            prefixIcon: const Icon(Icons.email_outlined),
            keyboardType: TextInputType.emailAddress,
            enabled: !_isLoading,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return loc.emailLabel;
              }
              final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
              if (!emailRegex.hasMatch(value.trim())) {
                return loc.emailLabel;
              }
              return null;
            },
          ),

          const SizedBox(height: AafiyaSpacing.lg),

          // Action Button
          AafiyaButton(
            label: loc.sendRecoveryLink,
            icon: const Icon(Icons.send_rounded, size: 18),
            isLoading: _isLoading,
            onPressed: _handleSubmit,
          ),

          const SizedBox(height: AafiyaSpacing.sm),
        ],
      ),
    );
  }

  Widget _buildSuccessView(LocalizedStrings loc) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Center(
          child: Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
        const SizedBox(height: AafiyaSpacing.sm),
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.green.shade200),
          ),
          child: Icon(
            Icons.mark_email_read_rounded,
            color: Colors.green.shade700,
            size: 32,
          ),
        ),
        const SizedBox(height: AafiyaSpacing.md),
        Text(
          loc.recoveryEmailSent,
          style: AafiyaTypography.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AafiyaSpacing.xs),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AafiyaSpacing.sm),
          child: Text(
            loc.uniformRecoveryNotice,
            style: AafiyaTypography.bodyMedium.copyWith(
              color: Colors.grey.shade700,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: AafiyaSpacing.xl),
        AafiyaButton(
          label: loc.ok,
          variant: AafiyaButtonVariant.outline,
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          },
        ),
        const SizedBox(height: AafiyaSpacing.sm),
      ],
    );
  }
}

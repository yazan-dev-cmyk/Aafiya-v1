import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';

import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_button.dart';
import 'aafiya_text_field.dart';

/// Reusable AAFIYA Change Password form card / modal sheet component.
///
/// Features:
/// - Current password, new password, and confirmation inputs with obscure toggles.
/// - Client-side validation (required fields, min 8 chars, password match).
/// - Atomic backend call to POST /api/v1/auth/change-password.
/// - Full error handling (maps validation errors from backend).
/// - In-memory form state only; zero local caching of credentials.
/// - Accessible RTL and LTR support via [LocalizedStrings].
class AafiyaChangePasswordCard extends StatefulWidget {
  const AafiyaChangePasswordCard({
    super.key,
    required this.apiClient,
    this.onSuccess,
    this.onCancel,
    this.isBottomSheet = false,
  });

  final ApiClient apiClient;
  final VoidCallback? onSuccess;
  final VoidCallback? onCancel;
  final bool isBottomSheet;

  /// Helper to display this change password card inside a modal bottom sheet.
  static Future<bool?> show(
    BuildContext context, {
    required ApiClient apiClient,
    VoidCallback? onSuccess,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: AafiyaChangePasswordCard(
          apiClient: apiClient,
          isBottomSheet: true,
          onSuccess: () {
            onSuccess?.call();
            if (Navigator.of(sheetContext).canPop()) {
              Navigator.of(sheetContext).pop(true);
            }
          },
          onCancel: () {
            if (Navigator.of(sheetContext).canPop()) {
              Navigator.of(sheetContext).pop(false);
            }
          },
        ),
      ),
    );
  }

  @override
  State<AafiyaChangePasswordCard> createState() =>
      _AafiyaChangePasswordCardState();
}

class _AafiyaChangePasswordCardState extends State<AafiyaChangePasswordCard> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _currentPasswordController;
  late final TextEditingController _newPasswordController;
  late final TextEditingController _confirmPasswordController;

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _currentPasswordController = TextEditingController();
    _newPasswordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_isLoading) return;

    setState(() {
      _errorMessage = null;
    });

    if (!_formKey.currentState!.validate()) {
      return;
    }

    final strings = LocalizedStrings.of(context);

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await widget.apiClient.post(
        ApiEndpoints.changePassword,
        body: {
          'current_password': _currentPasswordController.text,
          'new_password': _newPasswordController.text,
          'new_password_confirmation': _confirmPasswordController.text,
        },
      );

      if (!mounted) return;

      if (result.isSuccess) {
        // Clear password fields immediately
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.passwordChangedSuccess,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  strings.otherSessionsRevoked,
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
            backgroundColor: AafiyaColors.healingGreen,
            duration: const Duration(seconds: 4),
          ),
        );

        widget.onSuccess?.call();
      } else {
        final exception = result.exceptionOrNull;
        String message = exception?.message ?? strings.featureLockedNotice;

        if (exception is ApiException && exception.errorResponse != null) {
          final validationErrors = exception.errorResponse!.errors;
          if (validationErrors.isNotEmpty) {
            final firstFieldErrors = validationErrors.values.first;
            if (firstFieldErrors.isNotEmpty) {
              message = firstFieldErrors.first;
            }
          }
        }

        setState(() {
          _errorMessage = message;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    final content = Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AafiyaColors.healingGreen.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.lock_reset_rounded,
                  color: AafiyaColors.healingGreen,
                  size: 22,
                ),
              ),
              const SizedBox(width: AafiyaSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strings.changePassword,
                      style: AafiyaTypography.titleLarge.copyWith(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      strings.otherSessionsRevoked,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (widget.isBottomSheet)
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  color: AafiyaColors.secondaryText,
                  onPressed:
                      widget.onCancel ?? () => Navigator.of(context).pop(),
                ),
            ],
          ),

          const SizedBox(height: AafiyaSpacing.lg),

          // Error Banner
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(AafiyaSpacing.md),
              decoration: BoxDecoration(
                color: AafiyaColors.error.withValues(alpha: 0.1),
                borderRadius: AafiyaRadius.borderSm,
                border: Border.all(
                  color: AafiyaColors.error.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    color: AafiyaColors.error,
                    size: 20,
                  ),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: AafiyaTypography.bodyMedium.copyWith(
                        color: AafiyaColors.error,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),
          ],

          // Current Password Field
          AafiyaTextField(
            label: strings.currentPasswordLabel,
            controller: _currentPasswordController,
            obscureText: _obscureCurrent,
            enabled: !_isLoading,
            prefixIcon: const Icon(Icons.lock_outline, size: 20),
            suffixIcon: IconButton(
              icon: Icon(
                _obscureCurrent
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                size: 20,
              ),
              onPressed: () {
                setState(() {
                  _obscureCurrent = !_obscureCurrent;
                });
              },
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return strings.currentPasswordRequired;
              }
              return null;
            },
          ),

          const SizedBox(height: AafiyaSpacing.md),

          // New Password Field
          AafiyaTextField(
            label: strings.newPasswordLabel,
            controller: _newPasswordController,
            obscureText: _obscureNew,
            enabled: !_isLoading,
            prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
            suffixIcon: IconButton(
              icon: Icon(
                _obscureNew
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                size: 20,
              ),
              onPressed: () {
                setState(() {
                  _obscureNew = !_obscureNew;
                });
              },
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return strings.newPasswordRequired;
              }
              if (value.length < 8) {
                return strings.passwordTooShort;
              }
              return null;
            },
          ),

          const SizedBox(height: AafiyaSpacing.md),

          // Confirm New Password Field
          AafiyaTextField(
            label: strings.confirmNewPasswordLabel,
            controller: _confirmPasswordController,
            obscureText: _obscureConfirm,
            enabled: !_isLoading,
            prefixIcon: const Icon(Icons.check_circle_outline, size: 20),
            suffixIcon: IconButton(
              icon: Icon(
                _obscureConfirm
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                size: 20,
              ),
              onPressed: () {
                setState(() {
                  _obscureConfirm = !_obscureConfirm;
                });
              },
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return strings.confirmPasswordLabel;
              }
              if (value != _newPasswordController.text) {
                return strings.passwordsDoNotMatch;
              }
              return null;
            },
          ),

          const SizedBox(height: AafiyaSpacing.xl),

          // Action Buttons
          AafiyaButton(
            label: strings.changePasswordSubmit,
            onPressed: _isLoading ? null : _submit,
            isLoading: _isLoading,
            variant: AafiyaButtonVariant.primary,
          ),

          if (widget.onCancel != null && !widget.isBottomSheet) ...[
            const SizedBox(height: AafiyaSpacing.sm),
            AafiyaButton(
              label: strings.changePasswordCancel,
              onPressed: _isLoading ? null : widget.onCancel,
              variant: AafiyaButtonVariant.outline,
            ),
          ],
        ],
      ),
    );

    if (widget.isBottomSheet) {
      return Container(
        decoration: const BoxDecoration(
          color: AafiyaColors.pureWhite,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AafiyaRadius.card),
          ),
        ),
        padding: const EdgeInsets.all(AafiyaSpacing.lg),
        child: SingleChildScrollView(child: content),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.circular(AafiyaRadius.card),
        border: Border.all(color: AafiyaColors.border),
      ),
      padding: const EdgeInsets.all(AafiyaSpacing.lg),
      child: content,
    );
  }
}

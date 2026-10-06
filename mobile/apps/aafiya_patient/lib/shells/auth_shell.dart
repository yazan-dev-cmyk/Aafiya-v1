import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Authentication modes for patient onboarding.
enum AuthMode { login, register }

/// Patient Authentication Shell: supports login, registration, role verification, and language selection.
class PatientAuthShell extends StatefulWidget {
  const PatientAuthShell({
    super.key,
    required this.sessionManager,
    required this.apiClient,
    required this.onLoginSuccess,
    this.onLocaleChanged,
    this.currentLocale,
    this.initialMode = AuthMode.login,
  });

  final AuthSessionManager sessionManager;
  final ApiClient apiClient;
  final VoidCallback onLoginSuccess;
  final ValueChanged<Locale>? onLocaleChanged;
  final Locale? currentLocale;
  final AuthMode initialMode;

  @override
  State<PatientAuthShell> createState() => _PatientAuthShellState();
}

class _PatientAuthShellState extends State<PatientAuthShell> {
  late AuthMode _mode;

  // Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _showErrorDialog({
    required String title,
    required String message,
  }) {
    final strings = LocalizedStrings.of(context);
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AafiyaColors.pureWhite,
        shape: const RoundedRectangleBorder(borderRadius: AafiyaRadius.borderLg),
        title: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: AafiyaColors.error),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: AafiyaTypography.titleLarge.copyWith(color: AafiyaColors.error),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: AafiyaTypography.bodyLarge,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              strings.ok,
              style: AafiyaTypography.titleMedium.copyWith(color: AafiyaColors.healthBlue),
            ),
          ),
        ],
      ),
    );
  }

  bool _validateEmail(String email) {
    return RegExp(r'^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$').hasMatch(email);
  }

  Future<void> _handleLogin() async {
    if (_isLoading) return;

    final strings = LocalizedStrings.of(context);
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    // Client-side validation
    if (email.isEmpty || password.isEmpty) {
      await _showErrorDialog(
        title: strings.authenticationFailedTitle,
        message: strings.fieldRequired,
      );
      return;
    }

    if (!_validateEmail(email)) {
      await _showErrorDialog(
        title: strings.authenticationFailedTitle,
        message: strings.invalidEmail,
      );
      return;
    }

    if (password.length < 8) {
      await _showErrorDialog(
        title: strings.authenticationFailedTitle,
        message: strings.passwordTooShort,
      );
      return;
    }

    setState(() => _isLoading = true);

    final result = await widget.apiClient.post(
      ApiEndpoints.login,
      body: {
        'email': email,
        'password': password,
        'device_name': 'aafiya_patient_mobile',
      },
      requiresAuth: false,
      allowRetry: true,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        final payload = data['data'];
        if (payload is Map<String, dynamic> && payload['token'] != null) {
          final token = payload['token'].toString();
          final userJson = payload['user'] as Map<String, dynamic>? ?? {};
          final user = User.fromJson(userJson);

          // Role Boundary Verification
          final destination = const RoleResolver().resolvePatientDestination(user);
          if (destination == RoleResolutionResult.patient) {
            await widget.sessionManager.setAuthenticatedUser(
              token: token,
              user: user,
            );
            if (mounted) {
              setState(() => _isLoading = false);
              widget.onLoginSuccess();
            }
          } else {
            // Reject non-patient accounts
            setState(() => _isLoading = false);
            final guidance = destination == RoleResolutionResult.webOnly
                ? strings.webOnlyRoleMessage
                : strings.proAccountGuidance;
            await _showErrorDialog(
              title: strings.unauthorizedRoleMessage,
              message: guidance,
            );
          }
        } else {
          setState(() => _isLoading = false);
          await _showErrorDialog(
            title: strings.authenticationFailedTitle,
            message: strings.invalidCredentials,
          );
        }
      case ApiFailure(:final exception):
        setState(() => _isLoading = false);
        final errorMessage = switch (exception) {
          UnauthorizedException() => strings.invalidCredentials,
          NetworkConnectionException() || NetworkTimeoutException() => strings.serverError,
          _ => exception.message.isNotEmpty ? exception.message : strings.invalidCredentials,
        };
        await _showErrorDialog(
          title: strings.authenticationFailedTitle,
          message: errorMessage,
        );
    }
  }

  Future<void> _handleRegister() async {
    if (_isLoading) return;

    final strings = LocalizedStrings.of(context);
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    // Client-side validation
    if (name.isEmpty || phone.isEmpty || email.isEmpty || password.isEmpty || confirmPassword.isEmpty) {
      await _showErrorDialog(
        title: strings.registrationFailedTitle,
        message: strings.fieldRequired,
      );
      return;
    }

    if (name.length < 2) {
      await _showErrorDialog(
        title: strings.registrationFailedTitle,
        message: strings.fullNameLabel,
      );
      return;
    }

    if (phone.length < 9) {
      await _showErrorDialog(
        title: strings.registrationFailedTitle,
        message: strings.invalidPhone,
      );
      return;
    }

    if (!_validateEmail(email)) {
      await _showErrorDialog(
        title: strings.registrationFailedTitle,
        message: strings.invalidEmail,
      );
      return;
    }

    if (password.length < 8) {
      await _showErrorDialog(
        title: strings.registrationFailedTitle,
        message: strings.passwordTooShort,
      );
      return;
    }

    if (password != confirmPassword) {
      await _showErrorDialog(
        title: strings.registrationFailedTitle,
        message: strings.passwordsDoNotMatch,
      );
      return;
    }

    setState(() => _isLoading = true);

    // Registration is a non-idempotent mutation: allowRetry is strictly false
    final result = await widget.apiClient.post(
      ApiEndpoints.register,
      body: {
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
      },
      requiresAuth: false,
      allowRetry: false,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        final payload = data['data'];
        if (payload is Map<String, dynamic> && payload['token'] != null) {
          final token = payload['token'].toString();
          final userJson = payload['user'] as Map<String, dynamic>? ?? {};
          final user = User.fromJson(userJson);

          // Role Boundary Verification
          final destination = const RoleResolver().resolvePatientDestination(user);
          if (destination == RoleResolutionResult.patient) {
            await widget.sessionManager.setAuthenticatedUser(
              token: token,
              user: user,
            );
            if (mounted) {
              setState(() => _isLoading = false);
              widget.onLoginSuccess();
            }
          } else {
            setState(() => _isLoading = false);
            await _showErrorDialog(
              title: strings.unauthorizedRoleMessage,
              message: strings.proAccountGuidance,
            );
          }
        } else {
          setState(() => _isLoading = false);
          await _showErrorDialog(
            title: strings.registrationFailedTitle,
            message: strings.serverError,
          );
        }
      case ApiFailure(:final exception):
        setState(() => _isLoading = false);
        final errorMessage = switch (exception) {
          NetworkConnectionException() || NetworkTimeoutException() => strings.serverError,
          ValidationException() => exception.message.isNotEmpty ? exception.message : strings.serverError,
          _ => exception.message.isNotEmpty ? exception.message : strings.serverError,
        };
        await _showErrorDialog(
          title: strings.registrationFailedTitle,
          message: errorMessage,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final activeLocale = widget.currentLocale ?? Localizations.localeOf(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.patientAppTitle,
        actions: widget.onLocaleChanged != null
            ? [
                PopupMenuButton<Locale>(
                  icon: const Icon(Icons.language_rounded, color: AafiyaColors.healthBlue),
                  tooltip: strings.language,
                  initialValue: activeLocale,
                  onSelected: widget.onLocaleChanged,
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: const Locale('ar'),
                      child: Text(strings.languageArabic),
                    ),
                    PopupMenuItem(
                      value: const Locale('en'),
                      child: Text(strings.languageEnglish),
                    ),
                    PopupMenuItem(
                      value: const Locale('fr'),
                      child: Text(strings.languageFrench),
                    ),
                  ],
                ),
              ]
            : null,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: AafiyaSpacing.insetScreen,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: AafiyaCard(
                padding: AafiyaSpacing.insetAllXl,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Mode Toggle (Login / Register)
                    SegmentedButton<AuthMode>(
                      segments: [
                        ButtonSegment(
                          value: AuthMode.login,
                          label: Text(strings.signIn),
                          icon: const Icon(Icons.login_rounded),
                        ),
                        ButtonSegment(
                          value: AuthMode.register,
                          label: Text(strings.signUp),
                          icon: const Icon(Icons.person_add_rounded),
                        ),
                      ],
                      selected: {_mode},
                      onSelectionChanged: _isLoading
                          ? null
                          : (selected) {
                              if (selected.isNotEmpty) {
                                setState(() => _mode = selected.first);
                              }
                            },
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _mode == AuthMode.login ? strings.signIn : strings.signUp,
                      style: AafiyaTypography.headlineMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      strings.brandGatewaySlogan,
                      style: AafiyaTypography.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),

                    // Registration-only fields
                    if (_mode == AuthMode.register) ...[
                      AafiyaTextField(
                        label: strings.fullNameLabel,
                        controller: _nameController,
                        hintText: 'فاطمة بن علي',
                        prefixIcon: const Icon(Icons.person_outline),
                        enabled: !_isLoading,
                      ),
                      const SizedBox(height: 16),
                      AafiyaTextField(
                        label: strings.phoneLabel,
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        hintText: '0555123456',
                        prefixIcon: const Icon(Icons.phone_outlined),
                        enabled: !_isLoading,
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Common fields
                    AafiyaTextField(
                      label: strings.emailLabel,
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      hintText: 'patient@example.dz',
                      prefixIcon: const Icon(Icons.email_outlined),
                      enabled: !_isLoading,
                    ),
                    const SizedBox(height: 16),
                    AafiyaTextField(
                      label: strings.passwordLabel,
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      prefixIcon: const Icon(Icons.lock_outline),
                      enabled: !_isLoading,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                        ),
                        tooltip: _obscurePassword ? strings.showPassword : strings.hidePassword,
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),

                    // Registration confirmation password
                    if (_mode == AuthMode.register) ...[
                      const SizedBox(height: 16),
                      AafiyaTextField(
                        label: strings.confirmPasswordLabel,
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirmPassword,
                        prefixIcon: const Icon(Icons.lock_outline),
                        enabled: !_isLoading,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureConfirmPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          ),
                          tooltip: _obscureConfirmPassword ? strings.showPassword : strings.hidePassword,
                          onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Submit Button
                    AafiyaButton(
                      label: _mode == AuthMode.login ? strings.signIn : strings.signUp,
                      isLoading: _isLoading,
                      onPressed: _isLoading
                          ? null
                          : (_mode == AuthMode.login ? _handleLogin : _handleRegister),
                    ),

                    const SizedBox(height: 16),

                    // Switch Mode Prompt
                    TextButton(
                      onPressed: _isLoading
                          ? null
                          : () {
                              setState(() {
                                _mode = _mode == AuthMode.login ? AuthMode.register : AuthMode.login;
                              });
                            },
                      child: Text(
                        _mode == AuthMode.login ? strings.dontHaveAccount : strings.alreadyHaveAccount,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.healthBlue,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

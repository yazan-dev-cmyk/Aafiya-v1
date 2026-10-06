import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Professional Authentication Shell for AAFIYA Pro.
class ProAuthShell extends StatefulWidget {
  const ProAuthShell({
    super.key,
    required this.sessionManager,
    required this.apiClient,
    required this.onLoginSuccess,
    this.onLocaleChanged,
    this.currentLocale,
  });

  final AuthSessionManager sessionManager;
  final ApiClient apiClient;
  final VoidCallback onLoginSuccess;
  final ValueChanged<Locale>? onLocaleChanged;
  final Locale? currentLocale;

  @override
  State<ProAuthShell> createState() => _ProAuthShellState();
}

class _ProAuthShellState extends State<ProAuthShell> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Please provide both email and password.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.apiClient.post(
      ApiEndpoints.login,
      body: {
        'email': email,
        'password': password,
        'device_name': 'aafiya_pro_mobile',
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

          await widget.sessionManager.setAuthenticatedUser(
            token: token,
            user: user,
          );

          if (mounted) {
            setState(() {
              _isLoading = false;
            });
            widget.onLoginSuccess();
          }
        } else {
          setState(() {
            _errorMessage = 'Invalid response received from server.';
            _isLoading = false;
          });
        }
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
    final activeLocale = widget.currentLocale ?? Localizations.localeOf(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.proAppTitle,
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
              constraints: const BoxConstraints(maxWidth: 400),
              child: AafiyaCard(
                padding: AafiyaSpacing.insetAllXl,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      strings.proAppTitle,
                      style: AafiyaTypography.headlineMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      strings.brandGatewaySlogan,
                      style: AafiyaTypography.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    if (_errorMessage != null) ...[
                      Container(
                        padding: AafiyaSpacing.insetAllSm,
                        decoration: BoxDecoration(
                          color: AafiyaColors.error.withValues(alpha: 0.1),
                          borderRadius: AafiyaRadius.borderMd,
                          border: Border.all(color: AafiyaColors.error),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: AafiyaTypography.bodyMedium.copyWith(color: AafiyaColors.error),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    AafiyaTextField(
                      label: strings.emailLabel,
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      hintText: 'doctor@example.dz',
                      prefixIcon: const Icon(Icons.email_outlined),
                    ),
                    const SizedBox(height: 16),
                    AafiyaTextField(
                      label: strings.passwordLabel,
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                        ),
                        tooltip: _obscurePassword ? strings.showPassword : strings.hidePassword,
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    const SizedBox(height: 24),
                    AafiyaButton(
                      label: strings.signIn,
                      isLoading: _isLoading,
                      onPressed: _isLoading ? null : _handleLogin,
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

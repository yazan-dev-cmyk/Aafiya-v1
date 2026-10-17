import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_core/models/patient_share_token.dart';
import 'package:aafiya_core/services/patient_share_service.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/patient_share_record_dialog.dart';

/// Screen displaying active and historical encrypted medical-record shares for the patient.
///
/// Features:
/// - Fetches real shares list from `GET /api/v1/patients/share-tokens`.
/// - Differentiates statuses: active, revoked, expired, and locked.
/// - Immediate revocation with confirmation dialog (`DELETE /api/v1/patients/share-tokens/{id}`).
/// - Creation trigger for new shares via [PatientShareRecordDialog].
/// - Zero persistent storage or credential logging.
class PatientSharedRecordsScreen extends StatefulWidget {
  const PatientSharedRecordsScreen({
    super.key,
    required this.apiClient,
    this.service,
  });

  final ApiClient apiClient;
  final PatientShareService? service;

  static Future<void> show(
    BuildContext context, {
    required ApiClient apiClient,
    PatientShareService? service,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PatientSharedRecordsScreen(
          apiClient: apiClient,
          service: service,
        ),
      ),
    );
  }

  @override
  State<PatientSharedRecordsScreen> createState() => _PatientSharedRecordsScreenState();
}

class _PatientSharedRecordsScreenState extends State<PatientSharedRecordsScreen> {
  late final PatientShareService _service;
  bool _isLoading = false;
  String? _errorMessage;
  List<PatientShareToken> _shares = const [];
  String? _revokingId;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? PatientShareService(widget.apiClient);
    _fetchShares();
  }

  Future<void> _fetchShares() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _service.getMyShares();

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _shares = data;
          _isLoading = false;
        });

      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message;
          _isLoading = false;
        });
    }
  }

  Future<void> _openCreateDialog() async {
    final newShare = await PatientShareRecordDialog.show(
      context,
      apiClient: widget.apiClient,
      service: _service,
    );

    if (newShare != null && mounted) {
      _fetchShares();
    }
  }

  Future<void> _confirmRevoke(PatientShareToken share) async {
    final strings = LocalizedStrings.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(strings.revokeShareConfirmTitle),
        content: Text(strings.revokeShareConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AafiyaColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(strings.revokeShare, style: const TextStyle(color: AafiyaColors.pureWhite)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await _executeRevoke(share.id);
    }
  }

  Future<void> _executeRevoke(String shareId) async {
    final strings = LocalizedStrings.of(context);

    setState(() {
      _revokingId = shareId;
    });

    final result = await _service.revokeShare(shareId);

    if (!mounted) return;

    setState(() {
      _revokingId = null;
    });

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _shares = _shares.map((s) => s.id == shareId ? data : s).toList();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.shareRevokedSuccess),
            backgroundColor: AafiyaColors.success,
          ),
        );

      case ApiFailure(:final exception):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exception.message),
            backgroundColor: AafiyaColors.error,
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.activeSharesTitle,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: strings.retry,
            onPressed: _isLoading ? null : _fetchShares,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AafiyaColors.healthBlue,
        icon: const Icon(Icons.add_link_rounded, color: AafiyaColors.pureWhite),
        label: Text(strings.createNewShare, style: const TextStyle(color: AafiyaColors.pureWhite)),
        onPressed: _openCreateDialog,
      ),
      body: _buildBody(context, strings),
    );
  }

  Widget _buildBody(BuildContext context, LocalizedStrings strings) {
    if (_isLoading && _shares.isEmpty) {
      return Center(
        child: AafiyaLoadingView(message: strings.loading),
      );
    }

    if (_errorMessage != null && _shares.isEmpty) {
      return Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, size: 48, color: AafiyaColors.error),
              const SizedBox(height: 12),
              Text(_errorMessage!, textAlign: TextAlign.center, style: AafiyaTypography.bodyMedium),
              const SizedBox(height: 16),
              AafiyaButton(
                label: strings.retry,
                onPressed: _fetchShares,
              ),
            ],
          ),
        ),
      );
    }

    if (_shares.isEmpty) {
      return Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.folder_shared_outlined, size: 64, color: AafiyaColors.secondaryText),
              const SizedBox(height: 16),
              Text(
                strings.noActiveSharesMessage,
                textAlign: TextAlign.center,
                style: AafiyaTypography.bodyLarge.copyWith(color: AafiyaColors.secondaryText),
              ),
              const SizedBox(height: 24),
              AafiyaButton(
                label: strings.createNewShare,
                onPressed: _openCreateDialog,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchShares,
      child: ListView.separated(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 88),
        itemCount: _shares.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final share = _shares[index];
          return _buildShareCard(context, strings, share);
        },
      ),
    );
  }

  Widget _buildShareCard(
    BuildContext context,
    LocalizedStrings strings,
    PatientShareToken share,
  ) {
    final isRevoking = _revokingId == share.id;

    final (statusLabel, statusColor, statusBg) = switch (share.status.toLowerCase()) {
      'active' => share.isExpired
          ? (strings.statusExpired, AafiyaColors.secondaryText, AafiyaColors.lightBackground)
          : (strings.statusActive, AafiyaColors.success, AafiyaColors.healingGreenSurface),
      'revoked' => (strings.statusRevoked, AafiyaColors.error, AafiyaColors.error.withValues(alpha: 0.1)),
      'locked' => (strings.statusLocked, AafiyaColors.warning, AafiyaColors.warning.withValues(alpha: 0.15)),
      'expired' => (strings.statusExpired, AafiyaColors.secondaryText, AafiyaColors.lightBackground),
      _ => (share.status, AafiyaColors.secondaryText, AafiyaColors.lightBackground),
    };

    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  statusLabel,
                  style: AafiyaTypography.labelSmall.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Scope: ${share.scope}',
                style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
              ),
              const Spacer(),
              if (share.accessCount > 0) ...[
                const Icon(Icons.visibility_outlined, size: 16, color: AafiyaColors.secondaryText),
                const SizedBox(width: 4),
                Text(
                  '${share.accessCount}',
                  style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.access_time_rounded, size: 16, color: AafiyaColors.secondaryText),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  '${strings.expiresOn} ${share.expiresAt.toLocal().toString().split('.').first}',
                  style: AafiyaTypography.bodySmall,
                ),
              ),
            ],
          ),
          if (share.isActive) ...[
            const SizedBox(height: 12),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: isRevoking
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : TextButton.icon(
                      style: TextButton.styleFrom(
                        foregroundColor: AafiyaColors.error,
                      ),
                      icon: const Icon(Icons.link_off_rounded, size: 18),
                      label: Text(strings.revokeShare),
                      onPressed: () => _confirmRevoke(share),
                    ),
            ),
          ],
        ],
      ),
    );
  }
}

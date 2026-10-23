import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Clinic Escalations Management Screen.
///
/// Displays SLA-expired unread notifications requiring staff telephone follow-up.
/// Strictly enforces:
/// 1. Authoritative clinic isolation: requests scoped with active `X-Clinic-ID`.
/// 2. Fail-closed 401/403 handling: immediately purges in-memory patient data.
/// 3. In-flight stale discard: drops responses from obsolete clinic contexts.
/// 4. Built-in Clipboard phone copying without external url_launcher dependencies.
class ClinicEscalationsScreen extends StatefulWidget {
  const ClinicEscalationsScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.service,
    this.apiClient,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final ClinicNotificationService? service;
  final ApiClient? apiClient;

  static Route<void> route({
    required AuthSessionManager sessionManager,
    required User user,
    ClinicNotificationService? service,
    ApiClient? apiClient,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => ClinicEscalationsScreen(
        sessionManager: sessionManager,
        user: user,
        service: service,
        apiClient: apiClient,
      ),
    );
  }

  @override
  State<ClinicEscalationsScreen> createState() =>
      _ClinicEscalationsScreenState();
}

class _ClinicEscalationsScreenState extends State<ClinicEscalationsScreen> {
  late final ClinicNotificationService _service;
  final ScrollController _scrollController = ScrollController();

  List<ClinicEscalation> _items = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _errorMessage;

  int _currentPage = 1;
  bool _hasMore = false;
  String? _lastLoadedClinicId;
  final Set<String> _inFlightAcks = <String>{};
  int _requestGeneration = 0;
  int? _lastSessionGeneration;

  @override
  void initState() {
    super.initState();
    _service = widget.service ??
        ClinicNotificationService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );
    _lastLoadedClinicId = widget.sessionManager.activeClinicId;
    _lastSessionGeneration = widget.sessionManager.sessionGeneration;

    _scrollController.addListener(_onScroll);
    widget.sessionManager.addListener(_onSessionChanged);
    _loadData();
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onSessionChanged);
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onSessionChanged() {
    final currentClinicId = widget.sessionManager.activeClinicId;
    final currentGen = widget.sessionManager.sessionGeneration;

    if (!widget.sessionManager.isAuthenticated) {
      if (mounted) {
        setState(() {
          _items = [];
          _isLoading = false;
          _errorMessage = null;
          _lastLoadedClinicId = null;
          _lastSessionGeneration = currentGen;
          _currentPage = 1;
          _hasMore = false;
          _inFlightAcks.clear();
        });
      }
      return;
    }

    if (currentClinicId != _lastLoadedClinicId ||
        currentGen != _lastSessionGeneration) {
      // Clear previous clinic data immediately to avoid stale leakage
      setState(() {
        _items = [];
        _errorMessage = null;
        _isLoading = true;
        _currentPage = 1;
        _hasMore = false;
        _inFlightAcks.clear();
      });
      _lastLoadedClinicId = currentClinicId;
      _lastSessionGeneration = currentGen;
      if (currentClinicId != null && currentClinicId.isNotEmpty) {
        _loadData();
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = LocalizedStrings.of(context).activeClinicRequired;
        });
      }
    }
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    if (currentScroll >= maxScroll - 200 &&
        _hasMore &&
        !_isLoadingMore &&
        !_isLoading) {
      _loadMore();
    }
  }

  Future<void> _loadData({bool isRefresh = false}) async {
    final activeClinicId = widget.sessionManager.activeClinicId;
    if (activeClinicId == null || activeClinicId.isEmpty) {
      setState(() {
        _isLoading = false;
        _errorMessage = LocalizedStrings.of(context).activeClinicRequired;
        _items = [];
      });
      return;
    }

    if (!isRefresh) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    final targetClinicId = activeClinicId;
    final sessionGen = widget.sessionManager.sessionGeneration;
    final requestGen = ++_requestGeneration;

    final result =
        await _service.fetchEscalations(status: 'all', page: 1, perPage: 20);

    if (!mounted) return;

    // Discard stale responses if active clinic switched, user session changed, or a newer request was issued
    if (widget.sessionManager.sessionGeneration != sessionGen ||
        widget.sessionManager.activeClinicId != targetClinicId ||
        _requestGeneration != requestGen ||
        !widget.sessionManager.isAuthenticated) {
      return;
    }

    setState(() {
      _isLoading = false;
      _lastLoadedClinicId = targetClinicId;
      _lastSessionGeneration = sessionGen;

      switch (result) {
        case ApiSuccess(:final data):
          _items = List<ClinicEscalation>.from(data.items);
          _currentPage = data.currentPage;
          _hasMore = data.hasMore;
          _errorMessage = null;
        case ApiFailure(:final exception):
          if (exception is ForbiddenException ||
              exception is UnauthorizedException) {
            // Fail closed: immediately purge protected data and block pagination
            _items = [];
            _hasMore = false;
            _errorMessage =
                LocalizedStrings.of(context).queueUnauthorizedMessage;
          } else if (!isRefresh) {
            _items = [];
            _errorMessage = exception.message;
          } else {
            // Ordinary refresh failure: preserve existing list
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(exception.message)),
            );
          }
      }
    });
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore) return;

    final targetClinicId = widget.sessionManager.activeClinicId;
    if (targetClinicId == null || targetClinicId.isEmpty) return;

    setState(() {
      _isLoadingMore = true;
    });

    final sessionGen = widget.sessionManager.sessionGeneration;
    final requestGen = _requestGeneration;
    final nextPage = _currentPage + 1;
    final result = await _service.fetchEscalations(
        status: 'all', page: nextPage, perPage: 20);

    if (!mounted) return;
    if (widget.sessionManager.sessionGeneration != sessionGen ||
        widget.sessionManager.activeClinicId != targetClinicId ||
        _requestGeneration != requestGen ||
        !widget.sessionManager.isAuthenticated) {
      return;
    }

    setState(() {
      _isLoadingMore = false;
      switch (result) {
        case ApiSuccess(:final data):
          final existingIds = _items.map((e) => e.id).toSet();
          final newItems = data.items.where((e) => !existingIds.contains(e.id));
          _items.addAll(newItems);
          _currentPage = data.currentPage;
          _hasMore = data.hasMore;
        case ApiFailure(:final exception):
          if (exception is ForbiddenException ||
              exception is UnauthorizedException) {
            _items = [];
            _hasMore = false;
            _errorMessage =
                LocalizedStrings.of(context).queueUnauthorizedMessage;
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(exception.message)),
            );
          }
      }
    });
  }

  Future<void> _acknowledge(ClinicEscalation escalation) async {
    final id = escalation.id;
    if (_inFlightAcks.contains(id) || escalation.isAcknowledged) return;

    final strings = LocalizedStrings.of(context);

    // Confirmation dialog before queue closure
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(strings.escalationConfirmTitle),
        content: Text(strings.escalationConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.primaryBlue,
              foregroundColor: Colors.white,
            ),
            child: Text(strings.escalationConfirmAction),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final targetClinicId = widget.sessionManager.activeClinicId;
    final sessionGen = widget.sessionManager.sessionGeneration;

    setState(() {
      _inFlightAcks.add(id);
    });

    final result = await _service.acknowledgeEscalation(id);

    if (!mounted) return;
    if (widget.sessionManager.sessionGeneration != sessionGen ||
        widget.sessionManager.activeClinicId != targetClinicId ||
        !widget.sessionManager.isAuthenticated) {
      return;
    }

    setState(() {
      _inFlightAcks.remove(id);

      switch (result) {
        case ApiSuccess(:final data):
          // Reconcile against server-returned record
          final index = _items.indexWhere((e) => e.id == id);
          if (index != -1) {
            _items[index] = data;
          }
        case ApiFailure(:final exception):
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                exception.message.isNotEmpty
                    ? exception.message
                    : strings.errorAcknowledgingEscalation,
              ),
              backgroundColor: AafiyaColors.error,
            ),
          );
      }
    });
  }

  void _copyPhone(String phone) {
    if (phone.isEmpty) return;
    Clipboard.setData(ClipboardData(text: phone));
    final strings = LocalizedStrings.of(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(strings.patientPhoneCopied),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      backgroundColor: AafiyaColors.scaffoldBg,
      appBar: AafiyaAppBar(
        title: strings.clinicEscalationsTitle,
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadData(isRefresh: true),
        child: _buildBody(strings),
      ),
    );
  }

  Widget _buildBody(LocalizedStrings strings) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: _errorMessage!,
            onRetry: _loadData,
          ),
        ),
      );
    }

    if (_items.isEmpty) {
      return Center(
        child: Padding(
          padding: AafiyaSpacing.insetScreen,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.check_circle_outline_rounded,
                size: 64,
                color: AafiyaColors.success,
              ),
              const SizedBox(height: AafiyaSpacing.md),
              Text(
                strings.noClinicEscalations,
                style: AafiyaTypography.titleMedium.copyWith(
                  color: AafiyaColors.secondaryText,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AafiyaSpacing.insetScreen,
      itemCount: _items.length + (_hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= _items.length) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: CircularProgressIndicator(),
            ),
          );
        }

        final item = _items[index];
        return _buildEscalationCard(item, strings);
      },
    );
  }

  Widget _buildEscalationCard(ClinicEscalation item, LocalizedStrings strings) {
    final isInFlight = _inFlightAcks.contains(item.id);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: AafiyaCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.patientName,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.primaryText,
                    ),
                  ),
                ),
                if (item.isAcknowledged)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AafiyaColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      strings.notificationAcknowledgedStatus,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.success,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )
                else
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AafiyaColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'SLA 24h',
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.error,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12.0),
            // Patient phone outreach bar with built-in clipboard copying
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AafiyaColors.lightBackground,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.phone_outlined,
                      size: 18, color: AafiyaColors.primaryBlue),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Text(
                      item.patientPhone.isNotEmpty ? item.patientPhone : '—',
                      style: AafiyaTypography.bodyMedium.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AafiyaColors.primaryText,
                      ),
                    ),
                  ),
                  if (item.patientPhone.isNotEmpty)
                    TextButton.icon(
                      onPressed: () => _copyPhone(item.patientPhone),
                      icon: const Icon(Icons.copy_rounded, size: 16),
                      label: Text(strings.copyPhoneAction),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12.0),
            Text(
              item.instruction,
              style: AafiyaTypography.bodyMedium.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
            if (item.originalDate != null || item.newDate != null) ...[
              const SizedBox(height: 12.0),
              Container(
                padding: const EdgeInsets.all(12.0),
                decoration: BoxDecoration(
                  color: AafiyaColors.lightBackground,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (item.originalDate != null)
                      _buildDetailRow(
                        Icons.event_busy_outlined,
                        '${strings.originalAppointmentLabel}: ${item.originalDate!} ${item.originalTimeSlot ?? ''}'
                            .trim(),
                      ),
                    if (item.newDate != null)
                      _buildDetailRow(
                        Icons.event_available_outlined,
                        '${strings.proposedAppointmentLabel}: ${item.newDate!} ${item.newSlot ?? ''}'
                            .trim(),
                      ),
                    _buildDetailRow(
                      Icons.person_outline_rounded,
                      item.doctorName,
                    ),
                  ],
                ),
              ),
            ],
            if (item.isAcknowledged && item.acknowledgedAt != null) ...[
              const SizedBox(height: 12.0),
              Text(
                '${strings.escalationAcknowledgedStatusPrefix} ${_formatDate(item.acknowledgedAt!)}',
                style: AafiyaTypography.bodySmall.copyWith(
                  color: AafiyaColors.secondaryText,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
            if (!item.isAcknowledged) ...[
              const SizedBox(height: AafiyaSpacing.md),
              Align(
                alignment: Alignment.centerLeft,
                child: AafiyaButton(
                  label: strings.escalationAcknowledgeAction,
                  icon: isInFlight
                      ? null
                      : const Icon(Icons.check_circle_outline_rounded,
                          size: 18),
                  variant: AafiyaButtonVariant.primary,
                  onPressed: isInFlight ? null : () => _acknowledge(item),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AafiyaColors.secondaryText),
          const SizedBox(width: AafiyaSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: AafiyaTypography.bodySmall.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

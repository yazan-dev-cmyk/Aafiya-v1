import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Patient Notifications Screen.
///
/// Displays in-app notices (e.g., reschedule notices, appointment cancellations).
/// Allows patient to acknowledge receipt with server reconciliation.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    required this.sessionManager,
    required this.apiClient,
    this.service,
    this.onNotificationAcknowledged,
  });

  final AuthSessionManager sessionManager;
  final ApiClient apiClient;
  final PatientNotificationService? service;
  final void Function(String id)? onNotificationAcknowledged;

  static Route<void> route({
    required AuthSessionManager sessionManager,
    required ApiClient apiClient,
    PatientNotificationService? service,
    void Function(String id)? onNotificationAcknowledged,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => NotificationsScreen(
        sessionManager: sessionManager,
        apiClient: apiClient,
        service: service,
        onNotificationAcknowledged: onNotificationAcknowledged,
      ),
    );
  }

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final PatientNotificationService _service;
  final ScrollController _scrollController = ScrollController();

  List<PatientNotification> _items = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _errorMessage;

  int _currentPage = 1;
  bool _hasMore = false;
  final Set<String> _inFlightAcks = <String>{};
  int _requestGeneration = 0;
  int? _lastSessionGeneration;

  @override
  void initState() {
    super.initState();
    _service = widget.service ??
        PatientNotificationService(apiClient: widget.apiClient);
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
    final currentGen = widget.sessionManager.sessionGeneration;
    if (!widget.sessionManager.isAuthenticated) {
      if (mounted) {
        setState(() {
          _items = [];
          _isLoading = false;
          _errorMessage = null;
          _lastSessionGeneration = currentGen;
          _currentPage = 1;
          _hasMore = false;
          _inFlightAcks.clear();
        });
      }
      return;
    }

    if (currentGen != _lastSessionGeneration) {
      _lastSessionGeneration = currentGen;
      setState(() {
        _items = [];
        _errorMessage = null;
        _isLoading = true;
        _currentPage = 1;
        _hasMore = false;
        _inFlightAcks.clear();
      });
      _loadData();
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
    if (!widget.sessionManager.isAuthenticated) {
      setState(() {
        _items = [];
        _isLoading = false;
      });
      return;
    }

    if (!isRefresh) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    final sessionGen = widget.sessionManager.sessionGeneration;
    final requestGen = ++_requestGeneration;

    final result = await _service.fetchNotifications(page: 1);

    if (!mounted) return;
    if (widget.sessionManager.sessionGeneration != sessionGen ||
        _requestGeneration != requestGen ||
        !widget.sessionManager.isAuthenticated) {
      return;
    }

    setState(() {
      _isLoading = false;
      _lastSessionGeneration = sessionGen;
      switch (result) {
        case ApiSuccess(:final data):
          _items = List<PatientNotification>.from(data.items);
          _currentPage = data.currentPage;
          _hasMore = data.hasMore;
          _errorMessage = null;
        case ApiFailure(:final exception):
          if (!isRefresh) {
            _errorMessage = exception.message;
            _items = [];
          } else {
            // Ordinary refresh failure: preserve existing list and notify via snackbar
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(exception.message)),
            );
          }
      }
    });
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore) return;
    if (!widget.sessionManager.isAuthenticated) return;

    final sessionGen = widget.sessionManager.sessionGeneration;
    final requestGen = _requestGeneration;

    setState(() {
      _isLoadingMore = true;
    });

    final nextPage = _currentPage + 1;
    final result = await _service.fetchNotifications(page: nextPage);

    if (!mounted) return;
    if (widget.sessionManager.sessionGeneration != sessionGen ||
        _requestGeneration != requestGen ||
        !widget.sessionManager.isAuthenticated) {
      return;
    }

    setState(() {
      _isLoadingMore = false;
      switch (result) {
        case ApiSuccess(:final data):
          // Append while preventing duplicates
          final existingIds = _items.map((e) => e.id).toSet();
          final newItems = data.items.where((e) => !existingIds.contains(e.id));
          _items.addAll(newItems);
          _currentPage = data.currentPage;
          _hasMore = data.hasMore;
        case ApiFailure(:final exception):
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(exception.message)),
          );
      }
    });
  }

  Future<void> _acknowledge(PatientNotification notification) async {
    final id = notification.id;
    if (_inFlightAcks.contains(id) || notification.isAcknowledged) return;

    final sessionGen = widget.sessionManager.sessionGeneration;

    setState(() {
      _inFlightAcks.add(id);
    });

    final result = await _service.acknowledgeNotification(id);

    if (!mounted) return;
    if (widget.sessionManager.sessionGeneration != sessionGen ||
        !widget.sessionManager.isAuthenticated) {
      return;
    }

    setState(() {
      _inFlightAcks.remove(id);

      switch (result) {
        case ApiSuccess(:final data):
          // Server reconciliation: update item using server-confirmed record
          final index = _items.indexWhere((e) => e.id == id);
          if (index != -1) {
            _items[index] = data;
          }
          widget.onNotificationAcknowledged?.call(id);
        case ApiFailure(:final exception):
          // Do not mark acknowledged locally; inform user and restore action
          final strings = LocalizedStrings.of(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                exception.message.isNotEmpty
                    ? exception.message
                    : strings.errorAcknowledgingNotification,
              ),
              backgroundColor: AafiyaColors.error,
            ),
          );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      backgroundColor: AafiyaColors.scaffoldBg,
      appBar: AafiyaAppBar(
        title: strings.patientNotificationsTitle,
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
                Icons.notifications_none_rounded,
                size: 64,
                color: AafiyaColors.secondaryText,
              ),
              const SizedBox(height: AafiyaSpacing.md),
              Text(
                strings.noPatientNotifications,
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
        return _buildNotificationCard(item, strings);
      },
    );
  }

  Widget _buildNotificationCard(
      PatientNotification item, LocalizedStrings strings) {
    final isInFlight = _inFlightAcks.contains(item.id);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: AafiyaCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  item.isAcknowledged
                      ? Icons.mark_email_read_outlined
                      : Icons.mark_email_unread_rounded,
                  color: item.isAcknowledged
                      ? AafiyaColors.secondaryText
                      : AafiyaColors.primaryBlue,
                  size: 22,
                ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _formatDate(item.createdAt),
                    style: AafiyaTypography.bodySmall.copyWith(
                      color: AafiyaColors.secondaryText,
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
                  ),
              ],
            ),
            const SizedBox(height: 12.0),
            Text(
              item.message,
              style: AafiyaTypography.bodyMedium.copyWith(
                fontWeight:
                    item.isAcknowledged ? FontWeight.normal : FontWeight.w600,
                color: AafiyaColors.primaryText,
              ),
            ),
            if (item.newDate != null ||
                item.clinicName != null ||
                item.bookingReference != null) ...[
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
                    if (item.clinicName != null)
                      _buildDetailRow(
                          Icons.local_hospital_outlined, item.clinicName!),
                    if (item.newDate != null)
                      _buildDetailRow(
                        Icons.calendar_today_outlined,
                        '${item.newDate!} ${item.newSlot ?? ''}'.trim(),
                      ),
                    if (item.bookingReference != null)
                      _buildDetailRow(Icons.confirmation_number_outlined,
                          item.bookingReference!),
                  ],
                ),
              ),
            ],
            if (!item.isAcknowledged) ...[
              const SizedBox(height: AafiyaSpacing.md),
              Align(
                alignment: Alignment.centerLeft,
                child: AafiyaButton(
                  label: isInFlight
                      ? strings.acknowledgingReceiptAction
                      : strings.acknowledgeReceiptAction,
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

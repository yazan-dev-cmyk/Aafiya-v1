import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// AAFIYA Pro — Urgent Unresolved Reschedules Dashboard.
///
/// Shared read-only screen for Doctor and Doctor Assistant roles (DEC-VAC-06 / Option B).
///
/// Displays appointments displaced by doctor vacations that could not be automatically
/// relocated within the 7-calendar-day horizon. Staff uses this screen to follow up
/// via telephone outreach without charging the patient additional fees.
///
/// Strictly enforces:
/// 1. Zero clinical or booking mutations (read-only coordination view).
/// 2. Privacy & Phone masking: Displays masked indicator if `patient_phone == null`.
/// 3. Immediate stale-clinic clearing upon switching active clinic context.
class UnresolvedReschedulesScreen extends StatefulWidget {
  const UnresolvedReschedulesScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.service,
    this.apiClient,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final ClinicRescheduleDashboardService? service;
  final ApiClient? apiClient;

  static Route<void> route({
    required AuthSessionManager sessionManager,
    required User user,
    ClinicRescheduleDashboardService? service,
    ApiClient? apiClient,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => UnresolvedReschedulesScreen(
        sessionManager: sessionManager,
        user: user,
        service: service,
        apiClient: apiClient,
      ),
    );
  }

  @override
  State<UnresolvedReschedulesScreen> createState() =>
      _UnresolvedReschedulesScreenState();
}

class _UnresolvedReschedulesScreenState
    extends State<UnresolvedReschedulesScreen> {
  late final ClinicRescheduleDashboardService _service;
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  List<UnresolvedRescheduleItem> _items = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _errorMessage;

  int _currentPage = 1;
  bool _hasMore = false;
  String? _lastLoadedClinicId;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _service = widget.service ??
        ClinicRescheduleDashboardService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );

    _scrollController.addListener(_onScroll);
    widget.sessionManager.addListener(_onSessionChanged);
    _loadData();
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onSessionChanged);
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onSessionChanged() {
    final currentClinicId = widget.sessionManager.activeClinicId;
    if (currentClinicId != _lastLoadedClinicId) {
      // Clear previous clinic data immediately to avoid stale leakage
      setState(() {
        _items = [];
        _errorMessage = null;
        _isLoading = true;
        _currentPage = 1;
        _hasMore = false;
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
    final result =
        await _service.fetchUnresolvedAppointments(page: 1, perPage: 20);

    if (!mounted) return;

    // Discard stale responses if active clinic switched while request was in-flight
    if (widget.sessionManager.activeClinicId != targetClinicId) return;

    setState(() {
      _isLoading = false;
      _lastLoadedClinicId = targetClinicId;
      switch (result) {
        case ApiSuccess(:final data):
          _items = List<UnresolvedRescheduleItem>.from(data.items);
          _currentPage = data.currentPage;
          _hasMore = data.hasMore;
          _errorMessage = null;
        case ApiFailure(:final exception):
          _errorMessage = exception.message;
          if (!isRefresh) {
            _items = [];
          }
      }
    });
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore) return;

    final targetClinicId = widget.sessionManager.activeClinicId;
    if (targetClinicId == null) return;

    setState(() {
      _isLoadingMore = true;
    });

    final nextPage = _currentPage + 1;
    final result =
        await _service.fetchUnresolvedAppointments(page: nextPage, perPage: 20);

    if (!mounted) return;
    if (widget.sessionManager.activeClinicId != targetClinicId) return;

    setState(() {
      _isLoadingMore = false;
      switch (result) {
        case ApiSuccess(:final data):
          _items.addAll(data.items);
          _currentPage = data.currentPage;
          _hasMore = data.hasMore;
        case ApiFailure():
          // Preserve already loaded items on pagination error
          break;
      }
    });
  }

  List<UnresolvedRescheduleItem> get _filteredItems {
    final q = _searchQuery.trim().toLowerCase();
    if (q.isEmpty) return _items;

    return _items.where((item) {
      final orig = item.originalAppointment;
      final patientName = orig?.patientName?.toLowerCase() ?? '';
      final mrn = orig?.patientMrn?.toLowerCase() ?? '';
      final ref = orig?.bookingReference?.toLowerCase() ?? '';
      final docName = orig?.doctorName?.toLowerCase() ?? '';
      return patientName.contains(q) ||
          mrn.contains(q) ||
          ref.contains(q) ||
          docName.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final isArabic = strings.isArabic;
    final filtered = _filteredItems;

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.unresolvedReschedulesTitle,
        showBrandMark: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: strings.retry,
            onPressed: _isLoading ? null : () => _loadData(isRefresh: true),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadData(isRefresh: true),
        child: ListView(
          controller: _scrollController,
          padding: AafiyaSpacing.insetScreen,
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            // Top Explanatory Banner (Option B Policy)
            _buildExplanationBanner(strings),
            const SizedBox(height: AafiyaSpacing.md),

            // Main Container Card
            AafiyaCard(
              padding: AafiyaSpacing.insetAllMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Title and Cases Count Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AafiyaColors.error.withValues(alpha: 0.1),
                              borderRadius:
                                  BorderRadius.circular(AafiyaRadius.sm),
                            ),
                            child: const Icon(
                              Icons.warning_amber_rounded,
                              color: AafiyaColors.error,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                strings.unresolvedCasesCount,
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AafiyaColors.primaryText,
                                ),
                              ),
                              Text(
                                '${_items.length} ${isArabic ? "حالة مسجلة" : "registered cases"}',
                                style: AafiyaTypography.caption.copyWith(
                                  color: AafiyaColors.secondaryText,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AafiyaColors.error.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: AafiyaColors.error.withValues(alpha: 0.2)),
                        ),
                        child: Text(
                          '${_items.length}',
                          style: AafiyaTypography.caption.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AafiyaSpacing.md),

                  // Search Bar
                  TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    decoration: InputDecoration(
                      hintText: strings.searchUnresolvedPlaceholder,
                      hintStyle: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                      ),
                      prefixIcon: const Icon(Icons.search,
                          size: 20, color: AafiyaColors.secondaryText),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: AafiyaColors.lightBackground,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AafiyaRadius.md),
                        borderSide:
                            const BorderSide(color: AafiyaColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AafiyaRadius.md),
                        borderSide:
                            const BorderSide(color: AafiyaColors.border),
                      ),
                    ),
                  ),
                  const SizedBox(height: AafiyaSpacing.md),

                  // Content States
                  if (_isLoading && _items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (_errorMessage != null && _items.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: AafiyaErrorView(
                        title: strings.errorTitle,
                        message: _errorMessage!,
                        onRetry: () => _loadData(),
                        retryLabel: strings.retry,
                      ),
                    )
                  else if (filtered.isEmpty)
                    _buildEmptyState(strings)
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: filtered.length + (_hasMore ? 1 : 0),
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: AafiyaSpacing.sm),
                      itemBuilder: (context, index) {
                        if (index == filtered.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                                child:
                                    CircularProgressIndicator(strokeWidth: 2)),
                          );
                        }
                        return _buildCaseCard(filtered[index], strings);
                      },
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExplanationBanner(LocalizedStrings strings) {
    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.shield_outlined,
            color: AafiyaColors.error,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.unresolvedReschedulesBannerTitle,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.error,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  strings.unresolvedReschedulesBannerDesc,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.primaryText,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(LocalizedStrings strings) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AafiyaColors.healingGreen.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        border:
            Border.all(color: AafiyaColors.healingGreen.withValues(alpha: 0.2)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.check_circle_outline,
            size: 44,
            color: AafiyaColors.healingGreen,
          ),
          const SizedBox(height: 10),
          Text(
            strings.noUnresolvedCasesTitle,
            style: AafiyaTypography.titleMedium.copyWith(
              fontWeight: FontWeight.bold,
              color: AafiyaColors.healingGreen,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            strings.noUnresolvedCasesDesc,
            style: AafiyaTypography.caption.copyWith(
              color: AafiyaColors.secondaryText,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildCaseCard(
      UnresolvedRescheduleItem item, LocalizedStrings strings) {
    final orig = item.originalAppointment;
    final hasPhone = orig?.hasPhone == true;
    final phone = orig?.patientPhone;

    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        border: Border.all(color: AafiyaColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Status Badge + Reference + Patient Name
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AafiyaColors.error.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  border: Border.all(
                      color: AafiyaColors.error.withValues(alpha: 0.2)),
                ),
                child: Text(
                  strings.urgentUnresolvedBadge,
                  style: AafiyaTypography.caption.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.error,
                    fontSize: 10,
                  ),
                ),
              ),
              if (orig?.bookingReference != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AafiyaColors.lightBackground,
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                  ),
                  child: Text(
                    orig!.bookingReference!,
                    style: AafiyaTypography.caption.copyWith(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w600,
                      color: AafiyaColors.secondaryText,
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),

          // Patient Name & MRN
          Text(
            orig?.patientName ?? strings.unnamedPatient,
            style: AafiyaTypography.titleMedium.copyWith(
              fontWeight: FontWeight.bold,
              color: AafiyaColors.primaryText,
            ),
          ),
          if (orig?.patientMrn != null && orig!.patientMrn!.isNotEmpty)
            Text(
              '${strings.mrnLabel}: ${orig.patientMrn}',
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.secondaryText,
                fontFamily: 'monospace',
              ),
            ),
          const SizedBox(height: 10),

          // Original Appointment Date, Time Slot, and Doctor
          Row(
            children: [
              const Icon(Icons.event_outlined,
                  size: 14, color: AafiyaColors.secondaryText),
              const SizedBox(width: 4),
              Text(
                '${strings.originalDateLabel} ${orig?.appointmentDate ?? "—"}',
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AafiyaColors.primaryText,
                ),
              ),
              if (orig?.timeSlot != null) ...[
                const SizedBox(width: 10),
                const Icon(Icons.access_time,
                    size: 14, color: AafiyaColors.secondaryText),
                const SizedBox(width: 4),
                Text(
                  orig!.timeSlot!,
                  style: AafiyaTypography.caption.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AafiyaColors.primaryText,
                  ),
                ),
              ],
            ],
          ),
          if (orig?.doctorName != null && orig!.doctorName!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.person_outline,
                    size: 14, color: AafiyaColors.healthBlue),
                const SizedBox(width: 4),
                Text(
                  orig.doctorName!,
                  style: AafiyaTypography.caption.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AafiyaColors.healthBlue,
                  ),
                ),
              ],
            ),
          ],

          // Failure Reason if logged
          if (item.failureReason != null && item.failureReason!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AafiyaColors.error.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(AafiyaRadius.sm),
              ),
              child: Text(
                '${strings.failureReasonLabel} ${item.failureReason!}',
                style: AafiyaTypography.caption.copyWith(
                  color: AafiyaColors.error,
                  fontSize: 11,
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),

          // Phone Contact / Masking Row
          if (hasPhone && phone != null)
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: AafiyaColors.lightBackground,
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                      border: Border.all(color: AafiyaColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.phone_outlined,
                            size: 16, color: AafiyaColors.healingGreen),
                        const SizedBox(width: 8),
                        Text(
                          phone,
                          style: AafiyaTypography.bodyMedium.copyWith(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.bold,
                            color: AafiyaColors.primaryText,
                          ),
                          textDirection: TextDirection.ltr,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: phone));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(strings.copyPhoneSuccess),
                        behavior: SnackBarBehavior.floating,
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                  icon: const Icon(Icons.copy_rounded, size: 16),
                  label: Text(strings.copyPhoneAction),
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    foregroundColor: AafiyaColors.healthBlue,
                    side: const BorderSide(color: AafiyaColors.healthBlue),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    ),
                  ),
                ),
              ],
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AafiyaColors.lightBackground,
                borderRadius: BorderRadius.circular(AafiyaRadius.sm),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.lock_outline,
                    size: 16,
                    color: AafiyaColors.secondaryText.withValues(alpha: 0.7),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      strings.phoneMaskedTitle,
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

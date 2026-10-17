import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import '../widgets/register_vacation_sheet.dart';
import 'unresolved_reschedules_screen.dart';

/// Doctor Vacations Screen.
///
/// Implements full Flutter ↔ Web parity for Doctor Vacations (TASK-PAR-DOC-04):
/// - Lists effective and cancelled vacations with pagination.
/// - Immediate registration without Director approval (DEC-VAC-01, DEC-AUTH-01).
/// - 7-calendar-day auto-rescheduling horizon (DEC-VAC-02).
/// - Logical cancellation only; physical deletion strictly prohibited (DEC-VAC-05).
/// - Seamless direct bridge to Unresolved Reschedules Dashboard (DEC-VAC-06).
class DoctorVacationsScreen extends StatefulWidget {
  const DoctorVacationsScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.service,
    this.apiClient,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final DoctorVacationService? service;
  final ApiClient? apiClient;

  static Route<void> route({
    required AuthSessionManager sessionManager,
    required User user,
    DoctorVacationService? service,
    ApiClient? apiClient,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => DoctorVacationsScreen(
        sessionManager: sessionManager,
        user: user,
        service: service,
        apiClient: apiClient,
      ),
    );
  }

  @override
  State<DoctorVacationsScreen> createState() => _DoctorVacationsScreenState();
}

class _DoctorVacationsScreenState extends State<DoctorVacationsScreen> {
  late final DoctorVacationService _service;
  final ScrollController _scrollController = ScrollController();

  List<DoctorVacation> _vacations = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _currentPage = 1;
  int _lastPage = 1;
  String? _errorMessage;
  String? _cancellingVacationId;

  @override
  void initState() {
    super.initState();
    _service = widget.service ??
        DoctorVacationService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );

    _scrollController.addListener(_onScroll);
    _loadVacations();
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        !_isLoading &&
        _currentPage < _lastPage) {
      _loadMoreVacations();
    }
  }

  Future<void> _loadVacations({bool isRefresh = false}) async {
    setState(() {
      _isLoading = !isRefresh;
      _errorMessage = null;
    });

    final result = await _service.fetchVacations(
      page: 1,
      perPage: 15,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _vacations = data.items;
          _currentPage = data.currentPage;
          _lastPage = data.lastPage;
          _isLoading = false;
        });
      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message;
          _isLoading = false;
        });
    }
  }

  Future<void> _loadMoreVacations() async {
    if (_isLoadingMore || _currentPage >= _lastPage) return;

    setState(() {
      _isLoadingMore = true;
    });

    final nextPage = _currentPage + 1;
    final result = await _service.fetchVacations(
      page: nextPage,
      perPage: 15,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _vacations = [..._vacations, ...data.items];
          _currentPage = data.currentPage;
          _lastPage = data.lastPage;
          _isLoadingMore = false;
        });
      case ApiFailure():
        setState(() {
          _isLoadingMore = false;
        });
    }
  }

  Future<void> _confirmCancelVacation(DoctorVacation vacation) async {
    final strings = LocalizedStrings.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(strings.cancelVacationConfirmTitle),
        content: Text(strings.cancelVacationConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(strings.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AafiyaColors.error,
              foregroundColor: AafiyaColors.pureWhite,
            ),
            child: Text(strings.cancelVacationAction),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _cancelVacation(vacation);
    }
  }

  Future<void> _cancelVacation(DoctorVacation vacation) async {
    final strings = LocalizedStrings.of(context);
    setState(() {
      _cancellingVacationId = vacation.id;
    });

    final result = await _service.cancelVacation(vacation.id);

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _cancellingVacationId = null;
          _vacations = _vacations.map((v) {
            if (v.id == vacation.id) {
              return data;
            }
            return v;
          }).toList();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.vacationCancelledSuccess),
            backgroundColor: AafiyaColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      case ApiFailure(:final exception):
        setState(() {
          _cancellingVacationId = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exception.message),
            backgroundColor: AafiyaColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }

  void _openRegisterSheet() {
    RegisterVacationSheet.show(
      context,
      vacationService: _service,
      authorizedClinics: widget.sessionManager.authorizedClinics,
      onVacationRegistered: () => _loadVacations(isRefresh: true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.doctorVacationsTitle,
        actions: [
          IconButton(
            icon: const Icon(Icons.assignment_late_outlined),
            tooltip: strings.unresolvedReschedulesTitle,
            onPressed: () {
              Navigator.of(context).push(
                UnresolvedReschedulesScreen.route(
                  sessionManager: widget.sessionManager,
                  user: widget.user,
                  apiClient: widget.apiClient,
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: strings.retry,
            onPressed: _isLoading ? null : () => _loadVacations(isRefresh: true),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openRegisterSheet,
        backgroundColor: AafiyaColors.primaryBlue,
        foregroundColor: AafiyaColors.pureWhite,
        icon: const Icon(Icons.add_rounded),
        label: Text(strings.registerVacationAction),
      ),
      body: _buildBody(context, strings),
    );
  }

  Widget _buildBody(BuildContext context, LocalizedStrings strings) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: AafiyaErrorView(
          title: strings.errorTitle,
          message: _errorMessage!,
          onRetry: () => _loadVacations(isRefresh: true),
          retryLabel: strings.retry,
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadVacations(isRefresh: true),
      child: CustomScrollView(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // Header Policy & Bridge Banner
          SliverToBoxAdapter(
            child: Padding(
              padding: AafiyaSpacing.insetScreen,
              child: _buildPolicyBridgeBanner(context, strings),
            ),
          ),

          // Vacation List or Empty State
          if (_vacations.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: AafiyaSpacing.insetScreen,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.event_available_outlined,
                        size: 64,
                        color: AafiyaColors.secondaryText,
                      ),
                      const SizedBox(height: AafiyaSpacing.md),
                      Text(
                        strings.noVacationsRegistered,
                        style: AafiyaTypography.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AafiyaSpacing.sm),
                      Text(
                        strings.doctorVacationsSubtitle,
                        style: AafiyaTypography.bodySmall.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AafiyaSpacing.lg),
                      AafiyaButton(
                        label: strings.registerVacationAction,
                        onPressed: _openRegisterSheet,
                      ),
                    ],
                  ),
                ),
              ),
            )
          else ...[
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final vacation = _vacations[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildVacationCard(context, strings, vacation),
                    );
                  },
                  childCount: _vacations.length,
                ),
              ),
            ),
            if (_isLoadingMore)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: CircularProgressIndicator(),
                  ),
                ),
              ),
            const SliverToBoxAdapter(
              child: SizedBox(height: 80), // Fab padding
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPolicyBridgeBanner(
    BuildContext context,
    LocalizedStrings strings,
  ) {
    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.lightBackground,
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        border: Border.all(color: AafiyaColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.calendar_month_outlined,
                color: AafiyaColors.primaryBlue,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  strings.doctorVacationsSubtitle,
                  style: AafiyaTypography.bodySmall.copyWith(
                    color: AafiyaColors.primaryText,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            strings.vacationImmediateEffectNotice,
            style: AafiyaTypography.caption.copyWith(
              color: AafiyaColors.secondaryText,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 10),
          InkWell(
            onTap: () {
              Navigator.of(context).push(
                UnresolvedReschedulesScreen.route(
                  sessionManager: widget.sessionManager,
                  user: widget.user,
                  apiClient: widget.apiClient,
                ),
              );
            },
            borderRadius: BorderRadius.circular(AafiyaRadius.sm),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AafiyaColors.warning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AafiyaRadius.sm),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.assignment_late_outlined,
                    size: 16,
                    color: AafiyaColors.warning,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    strings.viewUnresolvedReschedulesForVacation,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.warning,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 12,
                    color: AafiyaColors.warning,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVacationCard(
    BuildContext context,
    LocalizedStrings strings,
    DoctorVacation vacation,
  ) {
    final isEffective = vacation.isEffective;
    final isCancelling = _cancellingVacationId == vacation.id;

    return AafiyaCard(
      borderColor: isEffective ? AafiyaColors.primaryBlue : AafiyaColors.border,
      padding: AafiyaSpacing.insetAllMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Dates Range + Status Badge
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isEffective
                      ? AafiyaColors.primaryBlue.withValues(alpha: 0.1)
                      : AafiyaColors.lightBackground,
                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                ),
                child: Icon(
                  Icons.event_outlined,
                  size: 24,
                  color: isEffective
                      ? AafiyaColors.primaryBlue
                      : AafiyaColors.secondaryText,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${vacation.vacationStart}  →  ${vacation.vacationEnd}',
                      style: AafiyaTypography.bodyMedium.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'ID: ${vacation.id.length > 8 ? vacation.id.substring(0, 8) : vacation.id}',
                      style: AafiyaTypography.caption.copyWith(
                        color: AafiyaColors.secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
              _buildStatusBadge(strings, vacation),
            ],
          ),

          // Reason
          if (vacation.reason != null && vacation.reason!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${strings.vacationReason}: ',
                  style: AafiyaTypography.caption.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
                Expanded(
                  child: Text(
                    vacation.reason!,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                ),
              ],
            ),
          ],

          // Notes
          if (vacation.notes != null && vacation.notes!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${strings.vacationNotes}: ',
                  style: AafiyaTypography.caption.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.primaryText,
                  ),
                ),
                Expanded(
                  child: Text(
                    vacation.notes!,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                ),
              ],
            ),
          ],

          // Clinics covered
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Icon(
                Icons.location_city_outlined,
                size: 16,
                color: AafiyaColors.secondaryText,
              ),
              const SizedBox(width: 6),
              Text(
                '${strings.affectedClinicsLabel}:',
                style: AafiyaTypography.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AafiyaColors.primaryText,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: vacation.clinics.isEmpty
                    ? Text(
                        strings.selectAllClinics,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                          fontStyle: FontStyle.italic,
                        ),
                      )
                    : Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: vacation.clinics.map((c) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AafiyaColors.lightBackground,
                              borderRadius:
                                  BorderRadius.circular(AafiyaRadius.sm),
                              border: Border.all(color: AafiyaColors.border),
                            ),
                            child: Text(
                              c.name ?? c.id,
                              style: AafiyaTypography.caption.copyWith(
                                fontSize: 11,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ],
          ),

          // Actions Row (Cancel action if effective)
          if (isEffective) ...[
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (isCancelling)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                else
                  TextButton.icon(
                    icon: const Icon(
                      Icons.cancel_outlined,
                      size: 18,
                      color: AafiyaColors.error,
                    ),
                    label: Text(
                      strings.cancelVacationAction,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.error,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    onPressed: () => _confirmCancelVacation(vacation),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusBadge(LocalizedStrings strings, DoctorVacation vacation) {
    if (vacation.isEffective) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: AafiyaColors.success.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(AafiyaRadius.sm),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle_outline_rounded,
              size: 14,
              color: AafiyaColors.success,
            ),
            const SizedBox(width: 4),
            Text(
              strings.vacationEffectiveBadge,
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.success,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AafiyaColors.secondaryText.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.cancel_rounded,
            size: 14,
            color: AafiyaColors.secondaryText,
          ),
          const SizedBox(width: 4),
          Text(
            strings.vacationCancelledBadge,
            style: AafiyaTypography.caption.copyWith(
              color: AafiyaColors.secondaryText,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

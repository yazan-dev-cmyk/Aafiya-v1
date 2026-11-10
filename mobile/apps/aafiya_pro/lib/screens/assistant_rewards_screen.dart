import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// AAFIYA Pro — Doctor Assistant Financial Rewards Screen (TASK-ASSISTANT-REWARDS-P1-UI).
///
/// Features:
/// 1. Authoritative financial summary & 5 KPI balances.
/// 2. Payout eligibility indicator (10,000 DZD threshold & active RIP requirement).
/// 3. Double-entry chronological ledger transactions.
/// 4. Monthly payout batch history & transfer references.
/// 5. Algérie Poste CCP / RIP profile management & submission.
class AssistantRewardsScreen extends StatefulWidget {
  const AssistantRewardsScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.service,
    this.apiClient,
    this.filePickerCallback,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final AssistantRewardsService? service;
  final ApiClient? apiClient;
  final Future<({Uint8List bytes, String name})?> Function()? filePickerCallback;

  static Route<void> route({
    required AuthSessionManager sessionManager,
    required User user,
    AssistantRewardsService? service,
    ApiClient? apiClient,
    Future<({Uint8List bytes, String name})?> Function()? filePickerCallback,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => AssistantRewardsScreen(
        sessionManager: sessionManager,
        user: user,
        service: service,
        apiClient: apiClient,
        filePickerCallback: filePickerCallback,
      ),
    );
  }

  @override
  State<AssistantRewardsScreen> createState() => _AssistantRewardsScreenState();
}

class _AssistantRewardsScreenState extends State<AssistantRewardsScreen>
    with SingleTickerProviderStateMixin {
  late final AssistantRewardsService _service;
  late final TabController _tabController;

  AssistantRewardSummary? _summary;
  List<AssistantRewardTransaction> _transactions = [];
  List<AssistantPayoutItem> _payouts = [];
  List<AssistantPayoutProfile> _profiles = [];

  bool _isLoadingSummary = true;
  bool _isLoadingTransactions = false;
  bool _isLoadingPayouts = false;
  bool _isLoadingProfiles = false;
  String? _errorMessage;

  // New Profile Form
  final _formKey = GlobalKey<FormState>();
  final _ripController = TextEditingController();
  bool _isSubmittingProfile = false;
  Uint8List? _selectedChequeBytes;
  String? _selectedChequeFileName;
  int? _selectedChequeSize;

  @override
  void initState() {
    super.initState();
    _service = widget.service ??
        AssistantRewardsService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );

    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);

    _loadInitialData();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _ripController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    if (_tabController.index == 0 && _transactions.isEmpty) {
      _loadTransactions();
    } else if (_tabController.index == 1 && _payouts.isEmpty) {
      _loadPayouts();
    } else if (_tabController.index == 2 && _profiles.isEmpty) {
      _loadProfiles();
    }
  }

  Future<void> _loadInitialData() async {
    setState(() {
      _isLoadingSummary = true;
      _errorMessage = null;
    });

    final summaryResult = await _service.getSummary();
    if (!mounted) return;

    switch (summaryResult) {
      case ApiSuccess(:final data):
        setState(() {
          _summary = data;
          _isLoadingSummary = false;
        });
        _loadTransactions();
        _loadProfiles();
      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message;
          _isLoadingSummary = false;
        });
    }
  }

  Future<void> _loadTransactions() async {
    setState(() => _isLoadingTransactions = true);
    final res = await _service.getTransactions(page: 1, perPage: 30);
    if (!mounted) return;
    switch (res) {
      case ApiSuccess(:final data):
        setState(() {
          _transactions = data;
          _isLoadingTransactions = false;
        });
      case ApiFailure():
        setState(() => _isLoadingTransactions = false);
    }
  }

  Future<void> _loadPayouts() async {
    setState(() => _isLoadingPayouts = true);
    final res = await _service.getPayouts(page: 1, perPage: 30);
    if (!mounted) return;
    switch (res) {
      case ApiSuccess(:final data):
        setState(() {
          _payouts = data;
          _isLoadingPayouts = false;
        });
      case ApiFailure():
        setState(() => _isLoadingPayouts = false);
    }
  }

  Future<void> _loadProfiles() async {
    setState(() => _isLoadingProfiles = true);
    final res = await _service.getProfiles();
    if (!mounted) return;
    switch (res) {
      case ApiSuccess(:final data):
        setState(() {
          _profiles = data;
          _isLoadingProfiles = false;
        });
      case ApiFailure():
        setState(() => _isLoadingProfiles = false);
    }
  }

  Future<void> _pickChequeDocument(LocalizedStrings strings) async {
    try {
      Uint8List? bytes;
      String? fileName;

      if (widget.filePickerCallback != null) {
        final result = await widget.filePickerCallback!();
        if (result != null) {
          bytes = result.bytes;
          fileName = result.name;
        }
      } else {
        final picker = ImagePicker();
        final XFile? file = await picker.pickImage(
          source: ImageSource.gallery,
          maxWidth: 2400,
          maxHeight: 2400,
          imageQuality: 90,
        );
        if (file != null) {
          bytes = await file.readAsBytes();
          fileName = file.name;
        }
      }

      if (bytes != null && fileName != null) {
        final Uint8List pickedBytes = bytes;
        final String pickedFileName = fileName;
        if (pickedBytes.length > 5 * 1024 * 1024) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(strings.assistantRewardsFileTooLarge),
              backgroundColor: AafiyaColors.error,
            ),
          );
          return;
        }

        final lowerName = pickedFileName.toLowerCase();
        final isValidExt = lowerName.endsWith('.jpg') ||
            lowerName.endsWith('.jpeg') ||
            lowerName.endsWith('.png') ||
            lowerName.endsWith('.pdf');

        if (!isValidExt) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(strings.assistantRewardsFileInvalidType),
              backgroundColor: AafiyaColors.error,
            ),
          );
          return;
        }

        setState(() {
          _selectedChequeBytes = pickedBytes;
          _selectedChequeFileName = pickedFileName;
          _selectedChequeSize = pickedBytes.length;
        });
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error selecting document: $e'),
          backgroundColor: AafiyaColors.error,
        ),
      );
    }
  }

  Future<void> _submitProfile(LocalizedStrings strings) async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedChequeBytes == null || _selectedChequeFileName == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(strings.assistantRewardsSelectCheque)),
      );
      return;
    }

    setState(() => _isSubmittingProfile = true);

    final res = await _service.submitProfile(
      ripNumber: _ripController.text.trim(),
      chequeBytes: _selectedChequeBytes!,
      chequeFileName: _selectedChequeFileName!,
    );

    if (!mounted) return;
    setState(() => _isSubmittingProfile = false);

    switch (res) {
      case ApiSuccess():
        _ripController.clear();
        setState(() {
          _selectedChequeBytes = null;
          _selectedChequeFileName = null;
          _selectedChequeSize = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.assistantRewardsSuccessSubmitted),
            backgroundColor: AafiyaColors.actionGreen,
          ),
        );
        _loadProfiles();
        _loadInitialData();
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
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.assistantRewardsTitle,
        showBrandMark: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              _loadInitialData();
              if (_tabController.index == 1) _loadPayouts();
              if (_tabController.index == 2) _loadProfiles();
            },
          ),
        ],
      ),
      body: _isLoadingSummary
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: AafiyaColors.error),
                        const SizedBox(height: 12),
                        Text(_errorMessage!,
                            textAlign: TextAlign.center,
                            style: AafiyaTypography.bodyMedium),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size(120, 48),
                          ),
                          onPressed: _loadInitialData,
                          child: Text(strings.retry),
                        ),
                      ],
                    ),
                  ),
                )
              : NestedScrollView(
                  headerSliverBuilder: (context, innerBoxIsScrolled) => [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Eligibility Status Banner
                            _buildEligibilityCard(strings, theme),
                            const SizedBox(height: 12),
                            // 5 KPI Balances Carousel / Grid
                            _buildKpiMetrics(strings, theme),
                          ],
                        ),
                      ),
                    ),
                    SliverPersistentHeader(
                      pinned: true,
                      delegate: _SliverAppBarDelegate(
                        TabBar(
                          controller: _tabController,
                          labelColor: AafiyaColors.healthBlue,
                          unselectedLabelColor: AafiyaColors.secondaryText,
                          indicatorColor: AafiyaColors.healthBlue,
                          tabs: [
                            Tab(
                              icon: const Icon(Icons.account_balance_wallet_outlined),
                              text: strings.assistantRewardsTabOverview,
                            ),
                            Tab(
                              icon: const Icon(Icons.receipt_long_outlined),
                              text: strings.assistantRewardsTabPayouts,
                            ),
                            Tab(
                              icon: const Icon(Icons.credit_card_outlined),
                              text: strings.assistantRewardsTabProfile,
                            ),
                          ],
                        ),
                        theme.scaffoldBackgroundColor,
                      ),
                    ),
                  ],
                  body: TabBarView(
                    controller: _tabController,
                    children: [
                      // Tab 1: Ledger
                      _buildLedgerTab(strings, theme),
                      // Tab 2: Payouts
                      _buildPayoutsTab(strings, theme),
                      // Tab 3: RIP Profile
                      _buildProfileTab(strings, theme),
                    ],
                  ),
                ),
    );
  }

  Widget _buildEligibilityCard(LocalizedStrings strings, ThemeData theme) {
    if (_summary == null) return const SizedBox.shrink();

    final threshold = _summary!.payoutThreshold;
    final isThresholdValid = threshold != null && threshold > 0;
    final isEligible = _summary!.isEligibleForPayout && isThresholdValid;
    final hasProfile = _summary!.activeProfile != null;

    final badgeColor = isEligible
        ? AafiyaColors.statusConfirmedBg
        : AafiyaColors.statusPendingBg;
    final borderColor = isEligible
        ? AafiyaColors.statusConfirmedBorder
        : AafiyaColors.border;
    final textColor = isEligible
        ? AafiyaColors.statusConfirmedInk
        : AafiyaColors.statusPendingInk;

    final String statusMessage;
    if (!isThresholdValid) {
      statusMessage = strings.payoutThresholdUnavailable;
      debugPrint(
          '[AAFIYA_REWARDS] Payout threshold is unavailable or invalid from backend contract: $threshold');
    } else if (isEligible) {
      statusMessage = strings.assistantRewardsEligible;
    } else if (_summary!.ineligibilityReason ==
        'pending_profile_verification') {
      statusMessage = strings.assistantRewardsPayoutSuspendedPending;
    } else if (_summary!.ineligibilityReason == 'profile_rejected') {
      statusMessage = strings.assistantRewardsPayoutSuspendedRejected;
    } else if (!hasProfile) {
      statusMessage = strings.assistantRewardsMissingProfile;
    } else {
      statusMessage = strings.assistantRewardsThresholdNotMet;
    }

    final String amountText = isThresholdValid
        ? '${_summary!.currentBalance.toStringAsFixed(2)} / ${threshold.toStringAsFixed(2)} ${strings.currencyDzd}'
        : '${strings.assistantRewardsCurrentBalance}: ${_summary!.currentBalance.toStringAsFixed(2)} ${strings.currencyDzd} • ${strings.payoutThresholdUnavailable}';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: badgeColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(
            isEligible
                ? Icons.check_circle_rounded
                : Icons.info_outline_rounded,
            color: textColor,
            size: 26,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statusMessage,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  amountText,
                  style: AafiyaTypography.caption.copyWith(
                    fontSize: 11,
                    color: textColor.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiMetrics(LocalizedStrings strings, ThemeData theme) {
    if (_summary == null) return const SizedBox.shrink();

    final kpis = [
      _KpiData(
        label: strings.assistantRewardsCurrentBalance,
        value:
            '${_summary!.currentBalance.toStringAsFixed(2)} ${strings.currencyDzd}',
        color: AafiyaColors.healthBlue,
        icon: Icons.account_balance_wallet,
      ),
      _KpiData(
        label: strings.assistantRewardsTotalEarned,
        value:
            '${_summary!.totalEarned.toStringAsFixed(2)} ${strings.currencyDzd}',
        color: AafiyaColors.success,
        icon: Icons.trending_up,
      ),
      _KpiData(
        label: strings.assistantRewardsTotalPaid,
        value:
            '${_summary!.totalPaid.toStringAsFixed(2)} ${strings.currencyDzd}',
        color: AafiyaColors.primaryText,
        icon: Icons.payment,
      ),
      _KpiData(
        label: strings.assistantRewardsPendingPayout,
        value:
            '${_summary!.pendingPayout.toStringAsFixed(2)} ${strings.currencyDzd}',
        color: AafiyaColors.warning,
        icon: Icons.hourglass_top,
      ),
      _KpiData(
        label: strings.assistantRewardsDeductions,
        value:
            '${(_summary!.totalDeducted + _summary!.totalReversed).toStringAsFixed(2)} ${strings.currencyDzd}',
        color: AafiyaColors.error,
        icon: Icons.money_off,
      ),
    ];

    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: kpis.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = kpis[index];
          return AafiyaCard(
            padding: const EdgeInsets.all(10),
            child: SizedBox(
              width: 120,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          item.label,
                          style: AafiyaTypography.caption.copyWith(
                            fontSize: 10,
                            color: AafiyaColors.secondaryText,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Icon(item.icon, size: 14, color: item.color),
                    ],
                  ),
                  Text(
                    item.value,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: item.color,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLedgerTab(LocalizedStrings strings, ThemeData theme) {
    if (_isLoadingTransactions && _transactions.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_transactions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.receipt_outlined,
                  size: 48, color: AafiyaColors.secondaryText),
              const SizedBox(height: 12),
              Text(
                strings.assistantRewardsNoTransactions,
                textAlign: TextAlign.center,
                style: AafiyaTypography.bodyMedium
                    .copyWith(color: AafiyaColors.secondaryText),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTransactions,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _transactions.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final tx = _transactions[index];
          final isCredit = tx.isCredit;

          return AafiyaCard(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: isCredit
                    ? AafiyaColors.statusConfirmedBg
                    : AafiyaColors.statusUrgentBg,
                child: Icon(
                  isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                  color: isCredit
                      ? AafiyaColors.success
                      : AafiyaColors.error,
                  size: 18,
                ),
              ),
              title: Text(
                tx.transactionType,
                style: AafiyaTypography.titleMedium.copyWith(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Text(
                '${tx.sourceType} #${tx.sourceId.length > 8 ? tx.sourceId.substring(0, 8) : tx.sourceId} • ${tx.createdAt}',
                style: AafiyaTypography.caption.copyWith(
                  fontSize: 10,
                  color: AafiyaColors.secondaryText,
                ),
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${isCredit ? '+' : '-'}${tx.amount.toStringAsFixed(2)} ${strings.currencyDzd}',
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isCredit
                          ? AafiyaColors.success
                          : AafiyaColors.error,
                    ),
                  ),
                  Text(
                    'Bal: ${tx.balanceAfter.toStringAsFixed(2)}',
                    style: AafiyaTypography.caption.copyWith(
                      fontSize: 10,
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPayoutsTab(LocalizedStrings strings, ThemeData theme) {
    if (_isLoadingPayouts && _payouts.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_payouts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.payments_outlined,
                  size: 48, color: AafiyaColors.secondaryText),
              const SizedBox(height: 12),
              Text(
                strings.assistantRewardsNoPayouts,
                textAlign: TextAlign.center,
                style: AafiyaTypography.bodyMedium
                    .copyWith(color: AafiyaColors.secondaryText),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadPayouts,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _payouts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final item = _payouts[index];

          Color statusColor = AafiyaColors.warning;
          if (item.isPaid) statusColor = AafiyaColors.success;
          if (item.isFailed) statusColor = AafiyaColors.error;

          return AafiyaCard(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: statusColor.withValues(alpha: 0.1),
                child:
                    Icon(Icons.account_balance, color: statusColor, size: 18),
              ),
              title: Text(
                '${item.amount.toStringAsFixed(2)} ${strings.currencyDzd}',
                style: AafiyaTypography.titleMedium.copyWith(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Text(
                'Batch: ${item.batchNumber ?? item.batchId.substring(0, 8)}\nRef: ${item.transferReference ?? '—'}',
                style: AafiyaTypography.caption.copyWith(
                  fontSize: 11,
                  color: AafiyaColors.secondaryText,
                ),
              ),
              isThreeLine: true,
              trailing: Chip(
                label: Text(
                  item.status.toUpperCase(),
                  style: AafiyaTypography.caption.copyWith(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
                backgroundColor: statusColor.withValues(alpha: 0.1),
                side: BorderSide.none,
                padding: EdgeInsets.zero,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProfileTab(LocalizedStrings strings, ThemeData theme) {
    if (_isLoadingProfiles && _profiles.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final activeProfile = _summary?.activeProfile;
    final latestProfile = _profiles.isNotEmpty ? _profiles.first : null;
    final hasPendingProfile = _profiles.any((p) => p.isPending);
    final isLatestRejected = latestProfile != null && latestProfile.isRejected;

    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          _loadProfiles(),
          _loadInitialData(),
        ]);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Rejection Alert (if latest profile was rejected)
            if (isLatestRejected && latestProfile.rejectionReason != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AafiyaColors.statusUrgentBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AafiyaColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.error_outline,
                            color: AafiyaColors.error, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${strings.assistantRewardsRejectionAlertTitle} (v${latestProfile.version})',
                            style: AafiyaTypography.titleMedium.copyWith(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AafiyaColors.statusUrgentInk,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${strings.assistantRewardsRejectionReasonLabel} ${latestProfile.rejectionReason}',
                      style: AafiyaTypography.bodyMedium.copyWith(
                        fontSize: 12,
                        color: AafiyaColors.statusUrgentInk,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      strings.assistantRewardsRejectionActionHint,
                      style: AafiyaTypography.caption.copyWith(
                        fontSize: 11,
                        color: AafiyaColors.error,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // 2. Pending Verification Banner (if review is pending)
            if (hasPendingProfile) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AafiyaColors.statusPendingBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AafiyaColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.hourglass_top,
                        color: AafiyaColors.warning, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        strings.assistantRewardsPayoutSuspendedPending,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AafiyaColors.statusPendingInk,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // 3. Active Profile Box
            Text(
              strings.assistantRewardsActiveProfile,
              style: AafiyaTypography.titleMedium.copyWith(
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: activeProfile != null
                    ? AafiyaColors.healthBlue.withValues(alpha: 0.08)
                    : AafiyaColors.lightBackground,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: activeProfile != null
                      ? AafiyaColors.healthBlue.withValues(alpha: 0.3)
                      : AafiyaColors.border,
                ),
              ),
              child: activeProfile != null
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Algérie Poste (CCP)',
                              style: AafiyaTypography.caption.copyWith(
                                fontSize: 11,
                                color: AafiyaColors.healthBlue,
                              ),
                            ),
                            Text(
                              'v${activeProfile.version} — ${strings.assistantRewardsStatusActive}',
                              style: AafiyaTypography.caption.copyWith(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AafiyaColors.healthBlue,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          activeProfile.ripNumber,
                          style: AafiyaTypography.titleMedium.copyWith(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.5,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    )
                  : Text(
                      strings.assistantRewardsMissingProfile,
                      style: AafiyaTypography.caption.copyWith(
                        fontSize: 12,
                        color: AafiyaColors.secondaryText,
                      ),
                    ),
            ),
            const SizedBox(height: 24),

            // 4. Version History List
            Text(
              strings.assistantRewardsHistoryTitle,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (_profiles.isEmpty)
              AafiyaCard(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    strings.assistantRewardsNoHistory,
                    style: AafiyaTypography.caption.copyWith(
                      fontSize: 12,
                      color: AafiyaColors.secondaryText,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _profiles.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final p = _profiles[index];

                  Color statusColor = AafiyaColors.secondaryText;
                  String statusLabel = strings.assistantRewardsStatusSuperseded;

                  if (p.isActive) {
                    statusColor = AafiyaColors.success;
                    statusLabel = strings.assistantRewardsStatusActive;
                  } else if (p.isPending) {
                    statusColor = AafiyaColors.warning;
                    statusLabel = strings.assistantRewardsStatusPending;
                  } else if (p.isRejected) {
                    statusColor = AafiyaColors.error;
                    statusLabel = strings.assistantRewardsStatusRejected;
                  }

                  return AafiyaCard(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'v${p.version}',
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  statusLabel,
                                  style: AafiyaTypography.caption.copyWith(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: statusColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            p.ripNumber,
                            style: AafiyaTypography.bodyMedium.copyWith(
                              fontFamily: 'monospace',
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (p.createdAt.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              p.createdAt.length >= 10
                                  ? p.createdAt.substring(0, 10)
                                  : p.createdAt,
                              style: AafiyaTypography.caption.copyWith(
                                fontSize: 10,
                                color: AafiyaColors.secondaryText,
                              ),
                            ),
                          ],
                          if (p.isRejected &&
                              p.rejectionReason != null &&
                              p.rejectionReason!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AafiyaColors.statusUrgentBg,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color:
                                        AafiyaColors.border),
                              ),
                              child: Text(
                                '${strings.assistantRewardsRejectionReasonLabel} ${p.rejectionReason}',
                                style: AafiyaTypography.caption.copyWith(
                                  fontSize: 11,
                                  color: AafiyaColors.error,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            const SizedBox(height: 24),

            // 5. Submit / Update Form
            Text(
              strings.assistantRewardsSubmitNewProfile,
              style: AafiyaTypography.titleMedium.copyWith(
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            AafiyaCard(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _ripController,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(20),
                        ],
                        decoration: InputDecoration(
                          labelText: strings.assistantRewardsRipNumber,
                          hintText: strings.assistantRewardsRipHint,
                          prefixIcon: const Icon(Icons.pin),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().length != 20) {
                            return strings.assistantRewardsInvalidRip;
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // Genuine File Picker Section
                      if (_selectedChequeBytes != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color:
                                AafiyaColors.healthBlue.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: AafiyaColors.healthBlue
                                  .withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle,
                                  color: AafiyaColors.healthBlue, size: 22),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _selectedChequeFileName ?? 'cheque.jpg',
                                      style: AafiyaTypography.titleMedium
                                          .copyWith(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (_selectedChequeSize != null)
                                      Text(
                                        '${(_selectedChequeSize! / 1024).toStringAsFixed(1)} KB',
                                        style:
                                            AafiyaTypography.caption.copyWith(
                                          fontSize: 10,
                                          color: AafiyaColors.secondaryText,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              TextButton(
                                onPressed: _isSubmittingProfile
                                    ? null
                                    : () => _pickChequeDocument(strings),
                                child: Text(
                                  strings.assistantRewardsReplaceFile,
                                  style: AafiyaTypography.caption
                                      .copyWith(fontSize: 11),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ] else ...[
                        OutlinedButton.icon(
                          icon: const Icon(Icons.attach_file),
                          label: Text(strings.assistantRewardsChequeDocLabel),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 48),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          onPressed: _isSubmittingProfile
                              ? null
                              : () => _pickChequeDocument(strings),
                        ),
                      ],
                      const SizedBox(height: 16),

                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(0, 52),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: _isSubmittingProfile
                            ? null
                            : () => _submitProfile(strings),
                        child: _isSubmittingProfile
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(strings.assistantRewardsSubmitButton),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KpiData {
  const _KpiData({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  final String label;
  final String value;
  final Color color;
  final IconData icon;
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  _SliverAppBarDelegate(this._tabBar, this._backgroundColor);

  final TabBar _tabBar;
  final Color _backgroundColor;

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: _backgroundColor,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}

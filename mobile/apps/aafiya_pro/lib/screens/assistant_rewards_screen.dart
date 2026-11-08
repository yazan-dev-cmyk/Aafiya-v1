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
              backgroundColor: Colors.red.shade700,
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
              backgroundColor: Colors.red.shade700,
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
          backgroundColor: Colors.red.shade700,
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
            backgroundColor: Colors.green.shade700,
          ),
        );
        _loadProfiles();
        _loadInitialData();
      case ApiFailure(:final exception):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exception.message),
            backgroundColor: Colors.red.shade700,
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
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
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
                          labelColor: theme.colorScheme.primary,
                          unselectedLabelColor: Colors.grey,
                          indicatorColor: theme.colorScheme.primary,
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

    final isEligible = _summary!.isEligibleForPayout;
    final hasProfile = _summary!.activeProfile != null;

    final badgeColor = isEligible
        ? Colors.green.shade50
        : Colors.amber.shade50;
    final borderColor = isEligible
        ? Colors.green.shade300
        : Colors.amber.shade300;
    final textColor = isEligible
        ? Colors.green.shade900
        : Colors.amber.shade900;

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
            isEligible ? Icons.check_circle_rounded : Icons.info_outline_rounded,
            color: textColor,
            size: 26,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isEligible
                      ? strings.assistantRewardsEligible
                      : _summary!.ineligibilityReason == 'pending_profile_verification'
                          ? strings.assistantRewardsPayoutSuspendedPending
                          : _summary!.ineligibilityReason == 'profile_rejected'
                              ? strings.assistantRewardsPayoutSuspendedRejected
                              : !hasProfile
                                  ? strings.assistantRewardsMissingProfile
                                  : strings.assistantRewardsThresholdNotMet,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_summary!.currentBalance.toStringAsFixed(2)} / ${_summary!.payoutThreshold.toStringAsFixed(2)} ${strings.currencyDzd}',
                  style: TextStyle(fontSize: 11, color: textColor.withValues(alpha: 0.8)),
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
        value: '${_summary!.currentBalance.toStringAsFixed(2)} ${strings.currencyDzd}',
        color: Colors.teal.shade700,
        icon: Icons.account_balance_wallet,
      ),
      _KpiData(
        label: strings.assistantRewardsTotalEarned,
        value: '${_summary!.totalEarned.toStringAsFixed(2)} ${strings.currencyDzd}',
        color: Colors.green.shade700,
        icon: Icons.trending_up,
      ),
      _KpiData(
        label: strings.assistantRewardsTotalPaid,
        value: '${_summary!.totalPaid.toStringAsFixed(2)} ${strings.currencyDzd}',
        color: Colors.blueGrey.shade700,
        icon: Icons.payment,
      ),
      _KpiData(
        label: strings.assistantRewardsPendingPayout,
        value: '${_summary!.pendingPayout.toStringAsFixed(2)} ${strings.currencyDzd}',
        color: Colors.orange.shade800,
        icon: Icons.hourglass_top,
      ),
      _KpiData(
        label: strings.assistantRewardsDeductions,
        value:
            '${(_summary!.totalDeducted + _summary!.totalReversed).toStringAsFixed(2)} ${strings.currencyDzd}',
        color: Colors.red.shade700,
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
          return Container(
            width: 140,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
            ),
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
                        style: const TextStyle(fontSize: 10, color: Colors.grey),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Icon(item.icon, size: 14, color: item.color),
                  ],
                ),
                Text(
                  item.value,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: item.color,
                  ),
                ),
              ],
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
              const Icon(Icons.receipt_outlined, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(strings.assistantRewardsNoTransactions, textAlign: TextAlign.center),
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

          return Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: isCredit ? Colors.green.shade50 : Colors.red.shade50,
                child: Icon(
                  isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                  color: isCredit ? Colors.green.shade700 : Colors.red.shade700,
                  size: 18,
                ),
              ),
              title: Text(
                tx.transactionType,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
              ),
              subtitle: Text(
                '${tx.sourceType} #${tx.sourceId.length > 8 ? tx.sourceId.substring(0, 8) : tx.sourceId} • ${tx.createdAt}',
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${isCredit ? '+' : '-'}${tx.amount.toStringAsFixed(2)} ${strings.currencyDzd}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isCredit ? Colors.green.shade700 : Colors.red.shade700,
                    ),
                  ),
                  Text(
                    'Bal: ${tx.balanceAfter.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
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
              const Icon(Icons.payments_outlined, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(strings.assistantRewardsNoPayouts, textAlign: TextAlign.center),
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

          Color statusColor = Colors.orange;
          if (item.isPaid) statusColor = Colors.green;
          if (item.isFailed) statusColor = Colors.red;

          return Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: statusColor.withValues(alpha: 0.1),
                child: Icon(Icons.account_balance, color: statusColor, size: 18),
              ),
              title: Text(
                '${item.amount.toStringAsFixed(2)} ${strings.currencyDzd}',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              subtitle: Text(
                'Batch: ${item.batchNumber ?? item.batchId.substring(0, 8)}\nRef: ${item.transferReference ?? '—'}',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
              isThreeLine: true,
              trailing: Chip(
                label: Text(
                  item.status.toUpperCase(),
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: statusColor),
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
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${strings.assistantRewardsRejectionAlertTitle} (v${latestProfile.version})',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Colors.red.shade900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${strings.assistantRewardsRejectionReasonLabel} ${latestProfile.rejectionReason}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.red.shade800,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      strings.assistantRewardsRejectionActionHint,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.red.shade700,
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
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Row(
                  children: [
                    Icon(Icons.hourglass_top, color: Colors.amber.shade800, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        strings.assistantRewardsPayoutSuspendedPending,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.amber.shade900,
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
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: activeProfile != null ? Colors.teal.shade50 : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: activeProfile != null ? Colors.teal.shade200 : Colors.grey.shade300,
                ),
              ),
              child: activeProfile != null
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Algérie Poste (CCP)',
                              style: TextStyle(fontSize: 11, color: Colors.teal),
                            ),
                            Text(
                              'v${activeProfile.version} — ${strings.assistantRewardsStatusActive}',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.teal,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          activeProfile.ripNumber,
                          style: const TextStyle(
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
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
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
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    strings.assistantRewardsNoHistory,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
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

                  Color statusColor = Colors.grey;
                  String statusLabel = strings.assistantRewardsStatusSuperseded;

                  if (p.isActive) {
                    statusColor = Colors.green;
                    statusLabel = strings.assistantRewardsStatusActive;
                  } else if (p.isPending) {
                    statusColor = Colors.orange;
                    statusLabel = strings.assistantRewardsStatusPending;
                  } else if (p.isRejected) {
                    statusColor = Colors.red;
                    statusLabel = strings.assistantRewardsStatusRejected;
                  }

                  return Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
                    ),
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
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  statusLabel,
                                  style: TextStyle(
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
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (p.createdAt.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              p.createdAt.length >= 10 ? p.createdAt.substring(0, 10) : p.createdAt,
                              style: const TextStyle(fontSize: 10, color: Colors.grey),
                            ),
                          ],
                          if (p.isRejected && p.rejectionReason != null && p.rejectionReason!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.red.shade100),
                              ),
                              child: Text(
                                '${strings.assistantRewardsRejectionReasonLabel} ${p.rejectionReason}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.red.shade800,
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
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
              ),
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
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
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
                            color: Colors.teal.shade50,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.teal.shade200),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle, color: Colors.teal, size: 22),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _selectedChequeFileName ?? 'cheque.jpg',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (_selectedChequeSize != null)
                                      Text(
                                        '${(_selectedChequeSize! / 1024).toStringAsFixed(1)} KB',
                                        style: const TextStyle(fontSize: 10, color: Colors.grey),
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
                                  style: const TextStyle(fontSize: 11),
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
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: _isSubmittingProfile ? null : () => _submitProfile(strings),
                        child: _isSubmittingProfile
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
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

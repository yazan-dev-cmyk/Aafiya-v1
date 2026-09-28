import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/quota_balance_card.dart';

/// Screen hosting the Booking Center Quota Dashboard, Package Catalog,
/// Purchase Request workflow, Purchase Request History, and Transaction Ledger.
///
/// Strictly conforms to:
/// - Authoritative server quota balance (DISC-06)
/// - Single-seat manager model with ZERO staff management UI (DISC-04)
/// - Trilingual Arabic (RTL), French (LTR), and English (LTR) layout
class BcQuotaScreen extends StatefulWidget {
  const BcQuotaScreen({
    super.key,
    required this.sessionManager,
    this.user,
    this.bookingCenterService,
    this.apiClient,
    this.onBackToDashboard,
  });

  final AuthSessionManager sessionManager;
  final User? user;
  final BookingCenterService? bookingCenterService;
  final ApiClient? apiClient;
  final VoidCallback? onBackToDashboard;

  @override
  State<BcQuotaScreen> createState() => _BcQuotaScreenState();
}

class _BcQuotaScreenState extends State<BcQuotaScreen>
    with SingleTickerProviderStateMixin {
  late final BookingCenterService _service;
  late final TabController _tabController;

  // Quota state
  bool _isLoadingQuota = true;
  String? _quotaError;
  BookingCenterQuota? _quotaData;

  // Packages state
  bool _isLoadingPackages = true;
  String? _packagesError;
  List<BookingPackage> _packages = [];

  // Purchase Requests History state
  bool _isLoadingRequests = true;
  String? _requestsError;
  List<PackagePurchaseRequest> _purchaseRequests = [];

  // Transactions Ledger state
  bool _isLoadingTransactions = true;
  String? _transactionsError;
  List<BookingTransactionItem> _transactions = [];

  // Purchase Dialog state
  bool _isSubmittingRequest = false;

  @override
  void initState() {
    super.initState();
    final client = widget.apiClient ?? widget.sessionManager.apiClient;
    _service =
        widget.bookingCenterService ?? BookingCenterService(apiClient: client);
    _tabController = TabController(length: 3, vsync: this);

    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    await Future.wait([
      _fetchQuota(),
      _fetchPackages(),
      _fetchPurchaseRequests(),
      _fetchTransactions(),
    ]);
  }

  Future<void> _fetchQuota() async {
    if (!mounted) return;
    setState(() {
      _isLoadingQuota = true;
      _quotaError = null;
    });

    final result = await _service.getQuotaBalance();
    if (!mounted) return;

    setState(() {
      _isLoadingQuota = false;
      switch (result) {
        case ApiSuccess(:final data):
          _quotaData = data;
          _quotaError = null;
        case ApiFailure(:final exception):
          _quotaError = exception.message;
      }
    });
  }

  Future<void> _fetchPackages() async {
    if (!mounted) return;
    setState(() {
      _isLoadingPackages = true;
      _packagesError = null;
    });

    final result = await _service.getBookingPackages();
    if (!mounted) return;

    setState(() {
      _isLoadingPackages = false;
      switch (result) {
        case ApiSuccess(:final data):
          _packages = data;
          _packagesError = null;
        case ApiFailure(:final exception):
          _packagesError = exception.message;
      }
    });
  }

  Future<void> _fetchPurchaseRequests() async {
    if (!mounted) return;
    setState(() {
      _isLoadingRequests = true;
      _requestsError = null;
    });

    final result = await _service.getPurchaseRequests();
    if (!mounted) return;

    setState(() {
      _isLoadingRequests = false;
      switch (result) {
        case ApiSuccess(:final data):
          _purchaseRequests = data;
          _requestsError = null;
        case ApiFailure(:final exception):
          _requestsError = exception.message;
      }
    });
  }

  Future<void> _fetchTransactions() async {
    if (!mounted) return;
    setState(() {
      _isLoadingTransactions = true;
      _transactionsError = null;
    });

    final result = await _service.getTransactions();
    if (!mounted) return;

    setState(() {
      _isLoadingTransactions = false;
      switch (result) {
        case ApiSuccess(:final data):
          _transactions = data;
          _transactionsError = null;
        case ApiFailure(:final exception):
          _transactionsError = exception.message;
      }
    });
  }

  void _openPurchaseRequestModal(BookingPackage package) {
    final strings = LocalizedStrings.of(context);
    String selectedPaymentMethod = 'baridimob';
    final refController = TextEditingController();
    final notesController = TextEditingController();
    String? modalError;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) {
        return StatefulBuilder(
          builder: (builderContext, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                top: 20,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(modalContext).viewInsets.bottom + 20,
              ),
              decoration: const BoxDecoration(
                color: AafiyaColors.pureWhite,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          strings.purchaseRequest,
                          style: AafiyaTypography.titleLarge.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.of(modalContext).pop(),
                        ),
                      ],
                    ),
                    const Divider(height: 20),

                    // Package Summary Card
                    Container(
                      padding: AafiyaSpacing.insetAllMd,
                      decoration: BoxDecoration(
                        color: AafiyaColors.healthBlue.withValues(alpha: 0.08),
                        borderRadius: AafiyaRadius.borderMd,
                        border: Border.all(
                          color: AafiyaColors.healthBlue.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            package.name,
                            style: AafiyaTypography.titleMedium.copyWith(
                              color: AafiyaColors.healthBlue,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${package.quotaUnits} ${strings.unitsLabel}',
                                style: AafiyaTypography.bodyMedium,
                              ),
                              Text(
                                '${package.priceDzd.toStringAsFixed(0)} ${strings.currencyDzd}',
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Payment Method Selector
                    Text(
                      strings.paymentMethod,
                      style: AafiyaTypography.labelMedium.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ChoiceChip(
                            key: const Key('payment_method_baridimob'),
                            label: Text(strings.baridimob),
                            selected: selectedPaymentMethod == 'baridimob',
                            onSelected: (selected) {
                              if (selected) {
                                setModalState(() {
                                  selectedPaymentMethod = 'baridimob';
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ChoiceChip(
                            key: const Key('payment_method_bank_transfer'),
                            label: Text(strings.bankTransfer),
                            selected: selectedPaymentMethod == 'bank_transfer',
                            onSelected: (selected) {
                              if (selected) {
                                setModalState(() {
                                  selectedPaymentMethod = 'bank_transfer';
                                });
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Transaction Reference (Optional)
                    TextField(
                      key: const Key('input_transaction_reference'),
                      controller: refController,
                      decoration: InputDecoration(
                        labelText: strings.transactionReference,
                        hintText: 'e.g. TXN-123456',
                        border: const OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Optional Notes
                    TextField(
                      key: const Key('input_purchase_notes'),
                      controller: notesController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: strings.optionalNotes,
                        border: const OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (modalError != null) ...[
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AafiyaColors.error.withValues(alpha: 0.1),
                          borderRadius: AafiyaRadius.borderSm,
                        ),
                        child: Text(
                          modalError!,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.error,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],

                    ElevatedButton(
                      key: const Key('submit_purchase_request_button'),
                      onPressed: _isSubmittingRequest
                          ? null
                          : () async {
                              setModalState(() {
                                _isSubmittingRequest = true;
                                modalError = null;
                              });

                              final result = await _service.createPurchaseRequest(
                                packageId: package.id,
                                paymentMethod: selectedPaymentMethod,
                                transactionReference: refController.text.trim(),
                                notes: notesController.text.trim(),
                              );

                              if (!mounted) return;

                              setModalState(() {
                                _isSubmittingRequest = false;
                              });

                              switch (result) {
                                case ApiSuccess():
                                  if (modalContext.mounted) {
                                    Navigator.of(modalContext).pop();
                                  }
                                  if (!mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(strings.requestSubmittedSuccess),
                                      backgroundColor: AafiyaColors.success,
                                    ),
                                  );
                                  // Refresh requests and quota from authoritative backend
                                  _fetchPurchaseRequests();
                                  _fetchQuota();
                                  _tabController.animateTo(1);
                                case ApiFailure(:final exception):
                                  setModalState(() {
                                    modalError = exception.message;
                                  });
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AafiyaColors.healthBlue,
                        foregroundColor: AafiyaColors.pureWhite,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: AafiyaRadius.borderMd,
                        ),
                      ),
                      child: _isSubmittingRequest
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(AafiyaColors.pureWhite),
                              ),
                            )
                          : Text(
                              strings.submitPurchaseRequest,
                              style: AafiyaTypography.labelLarge.copyWith(
                                color: AafiyaColors.pureWhite,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final centerName = _quotaData?.name ?? widget.user?.name ?? strings.bookingCenterRoleTitle;
    final quotaBalance = _quotaData?.quotaBalance ?? 0;

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.bookingCenterDashboardTitle,
        leading: widget.onBackToDashboard != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: widget.onBackToDashboard,
              )
            : null,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: QuotaBalanceCard(
              centerName: centerName,
              quotaBalance: quotaBalance,
              isLoading: _isLoadingQuota,
              onRefresh: _fetchQuota,
              onRecharge: () {
                _tabController.animateTo(0);
              },
            ),
          ),
          if (_quotaError != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AafiyaColors.error.withValues(alpha: 0.1),
                  borderRadius: AafiyaRadius.borderSm,
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: AafiyaColors.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _quotaError!,
                        style: AafiyaTypography.caption.copyWith(color: AafiyaColors.error),
                      ),
                    ),
                    TextButton(
                      onPressed: _fetchQuota,
                      child: Text(strings.retry),
                    ),
                  ],
                ),
              ),
            ),
          TabBar(
            controller: _tabController,
            labelColor: AafiyaColors.healthBlue,
            unselectedLabelColor: AafiyaColors.secondaryText,
            indicatorColor: AafiyaColors.healthBlue,
            tabs: [
              Tab(text: strings.availablePackages),
              Tab(text: strings.purchaseHistoryTitle),
              Tab(text: strings.transactionsLedger),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildPackagesTab(strings),
                _buildPurchaseRequestsTab(strings),
                _buildTransactionsTab(strings),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPackagesTab(LocalizedStrings strings) {
    if (_isLoadingPackages) {
      return const Center(child: AafiyaLoadingView());
    }

    if (_packagesError != null) {
      return Center(
        child: SingleChildScrollView(
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: _packagesError!,
            retryLabel: strings.retry,
            onRetry: _fetchPackages,
          ),
        ),
      );
    }

    if (_packages.isEmpty) {
      return Center(
        child: Text(
          strings.noPackagesFound,
          style: AafiyaTypography.bodyMedium.copyWith(color: AafiyaColors.secondaryText),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _packages.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final pkg = _packages[index];
        return AafiyaCard(
          padding: AafiyaSpacing.insetAllMd,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AafiyaColors.healthBlue.withValues(alpha: 0.1),
                  borderRadius: AafiyaRadius.borderMd,
                ),
                child: const Icon(
                  Icons.inventory_2_outlined,
                  color: AafiyaColors.healthBlue,
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pkg.name,
                      style: AafiyaTypography.titleMedium.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${pkg.quotaUnits} ${strings.unitsLabel}',
                      style: AafiyaTypography.labelMedium.copyWith(
                        color: AafiyaColors.healthBlue,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (pkg.description != null && pkg.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        pkg.description!,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${pkg.priceDzd.toStringAsFixed(0)} ${strings.currencyDzd}',
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.primaryText,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    key: Key('buy_package_button_${pkg.packageCode}'),
                    onPressed: () => _openPurchaseRequestModal(pkg),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AafiyaColors.healthBlue,
                      foregroundColor: AafiyaColors.pureWhite,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      textStyle: AafiyaTypography.labelSmall.copyWith(fontWeight: FontWeight.bold),
                      shape: RoundedRectangleBorder(
                        borderRadius: AafiyaRadius.borderSm,
                      ),
                    ),
                    child: Text(strings.purchaseRequest),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPurchaseRequestsTab(LocalizedStrings strings) {
    if (_isLoadingRequests) {
      return const Center(child: AafiyaLoadingView());
    }

    if (_requestsError != null) {
      return Center(
        child: SingleChildScrollView(
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: _requestsError!,
            retryLabel: strings.retry,
            onRetry: _fetchPurchaseRequests,
          ),
        ),
      );
    }

    if (_purchaseRequests.isEmpty) {
      return Center(
        child: Text(
          strings.noPurchaseRequestsFound,
          style: AafiyaTypography.bodyMedium.copyWith(color: AafiyaColors.secondaryText),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchPurchaseRequests,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _purchaseRequests.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final req = _purchaseRequests[index];
          final (statusColor, statusLabel) = switch (req.status) {
            PurchaseRequestStatus.pending => (const Color(0xFFD97706), strings.requestPending),
            PurchaseRequestStatus.approved => (AafiyaColors.success, strings.requestApproved),
            PurchaseRequestStatus.rejected => (AafiyaColors.error, strings.requestRejected),
            PurchaseRequestStatus.unknown => (AafiyaColors.secondaryText, 'Unknown'),
          };

          return AafiyaCard(
            padding: AafiyaSpacing.insetAllMd,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      req.requestReference,
                      style: AafiyaTypography.labelMedium.copyWith(
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: AafiyaRadius.borderSm,
                        border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        statusLabel,
                        style: AafiyaTypography.caption.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      req.packageName,
                      style: AafiyaTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      '+${req.quotaUnits} ${strings.unitsLabel}',
                      style: AafiyaTypography.bodyMedium.copyWith(
                        color: AafiyaColors.healthBlue,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${req.priceDzd.toStringAsFixed(0)} ${strings.currencyDzd}',
                      style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
                    ),
                    if (req.createdAt != null)
                      Text(
                        req.createdAt!.length >= 10 ? req.createdAt!.substring(0, 10) : req.createdAt!,
                        style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
                      ),
                  ],
                ),
                if (req.status == PurchaseRequestStatus.rejected &&
                    req.rejectionReason != null &&
                    req.rejectionReason!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AafiyaColors.error.withValues(alpha: 0.08),
                      borderRadius: AafiyaRadius.borderSm,
                      border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.2)),
                    ),
                    child: Text(
                      '${strings.requestRejected}: ${req.rejectionReason}',
                      style: AafiyaTypography.caption.copyWith(color: AafiyaColors.error),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTransactionsTab(LocalizedStrings strings) {
    if (_isLoadingTransactions) {
      return const Center(child: AafiyaLoadingView());
    }

    if (_transactionsError != null) {
      return Center(
        child: SingleChildScrollView(
          child: AafiyaErrorView(
            title: strings.errorTitle,
            message: _transactionsError!,
            retryLabel: strings.retry,
            onRetry: _fetchTransactions,
          ),
        ),
      );
    }

    if (_transactions.isEmpty) {
      return Center(
        child: Text(
          strings.noTransactionsFound,
          style: AafiyaTypography.bodyMedium.copyWith(color: AafiyaColors.secondaryText),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchTransactions,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _transactions.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final tx = _transactions[index];
          final isCredit = tx.transactionType.isCredit;
          final typeLabel = switch (tx.transactionType) {
            BookingTransactionType.purchase => strings.transactionTypePurchase,
            BookingTransactionType.confirmation => strings.transactionTypeConfirmation,
            BookingTransactionType.refund => strings.transactionTypeRefund,
            BookingTransactionType.unknown => 'Transaction',
          };
          final badgeColor = isCredit ? AafiyaColors.success : AafiyaColors.error;

          return AafiyaCard(
            padding: AafiyaSpacing.insetAllMd,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  isCredit ? Icons.add_circle_outline_rounded : Icons.remove_circle_outline_rounded,
                  color: badgeColor,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            typeLabel,
                            style: AafiyaTypography.bodyMedium.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '${isCredit && tx.units > 0 ? "+" : ""}${tx.units} ${strings.unitsLabel}',
                            style: AafiyaTypography.titleMedium.copyWith(
                              color: badgeColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      if (tx.referenceNote != null && tx.referenceNote!.isNotEmpty)
                        Text(
                          tx.referenceNote!,
                          style: AafiyaTypography.caption.copyWith(color: AafiyaColors.primaryText),
                        ),
                      if (tx.appointmentBookingReference != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          'Ref: ${tx.appointmentBookingReference}',
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${strings.balanceAfterLabel}: ${tx.balanceAfter}',
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (tx.createdAt != null)
                            Text(
                              tx.createdAt!.length >= 10 ? tx.createdAt!.substring(0, 10) : tx.createdAt!,
                              style: AafiyaTypography.caption.copyWith(color: AafiyaColors.secondaryText),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

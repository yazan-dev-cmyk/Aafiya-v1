import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/prescription_card.dart';
import 'prescription_detail_screen.dart';

/// Screen listing patient prescriptions with status filtering, pagination, and refresh.
class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({
    super.key,
    required this.apiClient,
  });

  final ApiClient apiClient;

  static Future<void> show(BuildContext context, {required ApiClient apiClient}) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PrescriptionsScreen(apiClient: apiClient),
      ),
    );
  }

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  late final PrescriptionService _prescriptionService;
  final ScrollController _scrollController = ScrollController();

  String? _selectedStatus;
  int _currentPage = 1;
  int _lastPage = 1;
  bool _isInitialLoading = false;
  bool _isLoadingMore = false;
  String? _initialErrorMessage;
  bool _nextPageError = false;
  final List<Prescription> _prescriptions = [];

  @override
  void initState() {
    super.initState();
    _prescriptionService = PrescriptionService(widget.apiClient);
    _scrollController.addListener(_onScroll);
    _fetchPrescriptions(page: 1, reset: true);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;

    if (maxScroll > 0 &&
        currentScroll >= maxScroll - 200 &&
        !_isLoadingMore &&
        !_isInitialLoading &&
        !_nextPageError &&
        _currentPage < _lastPage) {
      _fetchPrescriptions(page: _currentPage + 1, reset: false);
    }
  }

  void _onStatusFilterSelected(String? status) {
    if (_selectedStatus == status) return;
    setState(() {
      _selectedStatus = status;
    });
    _fetchPrescriptions(page: 1, reset: true);
  }

  Future<void> _fetchPrescriptions({required int page, required bool reset}) async {
    if (reset) {
      setState(() {
        _isInitialLoading = true;
        _initialErrorMessage = null;
        _nextPageError = false;
      });
    } else {
      setState(() {
        _isLoadingMore = true;
        _nextPageError = false;
      });
    }

    final result = await _prescriptionService.fetchPrescriptions(
      status: _selectedStatus,
      page: page,
      perPage: 15,
      sortBy: 'issue_date',
      sortOrder: 'desc',
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          if (reset) {
            _prescriptions.clear();
          }
          _prescriptions.addAll(data.prescriptions);
          _currentPage = data.currentPage;
          _lastPage = data.lastPage;
          _isInitialLoading = false;
          _isLoadingMore = false;
        });

      case ApiFailure(:final exception):
        setState(() {
          if (reset) {
            _initialErrorMessage = exception.message;
            _isInitialLoading = false;
          } else {
            _nextPageError = true;
            _isLoadingMore = false;
          }
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.prescriptionsTitle,
        leading: BackButton(
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Filter Chips Row
          _buildFilterChips(strings),

          // Main Body Area
          Expanded(
            child: _buildBody(strings),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips(LocalizedStrings strings) {
    final filters = [
      (label: strings.allPrescriptions, value: null),
      (label: strings.filterStatusActive, value: 'active'),
      (label: strings.filterStatusCompleted, value: 'completed'),
      (label: strings.filterStatusVoided, value: 'voided'),
      (label: strings.filterStatusExpired, value: 'expired'),
    ];

    return Container(
      height: 48,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final filter = filters[index];
          final isSelected = _selectedStatus == filter.value;

          return FilterChip(
            selected: isSelected,
            label: Text(filter.label),
            labelStyle: TextStyle(
              color: isSelected ? Colors.white : AafiyaColors.primaryText,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 13,
            ),
            selectedColor: AafiyaColors.healthBlue,
            backgroundColor: AafiyaColors.lightBackground,
            checkmarkColor: Colors.white,
            side: BorderSide(
              color: isSelected ? AafiyaColors.healthBlue : AafiyaColors.border,
            ),
            onSelected: (_) => _onStatusFilterSelected(filter.value),
          );
        },
      ),
    );
  }

  Widget _buildBody(LocalizedStrings strings) {
    if (_isInitialLoading) {
      return AafiyaLoadingView(message: strings.loadingPrescriptions);
    }

    if (_initialErrorMessage != null) {
      return AafiyaErrorView(
        message: _initialErrorMessage!,
        retryLabel: strings.retryLoadingPrescriptions,
        onRetry: () => _fetchPrescriptions(page: 1, reset: true),
      );
    }

    if (_prescriptions.isEmpty) {
      return LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: RefreshIndicator(
                onRefresh: () => _fetchPrescriptions(page: 1, reset: true),
                child: AafiyaEmptyView(
                  icon: Icons.receipt_long_outlined,
                  title: strings.prescriptionsTitle,
                  message: _selectedStatus != null
                      ? strings.emptyPrescriptionsFiltered
                      : strings.emptyPrescriptions,
                ),
              ),
            ),
          );
        },
      );
    }

    final hasMore = _currentPage < _lastPage;

    return RefreshIndicator(
      onRefresh: () => _fetchPrescriptions(page: 1, reset: true),
      child: ListView.separated(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        itemCount: _prescriptions.length + (hasMore || _nextPageError ? 1 : 0),
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          if (index == _prescriptions.length) {
            if (_nextPageError) {
              return Center(
                child: TextButton.icon(
                  icon: const Icon(Icons.refresh),
                  label: Text(strings.failedToLoadMore),
                  onPressed: () => _fetchPrescriptions(
                    page: _currentPage + 1,
                    reset: false,
                  ),
                ),
              );
            }
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: CircularProgressIndicator(),
              ),
            );
          }

          final prescription = _prescriptions[index];
          return PrescriptionCard(
            prescription: prescription,
            onTap: () => PrescriptionDetailScreen.show(context, prescription),
          );
        },
      ),
    );
  }
}

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/clinic_card.dart';

/// Screen displaying searchable and filterable public directory of affiliated clinics.
///
/// NOTE: Adheres strictly to DISC-01.
/// Direct booking is strictly excluded. All cards and items are purely informational.
class ClinicDirectoryScreen extends StatefulWidget {
  const ClinicDirectoryScreen({
    super.key,
    required this.apiClient,
    this.masterDataService,
  });

  final ApiClient apiClient;
  final MasterDataService? masterDataService;

  /// Helper route to present this screen.
  static Future<void> show(
    BuildContext context, {
    required ApiClient apiClient,
    MasterDataService? masterDataService,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ClinicDirectoryScreen(
          apiClient: apiClient,
          masterDataService: masterDataService,
        ),
      ),
    );
  }

  @override
  State<ClinicDirectoryScreen> createState() => _ClinicDirectoryScreenState();
}

class _ClinicDirectoryScreenState extends State<ClinicDirectoryScreen> {
  late final MasterDataService _masterDataService;
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  bool _isInitialLoading = true;
  bool _isLoadingMore = false;
  bool _nextPageError = false;
  String? _initialErrorMessage;

  List<Clinic> _clinics = [];
  int _currentPage = 1;
  int _lastPage = 1;

  String _searchQuery = '';
  String? _selectedWilaya;

  @override
  void initState() {
    super.initState();
    _masterDataService = widget.masterDataService ?? MasterDataService(widget.apiClient);
    _scrollController.addListener(_onScroll);
    _fetchClinics(page: 1, reset: true);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _scrollController.dispose();
    _searchController.dispose();
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
      _fetchClinics(page: _currentPage + 1, reset: false);
    }
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(() {
        _searchQuery = query.trim().toLowerCase();
      });
      _fetchClinics(page: 1, reset: true);
    });
  }

  void _onWilayaSelected(String? wilaya) {
    setState(() {
      _selectedWilaya = wilaya;
    });
    _fetchClinics(page: 1, reset: true);
  }

  Future<void> _fetchClinics({required int page, required bool reset}) async {
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

    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': '10',
    };

    if (_selectedWilaya != null && _selectedWilaya!.isNotEmpty) {
      queryParams['wilaya'] = _selectedWilaya!;
    }

    final result = await widget.apiClient.get(
      ApiEndpoints.clinics,
      queryParameters: queryParams,
      allowRetry: true,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        final rawData = data['data'];
        final meta = data['meta'] as Map<String, dynamic>?;

        final newItems = <Clinic>[];
        if (rawData is List) {
          for (final item in rawData) {
            if (item is Map<String, dynamic>) {
              newItems.add(Clinic.fromJson(item));
            }
          }
        }

        final currentPage = meta != null && meta['current_page'] is int
            ? meta['current_page'] as int
            : page;
        final lastPage = meta != null && meta['last_page'] is int
            ? meta['last_page'] as int
            : 1;

        setState(() {
          if (reset) {
            _clinics = newItems;
          } else {
            _clinics.addAll(newItems);
          }
          _currentPage = currentPage;
          _lastPage = lastPage;
          _isInitialLoading = false;
          _isLoadingMore = false;
          _nextPageError = false;
        });

      case ApiFailure(:final exception):
        setState(() {
          if (reset) {
            _initialErrorMessage = exception.message;
            _isInitialLoading = false;
          } else {
            _isLoadingMore = false;
            _nextPageError = true;
          }
        });
    }
  }

  /// Filters clinics client-side by search query (name, wilaya, address)
  List<Clinic> get _filteredClinics {
    if (_searchQuery.isEmpty) return _clinics;
    return _clinics.where((c) {
      final nameMatches = c.name.toLowerCase().contains(_searchQuery);
      final wilayaMatches = c.wilaya?.toLowerCase().contains(_searchQuery) ?? false;
      final addressMatches = c.address?.toLowerCase().contains(_searchQuery) ?? false;
      final directorMatches = c.director?.name.toLowerCase().contains(_searchQuery) ?? false;
      return nameMatches || wilayaMatches || addressMatches || directorMatches;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.clinicDirectory,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search & Wilaya Filter Header
            _buildSearchAndFilters(context, strings),

            // Content Area
            Expanded(
              child: _buildBody(context, strings),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchAndFilters(BuildContext context, LocalizedStrings strings) {
    return Container(
      color: AafiyaColors.pureWhite,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        children: [
          // Search Input
          TextField(
            controller: _searchController,
            onChanged: _onSearchChanged,
            decoration: InputDecoration(
              hintText: strings.searchClinicsHint,
              prefixIcon: const Icon(Icons.search_rounded, color: AafiyaColors.secondaryText),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              filled: true,
              fillColor: AafiyaColors.lightBackground,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                borderSide: const BorderSide(color: AafiyaColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                borderSide: const BorderSide(color: AafiyaColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                borderSide: const BorderSide(color: AafiyaColors.healthBlue, width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Horizontal Dynamic Wilaya Filter Chips
          AafiyaWilayaFilterChips(
            masterDataService: _masterDataService,
            selectedWilaya: _selectedWilaya,
            useArabicNamesForQuery: true,
            onWilayaSelected: _onWilayaSelected,
          ),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context, LocalizedStrings strings) {
    if (_isInitialLoading) {
      return AafiyaLoadingView(message: strings.loading);
    }

    if (_initialErrorMessage != null) {
      return AafiyaErrorView(
        message: _initialErrorMessage!,
        retryLabel: strings.retry,
        onRetry: () => _fetchClinics(page: 1, reset: true),
      );
    }

    final displayList = _filteredClinics;

    if (displayList.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _fetchClinics(page: 1, reset: true),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
            child: AafiyaEmptyView(
              icon: Icons.domain_disabled_rounded,
              title: strings.emptyTitle,
              message: strings.noClinicsFound,
            ),
          ),
        ),
      );
    }

    // List with pagination footer
    final itemCount = displayList.length + 1;

    return RefreshIndicator(
      onRefresh: () => _fetchClinics(page: 1, reset: true),
      child: ListView.separated(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        itemCount: itemCount,
        separatorBuilder: (_, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          if (index < displayList.length) {
            final clinic = displayList[index];
            return ClinicCard(clinic: clinic);
          }

          // Footer widget
          return _buildPaginationFooter(context, strings);
        },
      ),
    );
  }

  Widget _buildPaginationFooter(BuildContext context, LocalizedStrings strings) {
    if (_isLoadingMore) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(AafiyaColors.healthBlue),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                strings.loadingMore,
                style: AafiyaTypography.caption.copyWith(
                  color: AafiyaColors.secondaryText,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_nextPageError) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                strings.failedToLoadMore,
                style: AafiyaTypography.caption.copyWith(
                  color: AafiyaColors.error,
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => _fetchClinics(page: _currentPage + 1, reset: false),
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: Text(strings.retry),
              ),
            ],
          ),
        ),
      );
    }

    if (_currentPage < _lastPage && !_isLoadingMore && !_nextPageError) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Center(
          child: TextButton.icon(
            onPressed: () => _fetchClinics(page: _currentPage + 1, reset: false),
            icon: const Icon(Icons.expand_more_rounded, size: 18),
            label: Text(strings.loadMore),
          ),
        ),
      );
    }

    if (_currentPage >= _lastPage && _clinics.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Text(
            strings.endOfResults,
            style: AafiyaTypography.caption.copyWith(
              color: AafiyaColors.secondaryText.withValues(alpha: 0.7),
            ),
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }
}

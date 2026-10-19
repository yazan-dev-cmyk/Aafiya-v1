import 'dart:async';
import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Screen displaying searchable and filterable public directory of authorized booking centers.
///
/// NOTE: Adheres strictly to DISC-01.
/// Direct booking is strictly excluded. All cards and items are purely informational.
class BookingCenterDirectoryScreen extends StatefulWidget {
  const BookingCenterDirectoryScreen({
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
        builder: (_) => BookingCenterDirectoryScreen(
          apiClient: apiClient,
          masterDataService: masterDataService,
        ),
      ),
    );
  }

  @override
  State<BookingCenterDirectoryScreen> createState() => _BookingCenterDirectoryScreenState();
}

class _BookingCenterDirectoryScreenState extends State<BookingCenterDirectoryScreen> {
  late final MasterDataService _masterDataService;
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  bool _isInitialLoading = true;
  bool _isLoadingMore = false;
  bool _nextPageError = false;
  String? _initialErrorMessage;

  List<BookingCenter> _centers = [];
  int _currentPage = 1;
  int _lastPage = 1;

  String _searchQuery = '';
  String? _selectedWilaya;

  @override
  void initState() {
    super.initState();
    _masterDataService = widget.masterDataService ?? MasterDataService(widget.apiClient);
    _scrollController.addListener(_onScroll);
    _fetchCenters(page: 1, reset: true);
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
      _fetchCenters(page: _currentPage + 1, reset: false);
    }
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(() {
        _searchQuery = query.trim().toLowerCase();
      });
      _fetchCenters(page: 1, reset: true);
    });
  }

  void _onWilayaSelected(String? wilaya) {
    setState(() {
      _selectedWilaya = wilaya;
    });
    _fetchCenters(page: 1, reset: true);
  }

  Future<void> _fetchCenters({required int page, required bool reset}) async {
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
      ApiEndpoints.bookingCenters,
      queryParameters: queryParams,
      allowRetry: true,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        final rawData = data['data'];
        final meta = data['meta'] as Map<String, dynamic>?;

        final newItems = <BookingCenter>[];
        if (rawData is List) {
          for (final item in rawData) {
            if (item is Map<String, dynamic>) {
              newItems.add(BookingCenter.fromJson(item));
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
            _centers = newItems;
          } else {
            _centers.addAll(newItems);
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

  List<BookingCenter> get _filteredCenters {
    if (_searchQuery.isEmpty) return _centers;
    return _centers.where((center) {
      final name = center.name.toLowerCase();
      final address = (center.address ?? '').toLowerCase();
      final wilaya = (center.wilaya ?? '').toLowerCase();
      return name.contains(_searchQuery) ||
          address.contains(_searchQuery) ||
          wilaya.contains(_searchQuery);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      backgroundColor: AafiyaColors.scaffoldBg,
      appBar: AafiyaAppBar(
        title: strings.bookingCenterDirectoryTitle,
        showBrandMark: true,
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
              hintText: strings.searchBookingCentersHint,
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
        onRetry: () => _fetchCenters(page: 1, reset: true),
      );
    }

    final displayed = _filteredCenters;

    if (displayed.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _fetchCenters(page: 1, reset: true),
        color: AafiyaColors.tealDeep,
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: AafiyaEmptyView(
                  icon: Icons.apartment_rounded,
                  title: strings.noBookingCentersFound,
                  message: strings.isArabic
                      ? 'لا توجد مراكز حجز معتمدة مطابقة لبحثك حالياً.'
                      : 'No authorized booking centers found matching your search.',
                ),
              ),
            );
          },
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _fetchCenters(page: 1, reset: true),
      color: AafiyaColors.tealDeep,
      child: ListView.separated(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AafiyaSpacing.insetScreen,
        itemCount: displayed.length + 1,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          if (index < displayed.length) {
            return _buildCenterCard(context, strings, displayed[index]);
          }
          return _buildPaginationFooter(context, strings);
        },
      ),
    );
  }

  Widget _buildCenterCard(BuildContext context, LocalizedStrings strings, BookingCenter center) {
    return AafiyaCard(
      padding: AafiyaSpacing.insetAllMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFFE8EEFB),
                child: const Icon(
                  Icons.apartment_rounded,
                  color: Color(0xFF2B4FA8),
                  size: 26,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      center.name,
                      style: AafiyaTypography.titleMedium.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AafiyaColors.primaryText,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.verified_rounded,
                          size: 14,
                          color: AafiyaColors.tealDeep,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          strings.verifiedBookingCenter,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.tealDeep,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (center.wilaya != null && center.wilaya!.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AafiyaColors.lightBackground,
                    borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                    border: Border.all(color: AafiyaColors.border),
                  ),
                  child: Text(
                    strings.wilayaName(center.wilaya!),
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          if (center.address != null && center.address!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 16, color: AafiyaColors.secondaryText),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    center.address!,
                    style: AafiyaTypography.bodyMedium.copyWith(color: AafiyaColors.secondaryText),
                  ),
                ),
              ],
            ),
          ],
          if (center.phone != null && center.phone!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.phone_outlined, size: 16, color: AafiyaColors.secondaryText),
                const SizedBox(width: 6),
                Text(
                  '\u200E${center.phone!}\u200E',
                  style: AafiyaTypography.bodyMedium.copyWith(
                    color: AafiyaColors.royalBlue,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AafiyaColors.info.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AafiyaRadius.sm),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, size: 14, color: AafiyaColors.info),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    strings.disc01Notice,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.info,
                      fontSize: 11,
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

  Widget _buildPaginationFooter(BuildContext context, LocalizedStrings strings) {
    if (_isLoadingMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (_nextPageError) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: OutlinedButton.icon(
            onPressed: () => _fetchCenters(page: _currentPage + 1, reset: false),
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: Text(strings.retry),
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }
}

import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';

/// Reusable horizontal scrolling filter chips widget for Wilayas.
/// Consumes authoritative [MasterDataService] dynamically.
class AafiyaWilayaFilterChips extends StatefulWidget {
  const AafiyaWilayaFilterChips({
    super.key,
    required this.masterDataService,
    this.selectedWilaya,
    this.onWilayaSelected,
    this.useArabicNamesForQuery = false,
  });

  final MasterDataService masterDataService;
  final String? selectedWilaya;
  final ValueChanged<String?>? onWilayaSelected;

  /// If true, passes Wilaya's Arabic name on selection (for legacy endpoint query params).
  /// If false, passes Wilaya's official 2-digit code.
  final bool useArabicNamesForQuery;

  @override
  State<AafiyaWilayaFilterChips> createState() => _AafiyaWilayaFilterChipsState();
}

class _AafiyaWilayaFilterChipsState extends State<AafiyaWilayaFilterChips> {
  List<Wilaya> _wilayas = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadWilayas();
  }

  Future<void> _loadWilayas({bool forceRefresh = false}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.masterDataService.getWilayas(forceRefresh: forceRefresh);
    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _wilayas = data;
          _isLoading = false;
        });
      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message.isNotEmpty
              ? exception.message
              : LocalizedStrings.of(context).errorLoadingWilayas;
          _isLoading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final locale = Localizations.localeOf(context).languageCode;

    if (_isLoading) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            Container(
              height: 32,
              width: 90,
              decoration: BoxDecoration(
                color: AafiyaColors.border.withValues(alpha: 0.5),
                borderRadius: AafiyaRadius.borderPill,
              ),
            ),
            const SizedBox(width: AafiyaSpacing.sm),
            Container(
              height: 32,
              width: 80,
              decoration: BoxDecoration(
                color: AafiyaColors.border.withValues(alpha: 0.5),
                borderRadius: AafiyaRadius.borderPill,
              ),
            ),
            const SizedBox(width: AafiyaSpacing.sm),
            Container(
              height: 32,
              width: 80,
              decoration: BoxDecoration(
                color: AafiyaColors.border.withValues(alpha: 0.5),
                borderRadius: AafiyaRadius.borderPill,
              ),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null && _wilayas.isEmpty) {
      return Row(
        children: [
          Text(
            _errorMessage!,
            style: const TextStyle(color: AafiyaColors.error, fontSize: 12),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 16, color: AafiyaColors.error),
            onPressed: () => _loadWilayas(forceRefresh: true),
          ),
        ],
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          FilterChip(
            label: Text(strings.allWilayas),
            selected: widget.selectedWilaya == null,
            onSelected: (selected) {
              if (selected) widget.onWilayaSelected?.call(null);
            },
          ),
          for (final wilaya in _wilayas) ...[
            const SizedBox(width: AafiyaSpacing.sm),
            Builder(builder: (ctx) {
              final queryVal = widget.useArabicNamesForQuery ? wilaya.nameAr : wilaya.code;
              final isSelected = widget.selectedWilaya == queryVal ||
                  widget.selectedWilaya == wilaya.code ||
                  widget.selectedWilaya == wilaya.nameAr;
              return FilterChip(
                label: Text(wilaya.localizedName(locale)),
                selected: isSelected,
                onSelected: (selected) {
                  widget.onWilayaSelected?.call(selected ? queryVal : null);
                },
              );
            }),
          ],
        ],
      ),
    );
  }
}

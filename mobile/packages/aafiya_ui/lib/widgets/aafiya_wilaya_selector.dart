import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';

/// Reusable accessible Wilaya selector consuming authoritative [MasterDataService].
class AafiyaWilayaSelector extends StatefulWidget {
  const AafiyaWilayaSelector({
    super.key,
    required this.masterDataService,
    this.selectedCode,
    this.onChanged,
    this.label,
    this.hint,
    this.enabled = true,
    this.includeAllOption = false,
    this.allOptionLabel,
    this.validator,
  });

  final MasterDataService masterDataService;
  final String? selectedCode;
  final ValueChanged<Wilaya?>? onChanged;
  final String? label;
  final String? hint;
  final bool enabled;
  final bool includeAllOption;
  final String? allOptionLabel;
  final FormFieldValidator<String>? validator;

  @override
  State<AafiyaWilayaSelector> createState() => _AafiyaWilayaSelectorState();
}

class _AafiyaWilayaSelectorState extends State<AafiyaWilayaSelector> {
  List<Wilaya> _wilayas = [];
  bool _isLoading = true;
  String? _errorMessage;
  Wilaya? _selectedWilaya;

  @override
  void initState() {
    super.initState();
    _loadWilayas();
  }

  @override
  void didUpdateWidget(covariant AafiyaWilayaSelector oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedCode != oldWidget.selectedCode) {
      _syncSelectedWilaya();
    }
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
          _syncSelectedWilaya();
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

  void _syncSelectedWilaya() {
    if (widget.selectedCode == null || widget.selectedCode!.isEmpty || widget.selectedCode == 'all') {
      _selectedWilaya = null;
    } else {
      _selectedWilaya = _wilayas.cast<Wilaya?>().firstWhere(
        (w) => w?.code == widget.selectedCode,
        orElse: () => widget.masterDataService.resolveLegacyWilaya(widget.selectedCode!),
      );
    }
  }

  void _openSelectionModal(BuildContext context, LocalizedStrings strings) {
    if (!widget.enabled || _isLoading) return;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AafiyaColors.pureWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return _WilayaSelectionSheet(
          wilayas: _wilayas,
          selectedCode: widget.selectedCode,
          includeAllOption: widget.includeAllOption,
          allOptionLabel: widget.allOptionLabel ?? strings.allWilayas,
          strings: strings,
          onSelected: (wilaya) {
            Navigator.of(ctx).pop();
            setState(() => _selectedWilaya = wilaya);
            widget.onChanged?.call(wilaya);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final locale = Localizations.localeOf(context).languageCode;
    final effectiveLabel = widget.label ?? strings.wilayaLabel;
    final effectiveHint = widget.hint ?? strings.selectWilaya;

    String displayText = '';
    if (_selectedWilaya != null) {
      displayText = '${_selectedWilaya!.code} - ${_selectedWilaya!.localizedName(locale)}';
    } else if (widget.includeAllOption && widget.selectedCode == 'all') {
      displayText = widget.allOptionLabel ?? strings.allWilayas;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (effectiveLabel.isNotEmpty) ...[
          Text(
            effectiveLabel,
            style: AafiyaTypography.titleSmall.copyWith(
              color: AafiyaColors.primaryText,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AafiyaSpacing.xs),
        ],
        InkWell(
          onTap: widget.enabled && !_isLoading ? () => _openSelectionModal(context, strings) : null,
          borderRadius: AafiyaRadius.borderMd,
          child: Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: AafiyaSpacing.md),
            decoration: BoxDecoration(
              color: widget.enabled ? AafiyaColors.pureWhite : AafiyaColors.border.withValues(alpha: 0.2),
              borderRadius: AafiyaRadius.borderMd,
              border: Border.all(
                color: _errorMessage != null ? AafiyaColors.error : AafiyaColors.border,
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                if (_isLoading)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AafiyaColors.primaryBlue),
                  )
                else
                  Icon(
                    Icons.location_on_outlined,
                    size: 20,
                    color: _errorMessage != null
                        ? AafiyaColors.error
                        : (_selectedWilaya != null ? AafiyaColors.primaryBlue : AafiyaColors.secondaryText),
                  ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _isLoading
                        ? strings.loadingWilayas
                        : (_errorMessage != null
                            ? _errorMessage!
                            : (displayText.isNotEmpty ? displayText : effectiveHint)),
                    style: AafiyaTypography.bodyMedium.copyWith(
                      color: _errorMessage != null
                          ? AafiyaColors.error
                          : (displayText.isNotEmpty
                              ? AafiyaColors.primaryText
                              : AafiyaColors.secondaryText),
                      fontWeight: displayText.isNotEmpty ? FontWeight.w600 : FontWeight.normal,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (_errorMessage != null)
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, size: 18, color: AafiyaColors.error),
                    onPressed: () => _loadWilayas(forceRefresh: true),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  )
                else
                  const Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 20,
                    color: AafiyaColors.secondaryText,
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _WilayaSelectionSheet extends StatefulWidget {
  const _WilayaSelectionSheet({
    required this.wilayas,
    required this.selectedCode,
    required this.includeAllOption,
    required this.allOptionLabel,
    required this.strings,
    required this.onSelected,
  });

  final List<Wilaya> wilayas;
  final String? selectedCode;
  final bool includeAllOption;
  final String allOptionLabel;
  final LocalizedStrings strings;
  final ValueChanged<Wilaya?> onSelected;

  @override
  State<_WilayaSelectionSheet> createState() => _WilayaSelectionSheetState();
}

class _WilayaSelectionSheetState extends State<_WilayaSelectionSheet> {
  final TextEditingController _searchController = TextEditingController();
  String _filter = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).languageCode;
    final filtered = widget.wilayas.where((w) {
      if (_filter.isEmpty) return true;
      final q = _filter.toLowerCase();
      return w.code.contains(q) ||
          w.nameAr.contains(q) ||
          w.nameFr.toLowerCase().contains(q) ||
          w.nameEn.toLowerCase().contains(q);
    }).toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.9,
      minChildSize: 0.5,
      expand: false,
      builder: (ctx, scrollController) {
        return Column(
          children: [
            // Modal handle
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AafiyaColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AafiyaSpacing.lg, vertical: AafiyaSpacing.xs),
              child: Row(
                children: [
                  Text(
                    widget.strings.selectWilaya,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.primaryText,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            // Search field
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AafiyaSpacing.lg, vertical: AafiyaSpacing.xs),
              child: TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _filter = val.trim()),
                decoration: InputDecoration(
                  hintText: '${widget.strings.search}...',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20),
                  filled: true,
                  fillColor: AafiyaColors.lightBackground,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const Divider(height: 1),
            // List
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: (widget.includeAllOption ? 1 : 0) + filtered.length,
                itemBuilder: (ctx, index) {
                  if (widget.includeAllOption && index == 0) {
                    final isSelected = widget.selectedCode == null || widget.selectedCode == 'all';
                    return ListTile(
                      title: Text(
                        widget.allOptionLabel,
                        style: TextStyle(
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected ? AafiyaColors.primaryBlue : AafiyaColors.primaryText,
                        ),
                      ),
                      trailing: isSelected ? const Icon(Icons.check_rounded, color: AafiyaColors.primaryBlue) : null,
                      onTap: () => widget.onSelected(null),
                    );
                  }

                  final itemIndex = widget.includeAllOption ? index - 1 : index;
                  final wilaya = filtered[itemIndex];
                  final isSelected = widget.selectedCode == wilaya.code;

                  return ListTile(
                    title: Text(
                      '${wilaya.code} - ${wilaya.localizedName(locale)}',
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? AafiyaColors.primaryBlue : AafiyaColors.primaryText,
                      ),
                    ),
                    trailing: isSelected ? const Icon(Icons.check_rounded, color: AafiyaColors.primaryBlue) : null,
                    onTap: () => widget.onSelected(wilaya),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

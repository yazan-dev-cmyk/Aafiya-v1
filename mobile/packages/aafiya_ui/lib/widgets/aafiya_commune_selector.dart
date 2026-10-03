import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';

/// Reusable cascading Commune selector dependent on selected [wilayaCode].
class AafiyaCommuneSelector extends StatefulWidget {
  const AafiyaCommuneSelector({
    super.key,
    required this.masterDataService,
    this.wilayaCode,
    this.selectedCode,
    this.onChanged,
    this.label,
    this.hint,
    this.enabled = true,
    this.includeAllOption = false,
    this.allOptionLabel,
  });

  final MasterDataService masterDataService;
  final String? wilayaCode;
  final String? selectedCode;
  final ValueChanged<Commune?>? onChanged;
  final String? label;
  final String? hint;
  final bool enabled;
  final bool includeAllOption;
  final String? allOptionLabel;

  @override
  State<AafiyaCommuneSelector> createState() => _AafiyaCommuneSelectorState();
}

class _AafiyaCommuneSelectorState extends State<AafiyaCommuneSelector> {
  List<Commune> _communes = [];
  bool _isLoading = false;
  String? _errorMessage;
  Commune? _selectedCommune;
  String? _lastLoadedWilaya;

  @override
  void initState() {
    super.initState();
    _checkAndLoadCommunes();
  }

  @override
  void didUpdateWidget(covariant AafiyaCommuneSelector oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.wilayaCode != oldWidget.wilayaCode) {
      // Wilaya changed: reset selected commune
      if (_selectedCommune != null) {
        _selectedCommune = null;
        widget.onChanged?.call(null);
      }
      _checkAndLoadCommunes();
    } else if (widget.selectedCode != oldWidget.selectedCode) {
      _syncSelectedCommune();
    }
  }

  Future<void> _checkAndLoadCommunes({bool forceRefresh = false}) async {
    final code = widget.wilayaCode?.trim();
    if (code == null || code.isEmpty || code == 'all') {
      setState(() {
        _communes = [];
        _isLoading = false;
        _errorMessage = null;
        _selectedCommune = null;
        _lastLoadedWilaya = null;
      });
      return;
    }

    if (!forceRefresh && code == _lastLoadedWilaya && _communes.isNotEmpty) {
      _syncSelectedCommune();
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.masterDataService.getCommunes(code, forceRefresh: forceRefresh);
    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _communes = data;
          _isLoading = false;
          _lastLoadedWilaya = code;
          _syncSelectedCommune();
        });
      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message.isNotEmpty
              ? exception.message
              : LocalizedStrings.of(context).errorLoadingCommunes;
          _isLoading = false;
          _lastLoadedWilaya = null;
        });
    }
  }

  void _syncSelectedCommune() {
    if (widget.selectedCode == null || widget.selectedCode!.isEmpty || widget.selectedCode == 'all') {
      _selectedCommune = null;
    } else {
      _selectedCommune = _communes.cast<Commune?>().firstWhere(
        (c) => c?.code == widget.selectedCode,
        orElse: () => null,
      );
    }
  }

  void _openSelectionModal(BuildContext context, LocalizedStrings strings) {
    final isWilayaSelected = widget.wilayaCode != null && widget.wilayaCode!.isNotEmpty && widget.wilayaCode != 'all';
    if (!widget.enabled || !isWilayaSelected || _isLoading) return;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AafiyaColors.pureWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return _CommuneSelectionSheet(
          communes: _communes,
          selectedCode: widget.selectedCode,
          includeAllOption: widget.includeAllOption,
          allOptionLabel: widget.allOptionLabel ?? strings.allCommunes,
          strings: strings,
          onSelected: (commune) {
            Navigator.of(ctx).pop();
            setState(() => _selectedCommune = commune);
            widget.onChanged?.call(commune);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final locale = Localizations.localeOf(context).languageCode;
    final isWilayaSelected = widget.wilayaCode != null && widget.wilayaCode!.isNotEmpty && widget.wilayaCode != 'all';
    final isControlEnabled = widget.enabled && isWilayaSelected;

    final effectiveLabel = widget.label ?? strings.communeLabel;
    final effectiveHint = isWilayaSelected ? (widget.hint ?? strings.selectCommune) : strings.selectWilayaFirst;

    String displayText = '';
    if (_selectedCommune != null) {
      final name = _selectedCommune!.localizedName(locale);
      displayText = _selectedCommune!.postalCode != null
          ? '$name (${_selectedCommune!.postalCode})'
          : name;
    } else if (widget.includeAllOption && widget.selectedCode == 'all') {
      displayText = widget.allOptionLabel ?? strings.allCommunes;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (effectiveLabel.isNotEmpty) ...[
          Text(
            effectiveLabel,
            style: AafiyaTypography.titleSmall.copyWith(
              color: isControlEnabled ? AafiyaColors.primaryText : AafiyaColors.secondaryText,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AafiyaSpacing.xs),
        ],
        InkWell(
          onTap: isControlEnabled && !_isLoading ? () => _openSelectionModal(context, strings) : null,
          borderRadius: AafiyaRadius.borderMd,
          child: Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: AafiyaSpacing.md),
            decoration: BoxDecoration(
              color: isControlEnabled ? AafiyaColors.pureWhite : AafiyaColors.border.withValues(alpha: 0.2),
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
                    Icons.apartment_rounded,
                    size: 20,
                    color: _errorMessage != null
                        ? AafiyaColors.error
                        : (_selectedCommune != null ? AafiyaColors.primaryBlue : AafiyaColors.secondaryText),
                  ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _isLoading
                        ? strings.loadingCommunes
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
                    onPressed: () => _checkAndLoadCommunes(forceRefresh: true),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  )
                else
                  Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 20,
                    color: isControlEnabled ? AafiyaColors.secondaryText : AafiyaColors.border,
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _CommuneSelectionSheet extends StatefulWidget {
  const _CommuneSelectionSheet({
    required this.communes,
    required this.selectedCode,
    required this.includeAllOption,
    required this.allOptionLabel,
    required this.strings,
    required this.onSelected,
  });

  final List<Commune> communes;
  final String? selectedCode;
  final bool includeAllOption;
  final String allOptionLabel;
  final LocalizedStrings strings;
  final ValueChanged<Commune?> onSelected;

  @override
  State<_CommuneSelectionSheet> createState() => _CommuneSelectionSheetState();
}

class _CommuneSelectionSheetState extends State<_CommuneSelectionSheet> {
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
    final filtered = widget.communes.where((c) {
      if (_filter.isEmpty) return true;
      final q = _filter.toLowerCase();
      return c.code.contains(q) ||
          c.nameAr.contains(q) ||
          c.nameFr.toLowerCase().contains(q) ||
          c.nameEn.toLowerCase().contains(q) ||
          (c.postalCode != null && c.postalCode!.contains(q));
    }).toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.9,
      minChildSize: 0.5,
      expand: false,
      builder: (ctx, scrollController) {
        return Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AafiyaColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AafiyaSpacing.lg, vertical: AafiyaSpacing.xs),
              child: Row(
                children: [
                  Text(
                    widget.strings.selectCommune,
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
            if (filtered.isEmpty)
              Expanded(
                child: Center(
                  child: Text(
                    widget.strings.noCommunesFound,
                    style: AafiyaTypography.bodyMedium.copyWith(color: AafiyaColors.secondaryText),
                  ),
                ),
              )
            else
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
                    final commune = filtered[itemIndex];
                    final isSelected = widget.selectedCode == commune.code;
                    final name = commune.localizedName(locale);
                    final title = commune.postalCode != null ? '$name (${commune.postalCode})' : name;

                    return ListTile(
                      title: Text(
                        title,
                        style: TextStyle(
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected ? AafiyaColors.primaryBlue : AafiyaColors.primaryText,
                        ),
                      ),
                      trailing: isSelected ? const Icon(Icons.check_rounded, color: AafiyaColors.primaryBlue) : null,
                      onTap: () => widget.onSelected(commune),
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

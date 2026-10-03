import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';

/// Reusable accessible Medical Specialty selector consuming authoritative [MasterDataService].
/// Defensive safety rule: strictly excludes `RAD` and `PATH` from physician appointment selectors.
class AafiyaSpecialtySelector extends StatefulWidget {
  const AafiyaSpecialtySelector({
    super.key,
    required this.masterDataService,
    this.selectedSpecialtyId,
    this.onChanged,
    this.label,
    this.hint,
    this.enabled = true,
    this.includeAllOption = false,
    this.allOptionLabel,
    this.validator,
  });

  final MasterDataService masterDataService;
  final int? selectedSpecialtyId;
  final ValueChanged<MedicalSpecialty?>? onChanged;
  final String? label;
  final String? hint;
  final bool enabled;
  final bool includeAllOption;
  final String? allOptionLabel;
  final FormFieldValidator<String>? validator;

  @override
  State<AafiyaSpecialtySelector> createState() => _AafiyaSpecialtySelectorState();
}

class _AafiyaSpecialtySelectorState extends State<AafiyaSpecialtySelector> {
  List<MedicalSpecialty> _specialties = [];
  bool _isLoading = true;
  String? _errorMessage;
  MedicalSpecialty? _selectedSpecialty;

  @override
  void initState() {
    super.initState();
    _loadSpecialties();
  }

  @override
  void didUpdateWidget(covariant AafiyaSpecialtySelector oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedSpecialtyId != oldWidget.selectedSpecialtyId) {
      _syncSelectedSpecialty();
    }
  }

  Future<void> _loadSpecialties({bool forceRefresh = false}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.masterDataService.getSpecialties(forceRefresh: forceRefresh);
    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          // Additional defensive filter guaranteeing zero RAD/PATH presence
          _specialties = data.where((s) => s.isActive && s.code != 'RAD' && s.code != 'PATH').toList();
          _isLoading = false;
          _syncSelectedSpecialty();
        });
      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message.isNotEmpty
              ? exception.message
              : LocalizedStrings.of(context).errorLoadingSpecialties;
          _isLoading = false;
        });
    }
  }

  void _syncSelectedSpecialty() {
    if (widget.selectedSpecialtyId == null) {
      _selectedSpecialty = null;
    } else {
      _selectedSpecialty = _specialties.cast<MedicalSpecialty?>().firstWhere(
        (s) => s?.id == widget.selectedSpecialtyId,
        orElse: () => null,
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
        return _SpecialtySelectionSheet(
          specialties: _specialties,
          selectedSpecialtyId: widget.selectedSpecialtyId,
          includeAllOption: widget.includeAllOption,
          allOptionLabel: widget.allOptionLabel ?? strings.allSpecialties,
          strings: strings,
          onSelected: (specialty) {
            Navigator.of(ctx).pop();
            setState(() => _selectedSpecialty = specialty);
            widget.onChanged?.call(specialty);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final locale = Localizations.localeOf(context).languageCode;
    final effectiveLabel = widget.label ?? strings.specialtyLabel;
    final effectiveHint = widget.hint ?? strings.selectSpecialty;

    String displayText = '';
    if (_selectedSpecialty != null) {
      displayText = _selectedSpecialty!.localizedName(locale);
    } else if (widget.includeAllOption && widget.selectedSpecialtyId == null) {
      displayText = widget.allOptionLabel ?? strings.allSpecialties;
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
                    Icons.medical_services_outlined,
                    size: 20,
                    color: _errorMessage != null
                        ? AafiyaColors.error
                        : (_selectedSpecialty != null ? AafiyaColors.primaryBlue : AafiyaColors.secondaryText),
                  ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _isLoading
                        ? strings.loadingSpecialties
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
                    onPressed: () => _loadSpecialties(forceRefresh: true),
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

class _SpecialtySelectionSheet extends StatefulWidget {
  const _SpecialtySelectionSheet({
    required this.specialties,
    required this.selectedSpecialtyId,
    required this.includeAllOption,
    required this.allOptionLabel,
    required this.strings,
    required this.onSelected,
  });

  final List<MedicalSpecialty> specialties;
  final int? selectedSpecialtyId;
  final bool includeAllOption;
  final String allOptionLabel;
  final LocalizedStrings strings;
  final ValueChanged<MedicalSpecialty?> onSelected;

  @override
  State<_SpecialtySelectionSheet> createState() => _SpecialtySelectionSheetState();
}

class _SpecialtySelectionSheetState extends State<_SpecialtySelectionSheet> {
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
    final filtered = widget.specialties.where((s) {
      if (_filter.isEmpty) return true;
      final q = _filter.toLowerCase();
      return s.code.toLowerCase().contains(q) ||
          s.nameAr.contains(q) ||
          s.nameFr.toLowerCase().contains(q) ||
          s.nameEn.toLowerCase().contains(q);
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
                    widget.strings.selectSpecialty,
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
                    final isSelected = widget.selectedSpecialtyId == null;
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
                  final specialty = filtered[itemIndex];
                  final isSelected = widget.selectedSpecialtyId == specialty.id;

                  return ListTile(
                    title: Text(
                      specialty.localizedName(locale),
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? AafiyaColors.primaryBlue : AafiyaColors.primaryText,
                      ),
                    ),
                    trailing: isSelected ? const Icon(Icons.check_rounded, color: AafiyaColors.primaryBlue) : null,
                    onTap: () => widget.onSelected(specialty),
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

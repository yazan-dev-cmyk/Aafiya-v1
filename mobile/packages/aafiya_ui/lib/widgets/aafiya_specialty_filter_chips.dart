import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';

/// Reusable horizontal scrolling filter chips widget for Medical Specialties.
/// Consumes authoritative [MasterDataService] dynamically.
/// Strictly enforces the exclusion of `RAD` and `PATH` from physician appointment filters.
class AafiyaSpecialtyFilterChips extends StatefulWidget {
  const AafiyaSpecialtyFilterChips({
    super.key,
    required this.masterDataService,
    this.selectedSpecialtyId,
    this.onSpecialtySelected,
  });

  final MasterDataService masterDataService;
  final int? selectedSpecialtyId;
  final ValueChanged<int?>? onSpecialtySelected;

  @override
  State<AafiyaSpecialtyFilterChips> createState() => _AafiyaSpecialtyFilterChipsState();
}

class _AafiyaSpecialtyFilterChipsState extends State<AafiyaSpecialtyFilterChips> {
  List<MedicalSpecialty> _specialties = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSpecialties();
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

    if (_errorMessage != null && _specialties.isEmpty) {
      return Row(
        children: [
          Text(
            _errorMessage!,
            style: const TextStyle(color: AafiyaColors.error, fontSize: 12),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 16, color: AafiyaColors.error),
            onPressed: () => _loadSpecialties(forceRefresh: true),
          ),
        ],
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          FilterChip(
            label: Text(strings.allSpecialties),
            selected: widget.selectedSpecialtyId == null,
            onSelected: (selected) {
              if (selected) widget.onSpecialtySelected?.call(null);
            },
          ),
          for (final specialty in _specialties) ...[
            const SizedBox(width: AafiyaSpacing.sm),
            FilterChip(
              label: Text(specialty.localizedName(locale)),
              selected: widget.selectedSpecialtyId == specialty.id,
              onSelected: (selected) {
                widget.onSpecialtySelected?.call(selected ? specialty.id : null);
              },
            ),
          ],
        ],
      ),
    );
  }
}

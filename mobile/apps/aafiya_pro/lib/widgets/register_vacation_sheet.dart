import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal bottom sheet for registering a new Doctor Vacation.
///
/// Invariants & Policies:
/// - Immediate effectiveness without Director veto (DEC-VAC-01, DEC-AUTH-01).
/// - Multi-clinic scoping snapshot (DEC-VAC-04).
/// - 7-calendar-day relocation window warning (DEC-VAC-02).
/// - DOCTOR_VACATION_OVERLAP 422 error handling.
class RegisterVacationSheet extends StatefulWidget {
  const RegisterVacationSheet({
    super.key,
    required this.vacationService,
    required this.authorizedClinics,
    this.onVacationRegistered,
  });

  final DoctorVacationService vacationService;
  final List<DoctorClinic> authorizedClinics;
  final VoidCallback? onVacationRegistered;

  static Future<bool?> show(
    BuildContext context, {
    required DoctorVacationService vacationService,
    required List<DoctorClinic> authorizedClinics,
    VoidCallback? onVacationRegistered,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RegisterVacationSheet(
        vacationService: vacationService,
        authorizedClinics: authorizedClinics,
        onVacationRegistered: onVacationRegistered,
      ),
    );
  }

  @override
  State<RegisterVacationSheet> createState() => _RegisterVacationSheetState();
}

class _RegisterVacationSheetState extends State<RegisterVacationSheet> {
  final _reasonController = TextEditingController();
  final _notesController = TextEditingController();

  DateTime? _startDate;
  DateTime? _endDate;
  bool _selectAllClinics = true;
  late final Set<String> _selectedClinicIds;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedClinicIds = widget.authorizedClinics.map((c) => c.id).toSet();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<void> _pickStartDate() async {
    final now = DateTime.now();
    final initial = _startDate ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 730)),
    );

    if (picked != null) {
      setState(() {
        _startDate = picked;
        _errorMessage = null;
        if (_endDate != null && _endDate!.isBefore(picked)) {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _pickEndDate() async {
    final now = DateTime.now();
    final initial = _endDate ?? (_startDate ?? now);
    final first = _startDate ?? now.subtract(const Duration(days: 30));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : initial,
      firstDate: first,
      lastDate: now.add(const Duration(days: 730)),
    );

    if (picked != null) {
      setState(() {
        _endDate = picked;
        _errorMessage = null;
      });
    }
  }

  Future<void> _submit() async {
    final strings = LocalizedStrings.of(context);

    if (_startDate == null || _endDate == null) {
      setState(() {
        _errorMessage = strings.vacationEndDateBeforeStartDate;
      });
      return;
    }

    if (_endDate!.isBefore(_startDate!)) {
      setState(() {
        _errorMessage = strings.vacationEndDateBeforeStartDate;
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final List<String>? clinicIdsPayload;
    if (_selectAllClinics ||
        _selectedClinicIds.isEmpty ||
        _selectedClinicIds.length == widget.authorizedClinics.length) {
      clinicIdsPayload = null;
    } else {
      clinicIdsPayload = _selectedClinicIds.toList();
    }

    final result = await widget.vacationService.registerVacation(
      vacationStart: _formatDate(_startDate!),
      vacationEnd: _formatDate(_endDate!),
      clinicIds: clinicIdsPayload,
      reason: _reasonController.text.trim().isNotEmpty
          ? _reasonController.text.trim()
          : null,
      notes: _notesController.text.trim().isNotEmpty
          ? _notesController.text.trim()
          : null,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.vacationRegisteredSuccess),
            backgroundColor: AafiyaColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onVacationRegistered?.call();
        Navigator.of(context).pop(true);
      case ApiFailure(:final exception):
        final msg = exception.message.toLowerCase();
        final isOverlap = msg.contains('تتداخل') ||
            msg.contains('overlap') ||
            (exception is ApiException && exception.statusCode == 422);
        setState(() {
          _isSubmitting = false;
          _errorMessage =
              isOverlap ? strings.vacationOverlapError : exception.message;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final maxHeight = MediaQuery.of(context).size.height * 0.90;

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: const BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(AafiyaRadius.lg)),
      ),
      padding: EdgeInsets.fromLTRB(
        AafiyaSpacing.lg,
        AafiyaSpacing.md,
        AafiyaSpacing.lg,
        AafiyaSpacing.lg + bottomInset,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag Handle
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AafiyaColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Header
            Row(
              children: [
                const CircleAvatar(
                  backgroundColor: AafiyaColors.lightBackground,
                  foregroundColor: AafiyaColors.primaryBlue,
                  child: Icon(Icons.event_busy_rounded),
                ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        strings.registerVacationAction,
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        strings.doctorVacationsSubtitle,
                        style: AafiyaTypography.bodySmall.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(false),
                ),
              ],
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Immediate Effectiveness Policy Warning (DEC-VAC-01 & DEC-VAC-02)
            Container(
              padding: AafiyaSpacing.insetAllMd,
              decoration: BoxDecoration(
                color: AafiyaColors.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
                border: Border.all(
                  color: AafiyaColors.warning.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.info_outline_rounded,
                    color: AafiyaColors.warning,
                    size: 22,
                  ),
                  const SizedBox(width: AafiyaSpacing.sm),
                  Expanded(
                    child: Text(
                      strings.vacationImmediateEffectNotice,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.primaryText,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AafiyaSpacing.lg),

            // Date Pickers Row
            Row(
              children: [
                Expanded(
                  child: _buildDatePickerTile(
                    label: strings.vacationStartDate,
                    date: _startDate,
                    onTap: _pickStartDate,
                  ),
                ),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: _buildDatePickerTile(
                    label: strings.vacationEndDate,
                    date: _endDate,
                    onTap: _pickEndDate,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Clinic Scope Selection
            if (widget.authorizedClinics.isNotEmpty) ...[
              Text(
                strings.selectClinicsScope,
                style: AafiyaTypography.bodyMedium.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AafiyaSpacing.xs),
              CheckboxListTile(
                value: _selectAllClinics,
                dense: true,
                contentPadding: EdgeInsets.zero,
                activeColor: AafiyaColors.primaryBlue,
                title: Text(
                  strings.selectAllClinics,
                  style: AafiyaTypography.bodyMedium,
                ),
                subtitle: Text(
                  strings.allClinicsIncludedNotice,
                  style: AafiyaTypography.bodySmall.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                ),
                onChanged: (val) {
                  setState(() {
                    _selectAllClinics = val ?? true;
                    if (_selectAllClinics) {
                      _selectedClinicIds.addAll(
                        widget.authorizedClinics.map((c) => c.id),
                      );
                    }
                  });
                },
              ),
              if (!_selectAllClinics) ...[
                const SizedBox(height: AafiyaSpacing.xs),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: widget.authorizedClinics.map((clinic) {
                    final isSelected = _selectedClinicIds.contains(clinic.id);
                    return FilterChip(
                      selected: isSelected,
                      label: Text(clinic.name),
                      selectedColor:
                          AafiyaColors.primaryBlue.withValues(alpha: 0.15),
                      checkmarkColor: AafiyaColors.primaryBlue,
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _selectedClinicIds.add(clinic.id);
                          } else {
                            _selectedClinicIds.remove(clinic.id);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: AafiyaSpacing.md),
            ],

            // Reason Input
            TextFormField(
              controller: _reasonController,
              decoration: InputDecoration(
                labelText: strings.vacationReason,
                hintText: strings.vacationReason,
                filled: true,
                fillColor: AafiyaColors.lightBackground,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Notes Input
            TextFormField(
              controller: _notesController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: strings.vacationNotes,
                hintText: strings.vacationNotes,
                filled: true,
                fillColor: AafiyaColors.lightBackground,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AafiyaRadius.md),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: AafiyaSpacing.md),

            // Error Message Banner
            if (_errorMessage != null) ...[
              Container(
                padding: AafiyaSpacing.insetAllSm,
                decoration: BoxDecoration(
                  color: AafiyaColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      color: AafiyaColors.error,
                      size: 20,
                    ),
                    const SizedBox(width: AafiyaSpacing.xs),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: AafiyaTypography.bodySmall.copyWith(
                          color: AafiyaColors.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AafiyaSpacing.md),
            ],

            // Submit Button
            AafiyaButton(
              label: strings.registerVacationAction,
              isLoading: _isSubmitting,
              onPressed: _isSubmitting ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDatePickerTile({
    required String label,
    required DateTime? date,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AafiyaRadius.md),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AafiyaColors.lightBackground,
          borderRadius: BorderRadius.circular(AafiyaRadius.md),
          border: Border.all(color: AafiyaColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.secondaryText,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(
                  Icons.calendar_today_rounded,
                  size: 16,
                  color: AafiyaColors.primaryBlue,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    date != null ? _formatDate(date) : 'YYYY-MM-DD',
                    style: AafiyaTypography.bodyMedium.copyWith(
                      fontWeight:
                          date != null ? FontWeight.bold : FontWeight.normal,
                      color: date != null
                          ? AafiyaColors.primaryText
                          : AafiyaColors.secondaryText,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

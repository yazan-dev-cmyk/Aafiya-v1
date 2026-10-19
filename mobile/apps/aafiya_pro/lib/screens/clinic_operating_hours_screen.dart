import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Clinic Operating Hours Configuration Screen for Clinic Directors (CD-02 / WP-PARITY-DIR).
///
/// Invariants:
/// - Exact 7-day canonical mapping: 0=Saturday ... 6=Friday.
/// - Unconfigured clinics block patient bookings with CLINIC_SCHEDULE_NOT_CONFIGURED (DEC-HOURS-03).
/// - Dynamic split-shift periods support (e.g., 08:00-12:00 and 13:00-17:00).
/// - Local validation: Open time must precede close time for every period.
/// - Backend 4D authorization: 403 Forbidden surfaced if actor lacks director/settings privileges.
/// - Active clinic context listener: Reloads schedule when clinic changes to prevent stale leakage.
class ClinicOperatingHoursScreen extends StatefulWidget {
  const ClinicOperatingHoursScreen({
    super.key,
    required this.sessionManager,
    this.clinicId,
    this.service,
    this.apiClient,
  });

  final AuthSessionManager sessionManager;
  final String? clinicId;
  final ClinicOperatingHoursService? service;
  final ApiClient? apiClient;

  static Route<void> route({
    required AuthSessionManager sessionManager,
    String? clinicId,
    ClinicOperatingHoursService? service,
    ApiClient? apiClient,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => ClinicOperatingHoursScreen(
        sessionManager: sessionManager,
        clinicId: clinicId,
        service: service,
        apiClient: apiClient,
      ),
    );
  }

  @override
  State<ClinicOperatingHoursScreen> createState() => _ClinicOperatingHoursScreenState();
}

class _ClinicOperatingHoursScreenState extends State<ClinicOperatingHoursScreen> {
  late final ClinicOperatingHoursService _service;
  late String _activeClinicId;

  List<ClinicOperatingDay> _days = ClinicOperatingHoursData.unconfiguredDays();
  bool _isConfigured = false;
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _service = widget.service ??
        ClinicOperatingHoursService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );
    _activeClinicId = widget.clinicId ?? widget.sessionManager.activeClinicId ?? '';
    widget.sessionManager.addListener(_onSessionChanged);
    _loadOperatingHours();
  }

  @override
  void dispose() {
    widget.sessionManager.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    final newClinicId = widget.clinicId ?? widget.sessionManager.activeClinicId ?? '';
    if (newClinicId != _activeClinicId) {
      setState(() {
        _activeClinicId = newClinicId;
      });
      _loadOperatingHours();
    }
  }

  Future<void> _loadOperatingHours() async {
    if (_activeClinicId.isEmpty) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'معرف العيادة غير متوفر. يرجى اختيار عيادة أولاً.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final result = await _service.getOperatingHours(clinicId: _activeClinicId);

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _isConfigured = data.isConfigured;
          _isLoading = false;

          if (data.days.isNotEmpty) {
            final loadedMap = {for (final d in data.days) d.dayOfWeek: d};
            _days = List.generate(7, (d) {
              final existing = loadedMap[d];
              if (existing != null) {
                return ClinicOperatingDay(
                  dayOfWeek: d,
                  isClosed: existing.isClosed,
                  periods: List<ClinicOperatingPeriod>.from(existing.periods),
                );
              }
              return ClinicOperatingDay(
                dayOfWeek: d,
                isClosed: true,
                periods: const [],
              );
            });
          } else {
            _days = ClinicOperatingHoursData.unconfiguredDays();
          }
        });

      case ApiFailure(:final exception):
        setState(() {
          _isLoading = false;
          _errorMessage = exception.message;
        });
    }
  }

  void _handleToggleDay(int dayOfWeek) {
    setState(() {
      _days = _days.map((d) {
        if (d.dayOfWeek == dayOfWeek) {
          final willBeClosed = !d.isClosed;
          final updatedPeriods = willBeClosed
              ? <ClinicOperatingPeriod>[]
              : (d.periods.isNotEmpty
                  ? d.periods
                  : const [
                      ClinicOperatingPeriod(
                        periodIndex: 0,
                        openTime: '08:00',
                        closeTime: '17:00',
                      ),
                    ]);
          return d.copyWith(
            isClosed: willBeClosed,
            periods: updatedPeriods,
          );
        }
        return d;
      }).toList();
    });
  }

  void _handleAddPeriod(int dayOfWeek) {
    setState(() {
      _days = _days.map((d) {
        if (d.dayOfWeek == dayOfWeek) {
          final updatedPeriods = List<ClinicOperatingPeriod>.from(d.periods);
          final nextIndex = updatedPeriods.length;
          updatedPeriods.add(
            ClinicOperatingPeriod(
              periodIndex: nextIndex,
              openTime: '13:00',
              closeTime: '17:00',
            ),
          );
          return d.copyWith(
            isClosed: false,
            periods: updatedPeriods,
          );
        }
        return d;
      }).toList();
    });
  }

  void _handleRemovePeriod(int dayOfWeek, int periodIndex) {
    setState(() {
      _days = _days.map((d) {
        if (d.dayOfWeek == dayOfWeek) {
          final updatedPeriods = List<ClinicOperatingPeriod>.from(d.periods);
          if (periodIndex >= 0 && periodIndex < updatedPeriods.length) {
            updatedPeriods.removeAt(periodIndex);
          }
          final isClosedNow = updatedPeriods.isEmpty;
          return d.copyWith(
            isClosed: isClosedNow,
            periods: updatedPeriods,
          );
        }
        return d;
      }).toList();
    });
  }

  void _handleUpdateTime(
    int dayOfWeek,
    int periodIdx, {
    String? openTime,
    String? closeTime,
  }) {
    setState(() {
      _days = _days.map((d) {
        if (d.dayOfWeek == dayOfWeek) {
          final updatedPeriods = List<ClinicOperatingPeriod>.from(d.periods);
          if (periodIdx >= 0 && periodIdx < updatedPeriods.length) {
            final current = updatedPeriods[periodIdx];
            updatedPeriods[periodIdx] = current.copyWith(
              openTime: openTime ?? current.openTime,
              closeTime: closeTime ?? current.closeTime,
            );
          }
          return d.copyWith(periods: updatedPeriods);
        }
        return d;
      }).toList();
    });
  }

  String? _validateLocalInput(LocalizedStrings strings) {
    for (final day in _days) {
      if (!day.isClosed) {
        if (day.periods.isEmpty) {
          final dayName = strings.getDayName(day.dayOfWeek);
          return '${strings.noPeriodsInOpenDayError} ($dayName)';
        }
        for (final p in day.periods) {
          if (p.openTime.isEmpty || p.closeTime.isEmpty) {
            final dayName = strings.getDayName(day.dayOfWeek);
            return '$dayName: ${strings.timeOrderError}';
          }
          if (p.openTime.compareTo(p.closeTime) >= 0) {
            final dayName = strings.getDayName(day.dayOfWeek);
            return '$dayName: ${strings.timeOrderError} (${p.openTime} -> ${p.closeTime})';
          }
        }
      }
    }
    return null;
  }

  Future<void> _handleSave() async {
    if (_isSaving) return;

    final strings = LocalizedStrings.of(context);
    final validationError = _validateLocalInput(strings);
    if (validationError != null) {
      setState(() {
        _errorMessage = validationError;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(validationError),
          backgroundColor: AafiyaColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final result = await _service.saveOperatingHours(
      days: _days,
      clinicId: _activeClinicId,
    );

    if (!mounted) return;

    setState(() {
      _isSaving = false;
    });

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _isConfigured = data.isConfigured;
          _successMessage = strings.clinicHoursSavedSuccess;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.clinicHoursSavedSuccess),
            backgroundColor: AafiyaColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );

      case ApiFailure(:final exception):
        setState(() {
          _errorMessage = exception.message;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exception.message),
            backgroundColor: AafiyaColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }

  Future<void> _pickTime({
    required BuildContext context,
    required String currentTime,
    required ValueChanged<String> onSelected,
  }) async {
    final parts = currentTime.split(':');
    final initialHour = parts.isNotEmpty ? int.tryParse(parts[0]) ?? 8 : 8;
    final initialMinute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;

    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: initialHour, minute: initialMinute),
    );

    if (picked != null) {
      final hourStr = picked.hour.toString().padLeft(2, '0');
      final minStr = picked.minute.toString().padLeft(2, '0');
      onSelected('$hourStr:$minStr');
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final activeClinic = widget.sessionManager.activeClinic;
    final isDirector = activeClinic?.isMedicalDirector == true;

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.clinicOperatingHoursTitle,
        showBrandMark: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: strings.retry,
            onPressed: _isLoading ? null : _loadOperatingHours,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null && _days.every((d) => d.periods.isEmpty)
              ? Center(
                  child: Padding(
                    padding: AafiyaSpacing.insetScreen,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          size: 48,
                          color: AafiyaColors.error,
                        ),
                        const SizedBox(height: AafiyaSpacing.md),
                        Text(
                          _errorMessage!,
                          style: AafiyaTypography.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AafiyaSpacing.md),
                        AafiyaButton(
                          label: strings.retry,
                          variant: AafiyaButtonVariant.outline,
                          onPressed: _loadOperatingHours,
                        ),
                      ],
                    ),
                  ),
                )
              : _buildContent(context, strings, isDirector),
      bottomNavigationBar: (!_isLoading && isDirector)
          ? _buildBottomActionBar(context, strings)
          : null,
    );
  }

  Widget _buildContent(
    BuildContext context,
    LocalizedStrings strings,
    bool isDirector,
  ) {
    return ListView(
      padding: AafiyaSpacing.insetScreen,
      children: [
        // Role Notice if not medical director
        if (!isDirector) ...[
          Container(
            padding: AafiyaSpacing.insetAllSm,
            margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
            decoration: BoxDecoration(
              color: AafiyaColors.warning.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
              border: Border.all(color: AafiyaColors.warning.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.shield_outlined, color: AafiyaColors.warning, size: 22),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    strings.clinicDirectorOnlyNotice,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.warning,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],

        // Status Banner (Configured vs Unconfigured)
        _buildStatusBanner(context, strings),
        const SizedBox(height: AafiyaSpacing.md),

        if (_errorMessage != null) ...[
          Container(
            padding: AafiyaSpacing.insetAllSm,
            margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
            decoration: BoxDecoration(
              color: AafiyaColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
              border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AafiyaColors.error, size: 20),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: AafiyaTypography.caption.copyWith(color: AafiyaColors.error),
                  ),
                ),
              ],
            ),
          ),
        ],

        if (_successMessage != null) ...[
          Container(
            padding: AafiyaSpacing.insetAllSm,
            margin: const EdgeInsets.only(bottom: AafiyaSpacing.md),
            decoration: BoxDecoration(
              color: AafiyaColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
              border: Border.all(color: AafiyaColors.success.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline, color: AafiyaColors.success, size: 20),
                const SizedBox(width: AafiyaSpacing.sm),
                Expanded(
                  child: Text(
                    _successMessage!,
                    style: AafiyaTypography.caption.copyWith(color: AafiyaColors.success),
                  ),
                ),
              ],
            ),
          ),
        ],

        // 7 Canonical Weekdays
        ..._days.map((dayItem) => _buildDayCard(context, strings, dayItem, isDirector)),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildStatusBanner(BuildContext context, LocalizedStrings strings) {
    if (_isConfigured) {
      return Container(
        padding: AafiyaSpacing.insetAllMd,
        decoration: BoxDecoration(
          color: AafiyaColors.success.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(AafiyaRadius.lg),
          border: Border.all(color: AafiyaColors.success.withValues(alpha: 0.3)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AafiyaColors.success.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: AafiyaColors.success,
                size: 24,
              ),
            ),
            const SizedBox(width: AafiyaSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    strings.clinicHoursConfiguredStatus,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.success,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    strings.clinicOperatingHoursSubtitle,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AafiyaRadius.lg),
        border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AafiyaColors.error.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
            ),
            child: const Icon(
              Icons.warning_amber_rounded,
              color: AafiyaColors.error,
              size: 24,
            ),
          ),
          const SizedBox(width: AafiyaSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.clinicHoursNotConfiguredStatus,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.error,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  strings.clinicHoursNotConfiguredNotice,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.error,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDayCard(
    BuildContext context,
    LocalizedStrings strings,
    ClinicOperatingDay dayItem,
    bool isDirector,
  ) {
    final dayName = strings.getDayName(dayItem.dayOfWeek);
    final isOpen = !dayItem.isClosed;

    return Card(
      margin: const EdgeInsets.only(bottom: AafiyaSpacing.sm),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AafiyaRadius.md),
        side: BorderSide(
          color: isOpen ? AafiyaColors.primaryBlue.withValues(alpha: 0.3) : AafiyaColors.border,
        ),
      ),
      child: Padding(
        padding: AafiyaSpacing.insetAllSm,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(
                        dayName,
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isOpen ? AafiyaColors.primaryText : AafiyaColors.secondaryText,
                        ),
                      ),
                      const SizedBox(width: AafiyaSpacing.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isOpen
                              ? AafiyaColors.healthBlue.withValues(alpha: 0.1)
                              : AafiyaColors.lightBackground,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          isOpen
                              ? '${dayItem.periods.length} ${strings.periodLabel}'
                              : strings.closedDayLabel,
                          style: AafiyaTypography.caption.copyWith(
                            color: isOpen ? AafiyaColors.healthBlue : AafiyaColors.secondaryText,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  key: Key('switch_day_${dayItem.dayOfWeek}'),
                  value: isOpen,
                  activeTrackColor: AafiyaColors.healthBlue,
                  onChanged: isDirector ? (_) => _handleToggleDay(dayItem.dayOfWeek) : null,
                ),
              ],
            ),
            if (isOpen) ...[
              const Divider(height: 16),
              ...dayItem.periods.asMap().entries.map((entry) {
                final idx = entry.key;
                final period = entry.value;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Text(
                        '#${idx + 1}',
                        style: AafiyaTypography.caption.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AafiyaColors.secondaryText,
                        ),
                      ),
                      const SizedBox(width: AafiyaSpacing.sm),

                      // Open time selector
                      Expanded(
                        child: OutlinedButton(
                          key: Key('open_time_${dayItem.dayOfWeek}_$idx'),
                          onPressed: isDirector
                              ? () => _pickTime(
                                    context: context,
                                    currentTime: period.openTime,
                                    onSelected: (time) => _handleUpdateTime(
                                      dayItem.dayOfWeek,
                                      idx,
                                      openTime: time,
                                    ),
                                  )
                              : null,
                          style: OutlinedButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          ),
                          child: Text('${strings.openTimeLabel}: ${period.openTime}'),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Close time selector
                      Expanded(
                        child: OutlinedButton(
                          key: Key('close_time_${dayItem.dayOfWeek}_$idx'),
                          onPressed: isDirector
                              ? () => _pickTime(
                                    context: context,
                                    currentTime: period.closeTime,
                                    onSelected: (time) => _handleUpdateTime(
                                      dayItem.dayOfWeek,
                                      idx,
                                      closeTime: time,
                                    ),
                                  )
                              : null,
                          style: OutlinedButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          ),
                          child: Text('${strings.closeTimeLabel}: ${period.closeTime}'),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Remove period button
                      if (isDirector)
                        IconButton(
                          key: Key('remove_period_${dayItem.dayOfWeek}_$idx'),
                          icon: const Icon(Icons.delete_outline, size: 20),
                          color: AafiyaColors.error,
                          onPressed: () => _handleRemovePeriod(dayItem.dayOfWeek, idx),
                        ),
                    ],
                  ),
                );
              }),
              if (isDirector) ...[
                const SizedBox(height: 6),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: TextButton.icon(
                    key: Key('add_period_button_${dayItem.dayOfWeek}'),
                    icon: const Icon(Icons.add_circle_outline, size: 16),
                    label: Text(strings.addPeriod),
                    onPressed: () => _handleAddPeriod(dayItem.dayOfWeek),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBottomActionBar(BuildContext context, LocalizedStrings strings) {
    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            offset: const Offset(0, -4),
            blurRadius: 10,
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            key: const Key('save_clinic_hours_button'),
            icon: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(AafiyaColors.pureWhite),
                    ),
                  )
                : const Icon(Icons.save_rounded, size: 20),
            label: Text(_isSaving ? strings.savingClinicHours : strings.saveClinicHours),
            onPressed: _isSaving ? null : _handleSave,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              backgroundColor: AafiyaColors.primaryBlue,
              foregroundColor: AafiyaColors.pureWhite,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AafiyaRadius.md),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

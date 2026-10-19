import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../widgets/schedule_activation_dialog.dart';

/// Doctor Weekly Working Hours & Schedule Activation Screen.
///
/// Implements full Flutter ↔ Web parity for TASK-PAR-DOC-03:
/// - Weekday canonical mapping (0 = Saturday ... 6 = Friday).
/// - 60-minute hourly slots from 08:00 to 16:00 (17:00 strictly excluded).
/// - Draft saving before activation.
/// - Atomic activation and permanent irreversible lock under AAFIYA V1 policy.
/// - Contraction conflict detection and locked state handling.
class DoctorWorkingHoursScreen extends StatefulWidget {
  const DoctorWorkingHoursScreen({
    super.key,
    required this.sessionManager,
    required this.user,
    this.clinicId,
    this.service,
    this.apiClient,
  });

  final AuthSessionManager sessionManager;
  final User user;
  final String? clinicId;
  final DoctorWorkingHoursService? service;
  final ApiClient? apiClient;

  static Route<void> route({
    required AuthSessionManager sessionManager,
    required User user,
    String? clinicId,
    DoctorWorkingHoursService? service,
    ApiClient? apiClient,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => DoctorWorkingHoursScreen(
        sessionManager: sessionManager,
        user: user,
        clinicId: clinicId,
        service: service,
        apiClient: apiClient,
      ),
    );
  }

  @override
  State<DoctorWorkingHoursScreen> createState() => _DoctorWorkingHoursScreenState();
}

class _DoctorWorkingHoursScreenState extends State<DoctorWorkingHoursScreen> {
  late final DoctorWorkingHoursService _service;
  late String _clinicId;

  List<DoctorDayScheduleItem> _days = DoctorWorkingHoursData.defaultDays();
  DoctorWorkingHoursData? _scheduleData;

  bool _isLoading = true;
  bool _isSavingDraft = false;
  String? _errorMessage;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _service = widget.service ??
        DoctorWorkingHoursService(
          apiClient: widget.apiClient ?? widget.sessionManager.apiClient,
        );
    _clinicId = widget.clinicId ?? widget.sessionManager.activeClinicId ?? '';
    _loadSchedule();
  }

  bool get _isLocked => _scheduleData?.isActivated == true;

  Future<void> _loadSchedule() async {
    if (_clinicId.isEmpty) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'معرف العيادة غير متوفر. يرجى اختيار عيادة أولاً.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _service.getSchedule(
      doctorId: widget.user.id,
      clinicId: _clinicId,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _scheduleData = data;
          _isLoading = false;

          if (data.days.isNotEmpty) {
            // Merge with canonical weekdays to ensure 7 days present
            final loadedMap = {for (final d in data.days) d.dayOfWeek: d};
            _days = kWeekdaysOrder.map((d) {
              final found = loadedMap[d];
              if (found != null) {
                return DoctorDayScheduleItem(
                  dayOfWeek: d,
                  isClosed: found.isClosed,
                  slots: List<String>.from(found.slots)..sort(),
                );
              }
              return DoctorDayScheduleItem(
                dayOfWeek: d,
                isClosed: true,
                slots: const [],
              );
            }).toList();
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
    if (_isLocked) return;

    setState(() {
      _days = _days.map((d) {
        if (d.dayOfWeek == dayOfWeek) {
          final willBeClosed = !d.isClosed;
          return d.copyWith(
            isClosed: willBeClosed,
            slots: willBeClosed
                ? const []
                : (d.slots.isNotEmpty
                    ? d.slots
                    : const [
                        '08:00',
                        '09:00',
                        '10:00',
                        '11:00',
                        '13:00',
                        '14:00',
                        '15:00',
                        '16:00',
                      ]),
          );
        }
        return d;
      }).toList();
    });
  }

  void _handleToggleSlot(int dayOfWeek, String slotTime) {
    if (_isLocked) return;

    setState(() {
      _days = _days.map((d) {
        if (d.dayOfWeek == dayOfWeek) {
          final currentSlots = List<String>.from(d.slots);
          if (currentSlots.contains(slotTime)) {
            currentSlots.remove(slotTime);
          } else {
            currentSlots.add(slotTime);
            currentSlots.sort();
          }
          final isClosedNow = currentSlots.isEmpty ? true : d.isClosed;
          return d.copyWith(
            slots: currentSlots,
            isClosed: isClosedNow,
          );
        }
        return d;
      }).toList();
    });
  }

  Future<void> _handleSaveDraft() async {
    if (_isLocked || _isSavingDraft) return;

    setState(() {
      _isSavingDraft = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final strings = LocalizedStrings.of(context);
    final result = await _service.saveDraft(
      doctorId: widget.user.id,
      days: _days,
      clinicId: _clinicId,
    );

    if (!mounted) return;

    setState(() {
      _isSavingDraft = false;
    });

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _scheduleData = data;
          _successMessage = strings.scheduleDraftSavedSuccess;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.scheduleDraftSavedSuccess),
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

  Future<void> _handleOpenActivationDialog() async {
    if (_isLocked) return;

    final strings = LocalizedStrings.of(context);

    await ScheduleActivationDialog.show(
      context,
      days: _days,
      onConfirm: () async {
        final result = await _service.activateSchedule(
          doctorId: widget.user.id,
          clinicId: _clinicId,
        );

        if (!mounted) return;

        switch (result) {
          case ApiSuccess(:final data):
            setState(() {
              _scheduleData = data;
              _successMessage = strings.scheduleActivatedSuccess;
              _errorMessage = null;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(strings.scheduleActivatedSuccess),
                backgroundColor: AafiyaColors.success,
                behavior: SnackBarBehavior.floating,
              ),
            );

          case ApiFailure(:final exception):
            throw Exception(exception.message);
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.doctorWorkingHoursTitle,
        showBrandMark: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: strings.retry,
            onPressed: _isLoading ? null : _loadSchedule,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null && _scheduleData == null
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
                          onPressed: _loadSchedule,
                        ),
                      ],
                    ),
                  ),
                )
              : _buildScheduleBody(context, strings),
      bottomNavigationBar: (!_isLoading && !_isLocked)
          ? _buildBottomActionBar(context, strings)
          : null,
    );
  }

  Widget _buildScheduleBody(BuildContext context, LocalizedStrings strings) {
    return ListView(
      padding: AafiyaSpacing.insetScreen,
      children: [
        // Status & Policy Banner
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

        // 7 Weekdays Editor Cards
        ..._days.map((dayItem) => _buildDayCard(context, strings, dayItem)),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildStatusBanner(BuildContext context, LocalizedStrings strings) {
    if (_isLocked) {
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
                Icons.lock_rounded,
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
                    strings.scheduleActivatedStatus,
                    style: AafiyaTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.success,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    strings.scheduleLockedWarning,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
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

    return Container(
      padding: AafiyaSpacing.insetAllMd,
      decoration: BoxDecoration(
        color: AafiyaColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AafiyaRadius.lg),
        border: Border.all(color: AafiyaColors.warning.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AafiyaColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
            ),
            child: const Icon(
              Icons.lock_open_rounded,
              color: AafiyaColors.warning,
              size: 24,
            ),
          ),
          const SizedBox(width: AafiyaSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.scheduleDraftStatus,
                  style: AafiyaTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AafiyaColors.warning,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  strings.doctorWorkingHoursSubtitle,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
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
    DoctorDayScheduleItem dayItem,
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
                              ? '${dayItem.slots.length} ${strings.slots}'
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
                  value: isOpen,
                  activeTrackColor: AafiyaColors.healthBlue,
                  onChanged: _isLocked ? null : (_) => _handleToggleDay(dayItem.dayOfWeek),
                ),
              ],
            ),
            if (isOpen) ...[
              const Divider(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: kAllowedHourlySlots.map((slot) {
                  final isSelected = dayItem.slots.contains(slot);
                  return FilterChip(
                    key: Key('slot_${dayItem.dayOfWeek}_$slot'),
                    label: Text(slot),
                    selected: isSelected,
                    onSelected: _isLocked
                        ? null
                        : (_) => _handleToggleSlot(dayItem.dayOfWeek, slot),
                    selectedColor: AafiyaColors.primaryBlue.withValues(alpha: 0.15),
                    checkmarkColor: AafiyaColors.primaryBlue,
                    labelStyle: AafiyaTypography.caption.copyWith(
                      color: isSelected ? AafiyaColors.primaryBlue : AafiyaColors.primaryText,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    side: BorderSide(
                      color: isSelected ? AafiyaColors.primaryBlue : AafiyaColors.border,
                    ),
                  );
                }).toList(),
              ),
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
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                key: const Key('save_draft_button'),
                icon: _isSavingDraft
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined, size: 18),
                label: Text(
                  _isSavingDraft ? strings.savingScheduleDraft : strings.saveScheduleDraft,
                ),
                onPressed: _isSavingDraft ? null : _handleSaveDraft,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  foregroundColor: AafiyaColors.primaryBlue,
                  side: const BorderSide(color: AafiyaColors.primaryBlue),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AafiyaRadius.md),
                  ),
                ),
              ),
            ),
            const SizedBox(width: AafiyaSpacing.md),
            Expanded(
              child: ElevatedButton.icon(
                key: const Key('activate_schedule_button'),
                icon: const Icon(Icons.lock_outline_rounded, size: 18),
                label: Text(strings.activateSchedule),
                onPressed: _isSavingDraft ? null : _handleOpenActivationDialog,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: AafiyaColors.healthBlue,
                  foregroundColor: AafiyaColors.pureWhite,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AafiyaRadius.md),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

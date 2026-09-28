import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import '../screens/patient_summary_sheet.dart';
import '../screens/assistant_booking_screen.dart';

/// Patient directory lookup sheet for doctor assistants within clinic boundaries.
class AssistantPatientSearchSheet extends StatefulWidget {
  const AssistantPatientSearchSheet({
    super.key,
    required this.queueService,
    required this.apiClient,
    this.sessionManager,
    this.user,
    this.onBookReturnVisit,
  });

  final AssistantQueueService queueService;
  final ApiClient apiClient;
  final AuthSessionManager? sessionManager;
  final User? user;
  final ValueChanged<PatientSearchResult>? onBookReturnVisit;

  static Future<void> show(
    BuildContext context, {
    required AssistantQueueService queueService,
    required ApiClient apiClient,
    AuthSessionManager? sessionManager,
    User? user,
    ValueChanged<PatientSearchResult>? onBookReturnVisit,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AssistantPatientSearchSheet(
        queueService: queueService,
        apiClient: apiClient,
        sessionManager: sessionManager,
        user: user,
        onBookReturnVisit: onBookReturnVisit,
      ),
    );
  }

  @override
  State<AssistantPatientSearchSheet> createState() => _AssistantPatientSearchSheetState();
}

class _AssistantPatientSearchSheetState extends State<AssistantPatientSearchSheet> {
  final _searchController = TextEditingController();
  bool _isLoading = false;
  List<PatientSearchResult> _results = [];
  String? _errorMessage;
  bool _hasSearched = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _performSearch([String? query]) async {
    final q = (query ?? _searchController.text).trim();
    if (q.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _hasSearched = true;
    });

    final result = await widget.queueService.searchPatients(query: q);

    if (!mounted) return;

    setState(() {
      _isLoading = false;
      switch (result) {
        case ApiSuccess(:final data):
          _results = data;
        case ApiFailure(:final exception):
          _errorMessage = exception.message;
          _results = [];
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AafiyaColors.pureWhite,
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(AafiyaRadius.xl),
            ),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AafiyaSpacing.lg,
            vertical: AafiyaSpacing.md,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AafiyaColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: AafiyaSpacing.md),

              // Title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.person_search_rounded,
                        color: AafiyaColors.healingGreen,
                        size: 24,
                      ),
                      const SizedBox(width: AafiyaSpacing.sm),
                      Text(
                        strings.assistantPatientsTab,
                        style: AafiyaTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: AafiyaSpacing.sm),

              // Search Bar
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: strings.searchPatientsPrompt,
                        prefixIcon: const Icon(Icons.search_rounded, size: 20),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AafiyaRadius.md),
                          borderSide: const BorderSide(color: AafiyaColors.border),
                        ),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: AafiyaSpacing.sm,
                          vertical: AafiyaSpacing.sm,
                        ),
                      ),
                      textInputAction: TextInputAction.search,
                      onSubmitted: _performSearch,
                    ),
                  ),
                  const SizedBox(width: AafiyaSpacing.sm),
                  IconButton(
                    style: IconButton.styleFrom(
                      backgroundColor: AafiyaColors.healingGreen,
                    ),
                    icon: _isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AafiyaColors.pureWhite,
                            ),
                          )
                        : const Icon(Icons.arrow_forward_rounded, color: AafiyaColors.pureWhite),
                    onPressed: _isLoading ? null : () => _performSearch(),
                  ),
                ],
              ),
              const SizedBox(height: AafiyaSpacing.md),

              // Results List
              Expanded(
                child: _buildBody(strings, scrollController),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBody(LocalizedStrings strings, ScrollController scrollController) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: AafiyaErrorView(
          title: strings.errorTitle,
          message: _errorMessage!,
          onRetry: () => _performSearch(),
          retryLabel: strings.retry,
        ),
      );
    }

    if (!_hasSearched) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.manage_search_rounded,
              size: 48,
              color: AafiyaColors.secondaryText.withValues(alpha: 0.5),
            ),
            const SizedBox(height: AafiyaSpacing.sm),
            Text(
              strings.searchPatientsPrompt,
              style: AafiyaTypography.caption.copyWith(
                color: AafiyaColors.secondaryText,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    if (_results.isEmpty) {
      return Center(
        child: AafiyaEmptyView(
          icon: Icons.person_off_outlined,
          title: strings.emptyTitle,
          message: strings.noPatientsFound,
        ),
      );
    }

    return ListView.separated(
      controller: scrollController,
      itemCount: _results.length,
      separatorBuilder: (_, __) => const Divider(height: 1, color: AafiyaColors.border),
      itemBuilder: (context, index) {
        final patient = _results[index];
        final canViewContacts = widget.user?.hasPermission('patient.view_contacts') ?? false;
        final canCreateBooking = widget.user?.hasPermission('booking.create') ?? false;

        return Material(
          color: Colors.transparent,
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AafiyaSpacing.xs,
              vertical: AafiyaSpacing.xs,
            ),
            leading: CircleAvatar(
              backgroundColor: AafiyaColors.healingGreen.withValues(alpha: 0.12),
              child: Text(
                patient.firstName.isNotEmpty ? patient.firstName[0].toUpperCase() : 'P',
                style: AafiyaTypography.bodyMedium.copyWith(
                  color: AafiyaColors.healingGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            title: Text(
              patient.fullName,
              style: AafiyaTypography.bodyMedium.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            subtitle: Wrap(
              spacing: AafiyaSpacing.sm,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (patient.mrn.isNotEmpty)
                  Text(
                    '${strings.patientMrnLabel}: ${patient.mrn}',
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                Text(
                  canViewContacts ? (patient.phone?.isNotEmpty == true ? patient.phone! : '—') : '—',
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                  ),
                ),
              ],
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (canCreateBooking && (widget.sessionManager != null && widget.user != null || widget.onBookReturnVisit != null))
                  IconButton(
                    key: ValueKey('book_return_visit_${patient.id}'),
                    icon: const Icon(Icons.calendar_today_rounded, size: 20, color: AafiyaColors.healthBlue),
                    tooltip: strings.bookReturnVisitAction,
                    onPressed: () {
                      Navigator.of(context).pop();
                      if (widget.onBookReturnVisit != null) {
                        widget.onBookReturnVisit!(patient);
                      } else if (widget.sessionManager != null && widget.user != null) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => AssistantBookingScreen(
                              sessionManager: widget.sessionManager!,
                              user: widget.user!,
                              apiClient: widget.apiClient,
                              initialPatient: patient,
                            ),
                          ),
                        );
                      }
                    },
                  ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AafiyaColors.secondaryText,
                ),
              ],
            ),
            onTap: () {
              PatientSummarySheet.show(
                context,
                apiClient: widget.apiClient,
                patientId: patient.id,
                patientName: patient.fullName,
                mrn: patient.mrn,
              );
            },
          ),
        );
      },
    );
  }
}

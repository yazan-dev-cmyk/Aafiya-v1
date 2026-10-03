import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Modal bottom sheet providing dual pathways for adding a doctor:
/// 1. Lookup & Invite an existing doctor by name/email/phone.
/// 2. Provision a new employed doctor account.
class AddDoctorSheet extends StatefulWidget {
  const AddDoctorSheet({
    super.key,
    required this.staffService,
    required this.clinicId,
    required this.onDoctorAdded,
    this.masterDataService,
  });

  final ClinicStaffService staffService;
  final String clinicId;
  final VoidCallback onDoctorAdded;
  final MasterDataService? masterDataService;

  static Future<void> show(
    BuildContext context, {
    required ClinicStaffService staffService,
    required String clinicId,
    required VoidCallback onDoctorAdded,
    MasterDataService? masterDataService,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddDoctorSheet(
        staffService: staffService,
        clinicId: clinicId,
        onDoctorAdded: onDoctorAdded,
        masterDataService: masterDataService,
      ),
    );
  }

  @override
  State<AddDoctorSheet> createState() => _AddDoctorSheetState();
}

class _AddDoctorSheetState extends State<AddDoctorSheet>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  late final MasterDataService _masterDataService;

  // Lookup & Invite state
  final _searchController = TextEditingController();
  bool _isSearching = false;
  String? _lookupError;
  List<DoctorLookupResult>? _searchResults;
  String? _invitingDoctorId;

  // Create New Doctor state
  final _createFormKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _specialtyController = TextEditingController();
  final _licenseController = TextEditingController();
  final _bioController = TextEditingController();
  MedicalSpecialty? _selectedSpecialty;
  bool _isCreating = false;
  String? _createError;

  @override
  void initState() {
    super.initState();
    _masterDataService = widget.masterDataService ?? MasterDataService(widget.staffService.apiClient);
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _specialtyController.dispose();
    _licenseController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _performLookup() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _isSearching = true;
      _lookupError = null;
    });

    final result = await widget.staffService.lookupDoctor(widget.clinicId, query);

    if (!mounted) return;

    switch (result) {
      case ApiSuccess(:final data):
        setState(() {
          _searchResults = [data];
          _isSearching = false;
        });
      case ApiFailure(:final exception):
        setState(() {
          _searchResults = [];
          _lookupError = exception is NotFoundException ? null : exception.message;
          _isSearching = false;
        });
    }
  }

  Future<void> _sendInvitation(DoctorLookupResult doctor) async {
    setState(() {
      _invitingDoctorId = doctor.id;
      _lookupError = null;
    });

    final result = await widget.staffService.sendDoctorInvitation(
      widget.clinicId,
      doctorId: doctor.id,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        final strings = LocalizedStrings.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.invitationSent),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() {
          _invitingDoctorId = null;
          // Update item to reflect invited state
          _searchResults = _searchResults?.map((d) {
            if (d.id == doctor.id) {
              return d.copyWith(isInvited: true);
            }
            return d;
          }).toList();
        });
        widget.onDoctorAdded();
      case ApiFailure(:final exception):
        setState(() {
          _lookupError = exception.message;
          _invitingDoctorId = null;
        });
    }
  }

  Future<void> _submitCreateDoctor() async {
    if (!_createFormKey.currentState!.validate()) return;

    setState(() {
      _isCreating = true;
      _createError = null;
    });

    final result = await widget.staffService.createEmployedDoctor(
      widget.clinicId,
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      password: _passwordController.text,
      specialty: _selectedSpecialty?.nameAr ?? _specialtyController.text.trim(),
      specialtyId: _selectedSpecialty?.id,
      licenseNumber: _licenseController.text.trim(),
      bio: _bioController.text.trim().isNotEmpty ? _bioController.text.trim() : null,
    );

    if (!mounted) return;

    switch (result) {
      case ApiSuccess():
        final strings = LocalizedStrings.of(context);
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(strings.doctorCreated),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onDoctorAdded();
      case ApiFailure(:final exception):
        setState(() {
          _createError = exception.message;
          _isCreating = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final maxHeight = MediaQuery.of(context).size.height * 0.88;

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: const BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AafiyaRadius.lg)),
      ),
      padding: EdgeInsets.fromLTRB(
        AafiyaSpacing.lg,
        AafiyaSpacing.md,
        AafiyaSpacing.lg,
        AafiyaSpacing.lg + bottomInset,
      ),
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
                foregroundColor: AafiyaColors.healthBlue,
                child: Icon(Icons.person_add_rounded),
              ),
              const SizedBox(width: AafiyaSpacing.sm),
              Expanded(
                child: Text(
                  strings.addDoctor,
                  style: AafiyaTypography.titleLarge.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: AafiyaSpacing.sm),

          // Tab Bar
          TabBar(
            controller: _tabController,
            labelColor: AafiyaColors.healthBlue,
            unselectedLabelColor: AafiyaColors.secondaryText,
            indicatorColor: AafiyaColors.healthBlue,
            tabs: [
              Tab(text: strings.lookupDoctorTab),
              Tab(text: strings.createNewDoctorTab),
            ],
          ),
          const SizedBox(height: AafiyaSpacing.md),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildLookupView(strings),
                _buildCreateDoctorView(strings),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLookupView(LocalizedStrings strings) {
    return Column(
      children: [
        // Search Input
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _performLookup(),
                decoration: InputDecoration(
                  hintText: strings.searchDoctorHint,
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _searchResults = null;
                            });
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: AafiyaColors.lightBackground,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AafiyaRadius.md),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: AafiyaSpacing.sm),
            IconButton.filled(
              icon: _isSearching
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(AafiyaColors.pureWhite),
                      ),
                    )
                  : const Icon(Icons.arrow_forward_rounded),
              onPressed: _isSearching ? null : _performLookup,
              style: IconButton.styleFrom(
                backgroundColor: AafiyaColors.healthBlue,
              ),
            ),
          ],
        ),
        const SizedBox(height: AafiyaSpacing.md),

        if (_lookupError != null) ...[
          Container(
            padding: AafiyaSpacing.insetAllSm,
            decoration: BoxDecoration(
              color: AafiyaColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AafiyaRadius.sm),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded,
                    color: AafiyaColors.error, size: 20),
                const SizedBox(width: AafiyaSpacing.xs),
                Expanded(
                  child: Text(
                    _lookupError!,
                    style: AafiyaTypography.caption.copyWith(
                      color: AafiyaColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AafiyaSpacing.sm),
        ],

        // Results
        Expanded(
          child: _searchResults == null
              ? Center(
                  child: Text(
                    strings.searchDoctorHint,
                    style: AafiyaTypography.bodyMedium.copyWith(
                      color: AafiyaColors.secondaryText,
                    ),
                  ),
                )
              : _searchResults!.isEmpty
                  ? Center(
                      child: Text(
                        strings.noDoctorFound,
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.secondaryText,
                        ),
                      ),
                    )
                  : ListView.separated(
                      itemCount: _searchResults!.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: AafiyaSpacing.sm),
                      itemBuilder: (context, index) {
                        final doctor = _searchResults![index];
                        final isInvitingThis = _invitingDoctorId == doctor.id;

                        return AafiyaCard(
                          padding: AafiyaSpacing.insetAllMd,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: AafiyaColors.healthBlue
                                        .withValues(alpha: 0.1),
                                    foregroundColor: AafiyaColors.healthBlue,
                                    child: const Icon(Icons.person_rounded),
                                  ),
                                  const SizedBox(width: AafiyaSpacing.sm),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          doctor.name,
                                          style: AafiyaTypography.titleMedium
                                              .copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        if (doctor.specialty != null)
                                          Text(
                                            doctor.specialty!,
                                            style: AafiyaTypography.caption
                                                .copyWith(
                                              color: AafiyaColors.secondaryText,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AafiyaSpacing.sm),
                              if (doctor.licenseNumber != null)
                                Text(
                                  '${strings.licenseNumberLabel}: ${doctor.licenseNumber}',
                                  style: AafiyaTypography.caption,
                                ),
                              if (doctor.email != null)
                                Text(
                                  '${strings.emailLabel}: ${doctor.email}',
                                  style: AafiyaTypography.caption,
                                ),
                              const SizedBox(height: AafiyaSpacing.sm),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  if (doctor.isAlreadyEmployed)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AafiyaColors.success
                                            .withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        strings.alreadyEmployedBadge,
                                        style: AafiyaTypography.caption.copyWith(
                                          color: AafiyaColors.success,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    )
                                  else if (doctor.isInvited)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AafiyaColors.warning
                                            .withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        strings.invitationPendingBadge,
                                        style: AafiyaTypography.caption.copyWith(
                                          color: AafiyaColors.warning,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    )
                                  else
                                    OutlinedButton.icon(
                                      onPressed: isInvitingThis
                                          ? null
                                          : () => _sendInvitation(doctor),
                                      icon: isInvitingThis
                                          ? const SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                              ),
                                            )
                                          : const Icon(Icons.send_rounded,
                                              size: 16),
                                      label: Text(strings.sendInvitation),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AafiyaColors.healthBlue,
                                        side: const BorderSide(
                                            color: AafiyaColors.healthBlue),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildCreateDoctorView(LocalizedStrings strings) {
    return SingleChildScrollView(
      child: Form(
        key: _createFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_createError != null) ...[
              Container(
                padding: AafiyaSpacing.insetAllSm,
                decoration: BoxDecoration(
                  color: AafiyaColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        color: AafiyaColors.error, size: 20),
                    const SizedBox(width: AafiyaSpacing.xs),
                    Expanded(
                      child: Text(
                        _createError!,
                        style: AafiyaTypography.caption.copyWith(
                          color: AafiyaColors.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AafiyaSpacing.sm),
            ],

            // Name
            AafiyaTextField(
              label: strings.fullNameLabel,
              controller: _nameController,
              prefixIcon: const Icon(Icons.person_outline_rounded),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return strings.fieldRequired;
                }
                return null;
              },
            ),
            const SizedBox(height: AafiyaSpacing.sm),

            // Email
            AafiyaTextField(
              label: strings.emailLabel,
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              prefixIcon: const Icon(Icons.email_outlined),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return strings.fieldRequired;
                }
                if (!val.contains('@') || !val.contains('.')) {
                  return strings.invalidEmail;
                }
                return null;
              },
            ),
            const SizedBox(height: AafiyaSpacing.sm),

            // Phone
            AafiyaTextField(
              label: strings.phoneLabel,
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              prefixIcon: const Icon(Icons.phone_outlined),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return strings.fieldRequired;
                }
                return null;
              },
            ),
            const SizedBox(height: AafiyaSpacing.sm),

            // Password
            AafiyaTextField(
              label: strings.passwordLabel,
              controller: _passwordController,
              obscureText: true,
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              validator: (val) {
                if (val == null || val.isEmpty) {
                  return strings.fieldRequired;
                }
                if (val.length < 8) {
                  return strings.passwordTooShort;
                }
                return null;
              },
            ),
            const SizedBox(height: AafiyaSpacing.sm),

            // Specialty Selector (Canonical Master Data, RAD/PATH excluded)
            AafiyaSpecialtySelector(
              masterDataService: _masterDataService,
              selectedSpecialtyId: _selectedSpecialty?.id,
              label: strings.specialtyLabel,
              onChanged: (specialty) {
                setState(() {
                  _selectedSpecialty = specialty;
                  if (specialty != null) {
                    _specialtyController.text = specialty.nameAr;
                  } else {
                    _specialtyController.clear();
                  }
                });
              },
              validator: (val) {
                if (_selectedSpecialty == null && _specialtyController.text.trim().isEmpty) {
                  return strings.fieldRequired;
                }
                return null;
              },
            ),
            const SizedBox(height: AafiyaSpacing.sm),

            // License Number
            AafiyaTextField(
              label: strings.licenseNumberLabel,
              controller: _licenseController,
              prefixIcon: const Icon(Icons.badge_outlined),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return strings.fieldRequired;
                }
                return null;
              },
            ),
            const SizedBox(height: AafiyaSpacing.sm),

            // Bio
            AafiyaTextField(
              label: strings.bioLabel,
              controller: _bioController,
              prefixIcon: const Icon(Icons.notes_rounded),
            ),
            const SizedBox(height: AafiyaSpacing.lg),

            // Submit
            AafiyaButton(
              label: strings.createNewDoctorTab,
              isLoading: _isCreating,
              onPressed: _isCreating ? null : _submitCreateDoctor,
            ),
          ],
        ),
      ),
    );
  }
}

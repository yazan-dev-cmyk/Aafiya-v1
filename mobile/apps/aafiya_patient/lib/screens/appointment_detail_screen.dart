import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Screen displaying complete details for an appointment.
///
/// NOTE: Strictly read-only to preserve DISC-01. Contains ZERO booking actions.
class AppointmentDetailScreen extends StatelessWidget {
  const AppointmentDetailScreen({
    super.key,
    required this.appointment,
  });

  final Appointment appointment;

  /// Helper to present this screen via modal bottom sheet or route.
  static Future<void> show(BuildContext context, Appointment appointment) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppointmentDetailScreen(appointment: appointment),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final statusColor = _resolveStatusColor(appointment.status);

    return Scaffold(
      appBar: AafiyaAppBar(
        title: strings.appointmentDetails,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          tooltip: strings.close,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AafiyaSpacing.insetScreen,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Status & Reference Header Card
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AafiyaRadius.sm),
                        border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        strings.statusLabel(appointment.status),
                        style: AafiyaTypography.titleMedium.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '${strings.bookingReference}: #${appointment.bookingReference}',
                      style: AafiyaTypography.bodyMedium.copyWith(
                        color: AafiyaColors.secondaryText,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 2. Doctor Information Card
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.medical_services_outlined,
                          color: AafiyaColors.healthBlue,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          strings.doctor,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      appointment.doctor.name?.isNotEmpty == true
                          ? appointment.doctor.name!
                          : strings.doctor,
                      style: AafiyaTypography.titleLarge.copyWith(
                        color: AafiyaColors.primaryText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (appointment.doctor.specialty?.isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Text(
                        strings.specialtyName(appointment.doctor.specialty!),
                        style: AafiyaTypography.bodyMedium.copyWith(
                          color: AafiyaColors.healthBlue,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 3. Clinic Information Card
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.apartment_rounded,
                          color: AafiyaColors.healthBlue,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          strings.clinic,
                          style: AafiyaTypography.caption.copyWith(
                            color: AafiyaColors.secondaryText,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      appointment.clinic.name?.isNotEmpty == true
                          ? appointment.clinic.name!
                          : strings.clinic,
                      style: AafiyaTypography.titleMedium.copyWith(
                        color: AafiyaColors.primaryText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (appointment.clinic.wilaya?.isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            size: 16,
                            color: AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            strings.wilayaName(appointment.clinic.wilaya!),
                            style: AafiyaTypography.bodyMedium.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (appointment.clinic.phone?.isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.phone_outlined,
                            size: 16,
                            color: AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            appointment.clinic.phone!,
                            style: AafiyaTypography.bodyMedium.copyWith(
                              color: AafiyaColors.secondaryText,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 4. Schedule (Date & Time) Card
              AafiyaCard(
                padding: AafiyaSpacing.insetAllMd,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(
                                    Icons.calendar_today_outlined,
                                    size: 16,
                                    color: AafiyaColors.secondaryText,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    strings.appointmentDate,
                                    style: AafiyaTypography.caption.copyWith(
                                      color: AafiyaColors.secondaryText,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                appointment.appointmentDate?.isNotEmpty == true
                                    ? strings.formatDate(appointment.appointmentDate)
                                    : '-',
                                style: AafiyaTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (appointment.timeSlot?.isNotEmpty == true)
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.access_time_rounded,
                                      size: 16,
                                      color: AafiyaColors.secondaryText,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      strings.timeSlot,
                                      style: AafiyaTypography.caption.copyWith(
                                        color: AafiyaColors.secondaryText,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  appointment.timeSlot!,
                                  style: AafiyaTypography.titleMedium.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 5. Notes Card (if present)
              if (appointment.notes?.isNotEmpty == true) ...[
                AafiyaCard(
                  padding: AafiyaSpacing.insetAllMd,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.notes_rounded,
                            size: 18,
                            color: AafiyaColors.secondaryText,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            strings.notes,
                            style: AafiyaTypography.caption.copyWith(
                              color: AafiyaColors.secondaryText,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        appointment.notes!,
                        style: AafiyaTypography.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // 6. Confirmation / Check-in metadata (if present)
              if (appointment.confirmedAt?.isNotEmpty == true ||
                  appointment.checkedInAt?.isNotEmpty == true) ...[
                AafiyaCard(
                  padding: AafiyaSpacing.insetAllMd,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (appointment.confirmedAt?.isNotEmpty == true) ...[
                        Row(
                          children: [
                            const Icon(
                              Icons.check_circle_outline_rounded,
                              size: 16,
                              color: AafiyaColors.success,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '${strings.appointmentConfirmedAt}: ${strings.formatDate(appointment.confirmedAt)}',
                                style: AafiyaTypography.caption.copyWith(
                                  color: AafiyaColors.secondaryText,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (appointment.checkedInAt?.isNotEmpty == true) ...[
                        if (appointment.confirmedAt?.isNotEmpty == true)
                          const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(
                              Icons.how_to_reg_outlined,
                              size: 16,
                              color: AafiyaColors.healthBlue,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '${strings.appointmentCheckedInAt}: ${strings.formatDate(appointment.checkedInAt)}',
                                style: AafiyaTypography.caption.copyWith(
                                  color: AafiyaColors.secondaryText,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // 7. Close Action Button
              AafiyaButton(
                label: strings.close,
                onPressed: () => Navigator.of(context).pop(),
                variant: AafiyaButtonVariant.outline,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Color _resolveStatusColor(AppointmentStatus status) {
    return switch (status) {
      AppointmentStatus.pending => AafiyaColors.warning,
      AppointmentStatus.confirmed => AafiyaColors.success,
      AppointmentStatus.attended => AafiyaColors.healthBlue,
      AppointmentStatus.noShow => AafiyaColors.warning,
      AppointmentStatus.cancelled || AppointmentStatus.rejected => AafiyaColors.error,
      AppointmentStatus.expired => AafiyaColors.secondaryText,
      AppointmentStatus.rescheduled => AafiyaColors.info,
      AppointmentStatus.unknown => AafiyaColors.secondaryText,
    };
  }
}

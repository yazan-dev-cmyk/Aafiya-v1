/// Centralized URL path constants for Laravel backend API endpoints.
abstract final class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String logout = '/auth/logout';
  static const String changePassword = '/auth/change-password';

  // System & Health
  static const String health = '/health';
  static const String up = '/up';

  // Appointments & Capacity Slots (TASK-05-02)
  static const String appointments = '/appointments';
  static const String appointmentSlots = '/appointments/slots';

  // Public Directory (Read-only discovery)
  static const String doctors = '/doctors';
  static const String clinics = '/clinics';

  // Master Data (TASK-MD-09 & TASK-MD-12)
  static const String masterWilayas = '/master/wilayas';
  static String masterCommunes(String wilayaCode) => '/master/wilayas/$wilayaCode/communes';
  static const String masterSpecialties = '/master/specialties';

  // Prescriptions & Verification
  static const String prescriptions = '/prescriptions';
  static const String verifyToken = '/v';

  // Patient Directory & EHR / Emergency Profile
  static const String patients = '/patients';
  static const String patientMe = '/patients/me';
  static String patient(String id) => '/patients/$id';

  // Doctor Operational (TASK-04-01 & TASK-04-02)
  static const String doctorClinics = '/doctor/clinics';
  static const String doctorStats = '/doctor/stats';
  static const String clinicDoctorStats = '/clinic/doctor-stats';

  // Appointment Attendance & Queue Actions (TASK-04-03 & TASK-05-04)
  static String appointmentAttend(String id) => '/appointments/$id/attend';
  static String appointmentNoShow(String id) => '/appointments/$id/no-show';
  static String appointmentConfirm(String id) => '/appointments/$id/confirm';
  static String appointmentCancel(String id) => '/appointments/$id/cancel';
  static String appointmentReschedule(String id) => '/appointments/$id/reschedule';
  static const String appointmentCheckIn = '/appointments/check-in';

  // Clinic Staff Management (TASK-04-05)
  static String clinic(String id) => '/clinics/$id';
  static String clinicDoctors(String clinicId) => '/clinics/$clinicId/doctors';
  static String clinicDoctorLookup(String clinicId) => '/clinics/$clinicId/doctors/lookup';
  static String clinicDoctorInvitations(String clinicId) => '/clinics/$clinicId/doctor-invitations';
  static String clinicDoctorInvitationCancel(String clinicId, String invitationId) =>
      '/clinics/$clinicId/doctor-invitations/$invitationId/cancel';
  static String clinicDoctorStatus(String clinicId, String doctorId) =>
      '/clinics/$clinicId/doctors/$doctorId/status';
  static String clinicDoctorDetach(String clinicId, String doctorId) =>
      '/clinics/$clinicId/doctors/$doctorId';
  static String clinicAssistants(String clinicId) => '/clinics/$clinicId/assistants';
  static String clinicAssistantStatus(String clinicId, String assistantId) =>
      '/clinics/$clinicId/assistants/$assistantId/status';
  static String clinicAssistantPermissions(String clinicId, String assistantId) =>
      '/clinics/$clinicId/assistants/$assistantId/permissions';
  static String clinicAssistantDelete(String clinicId, String assistantId) =>
      '/clinics/$clinicId/assistants/$assistantId';
  static String clinicStaffDetail(String clinicId, String staffId) =>
      '/clinics/$clinicId/staff/$staffId';

  // Booking Centers & Commercial Quota (TASK-05-03)
  static const String bookingCenterQuotaBalance = '/booking-centers/quota-balance';
  static const String bookingPackages = '/booking-packages';
  static const String bookingCenterPurchaseRequests = '/booking-centers/purchase-requests';
  static const String bookingCenterTransactions = '/booking-centers/transactions';
}

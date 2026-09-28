/// Domain representation of user roles supported across the AAFIYA ecosystem.
enum UserRole {
  doctor('doctor'),
  doctorAssistant('doctor_assistant'),
  bookingCenter('booking_center'),
  patientRegistered('patient_registered'),
  patientGuest('patient_guest'),
  admin('admin'),
  adminAssistant('admin_assistant'),
  lab('lab'),
  labAssistant('lab_assistant'),
  radiology('radiology'),
  radAssistant('rad_assistant'),
  unknown('unknown');

  const UserRole(this.key);
  final String key;

  /// Backward-compatible alias for doctorAssistant.
  static const UserRole assistant = doctorAssistant;

  /// Backward-compatible alias for patientRegistered.
  static const UserRole patient = patientRegistered;

  /// Maps exact backend role string identifiers to domain [UserRole].
  static UserRole fromString(String? roleKey) {
    if (roleKey == null) return UserRole.unknown;
    return switch (roleKey.toLowerCase().trim()) {
      'doctor' => UserRole.doctor,
      'doctor_assistant' => UserRole.doctorAssistant,
      'booking_center' || 'booking-center' || 'bookingcenter' => UserRole.bookingCenter,
      'patient_registered' => UserRole.patientRegistered,
      'patient_guest' => UserRole.patientGuest,
      'admin' => UserRole.admin,
      'admin_assistant' => UserRole.adminAssistant,
      'lab' => UserRole.lab,
      'lab_assistant' => UserRole.labAssistant,
      'radiology' => UserRole.radiology,
      'rad_assistant' => UserRole.radAssistant,
      _ => UserRole.unknown,
    };
  }

  /// True if this role belongs to professional operations (Doctor, Doctor Assistant, Booking Center).
  bool get isProfessional =>
      this == UserRole.doctor ||
      this == UserRole.doctorAssistant ||
      this == UserRole.bookingCenter;

  /// True if this role is a patient (registered or guest).
  bool get isPatient =>
      this == UserRole.patientRegistered || this == UserRole.patientGuest;

  /// True if this role belongs to web-only systems (Admin, Diagnostic centers).
  bool get isWebOnly =>
      this == UserRole.admin ||
      this == UserRole.adminAssistant ||
      this == UserRole.lab ||
      this == UserRole.labAssistant ||
      this == UserRole.radiology ||
      this == UserRole.radAssistant;
}


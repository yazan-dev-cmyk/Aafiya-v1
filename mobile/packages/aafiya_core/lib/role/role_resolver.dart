import '../models/user.dart';
import '../models/user_role.dart';

/// Target application destination or resolution result determined by role resolution.
enum RoleResolutionResult {
  doctor,
  assistant,
  bookingCenter,
  patient,
  webOnly,
  unauthorized,
}

/// Backward-compatible alias for existing code.
typedef RoleDestination = RoleResolutionResult;

/// Resolves user roles received from the server into client-side navigation targets.
///
/// NOTE: The mobile application is NOT a security boundary.
/// This resolver selects appropriate UI shells and navigation paths, but all protected
/// operations and data access MUST be enforced by the Laravel API.
class RoleResolver {
  const RoleResolver();

  /// Resolves the navigation destination for the AAFIYA Pro application.
  ///
  /// Professional roles route to their operational shells:
  /// - `doctor` -> [RoleResolutionResult.doctor]
  /// - `doctor_assistant` -> [RoleResolutionResult.assistant]
  /// - `booking_center` -> [RoleResolutionResult.bookingCenter]
  ///
  /// Web-only roles return [RoleResolutionResult.webOnly] with web guidance:
  /// - `admin`, `admin_assistant`, `lab`, `lab_assistant`, `radiology`, `rad_assistant`
  ///
  /// Patient roles return [RoleResolutionResult.patient] (rejected from Pro).
  ///
  /// Current AAFIYA accounts are single-role.
  /// If multiple roles are present, no priority is invented; the state is safely rejected as unauthorized.
  RoleResolutionResult resolveProDestination(User user) {
    if (!user.isActive) {
      return RoleResolutionResult.unauthorized;
    }

    if (user.roles.isEmpty) {
      return RoleResolutionResult.unauthorized;
    }

    // Current AAFIYA accounts are single-role.
    // If multiple roles are encountered, do NOT invent priority or precedence.
    // Safely reject as ambiguous/unauthorized.
    if (user.roles.length > 1) {
      return RoleResolutionResult.unauthorized;
    }

    final role = user.roles.first;

    return switch (role) {
      UserRole.doctor => RoleResolutionResult.doctor,
      UserRole.doctorAssistant => RoleResolutionResult.assistant,
      UserRole.bookingCenter => RoleResolutionResult.bookingCenter,
      UserRole.patientRegistered || UserRole.patientGuest => RoleResolutionResult.patient,
      UserRole.admin ||
      UserRole.adminAssistant ||
      UserRole.lab ||
      UserRole.labAssistant ||
      UserRole.radiology ||
      UserRole.radAssistant =>
        RoleResolutionResult.webOnly,
      UserRole.unknown => RoleResolutionResult.unauthorized,
    };
  }

  /// Resolves the navigation destination for the AAFIYA Patient application.
  ///
  /// Only registered patients route to the Patient shell.
  /// Inactive accounts, web-only roles, multi-role, or unknown roles return their respective rejection state.
  RoleResolutionResult resolvePatientDestination(User user) {
    if (!user.isActive) {
      return RoleResolutionResult.unauthorized;
    }

    if (user.roles.isEmpty) {
      return RoleResolutionResult.unauthorized;
    }

    if (user.roles.length > 1) {
      return RoleResolutionResult.unauthorized;
    }

    final role = user.roles.first;

    if (role == UserRole.patientRegistered) {
      return RoleResolutionResult.patient;
    }

    if (role.isWebOnly) {
      return RoleResolutionResult.webOnly;
    }

    return RoleResolutionResult.unauthorized;
  }
}


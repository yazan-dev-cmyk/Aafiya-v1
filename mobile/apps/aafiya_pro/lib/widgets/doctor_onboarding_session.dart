/// In-memory session manager for doctor onboarding modal deferral.
///
/// Ensures the onboarding modal is deferred only for the current app session,
/// strictly scoped by both [clinicId] and [doctorId] without introducing
/// external dependencies or database mutations.
class DoctorOnboardingSession {
  DoctorOnboardingSession._();

  static final DoctorOnboardingSession instance = DoctorOnboardingSession._();

  final Set<String> _deferredKeys = <String>{};

  static String _buildKey(String clinicId, String doctorId) =>
      '$clinicId:$doctorId';

  /// Returns `true` if onboarding dialog was deferred for this clinic + doctor in the current session.
  bool isDeferred({
    required String clinicId,
    required String doctorId,
  }) {
    if (clinicId.isEmpty || doctorId.isEmpty) return false;
    return _deferredKeys.contains(_buildKey(clinicId, doctorId));
  }

  /// Defers the onboarding dialog for the current app session for this clinic + doctor.
  void defer({
    required String clinicId,
    required String doctorId,
  }) {
    if (clinicId.isNotEmpty && doctorId.isNotEmpty) {
      _deferredKeys.add(_buildKey(clinicId, doctorId));
    }
  }

  /// Clears deferral status (e.g. on manual trigger, logout, or testing).
  void clear() {
    _deferredKeys.clear();
  }
}

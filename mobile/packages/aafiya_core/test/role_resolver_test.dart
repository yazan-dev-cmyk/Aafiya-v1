import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('RoleResolver — All 11 Backend Roles & Safety', () {
    const resolver = RoleResolver();

    // -------------------------------------------------------------------------
    // 1. Professional Mobile Roles in AAFIYA Pro
    // -------------------------------------------------------------------------
    group('Professional Roles in Pro App', () {
      test('resolves doctor to DoctorShell (RoleResolutionResult.doctor)', () {
        const user = User(
          id: 'doc-1',
          name: 'Dr. Sarah',
          email: 'sarah@aafiya.dz',
          roles: [UserRole.doctor],
        );

        final result = resolver.resolveProDestination(user);
        expect(result, equals(RoleResolutionResult.doctor));
      });

      test('resolves doctor_assistant to AssistantShell (RoleResolutionResult.assistant)', () {
        const user = User(
          id: 'asst-1',
          name: 'Assistant Ali',
          email: 'ali@aafiya.dz',
          roles: [UserRole.doctorAssistant],
        );

        final result = resolver.resolveProDestination(user);
        expect(result, equals(RoleResolutionResult.assistant));
      });

      test('resolves booking_center to BookingCenterShell (RoleResolutionResult.bookingCenter)', () {
        const user = User(
          id: 'bc-1',
          name: 'Algiers Central Booking',
          email: 'center@aafiya.dz',
          roles: [UserRole.bookingCenter],
        );

        final result = resolver.resolveProDestination(user);
        expect(result, equals(RoleResolutionResult.bookingCenter));
      });
    });

    // -------------------------------------------------------------------------
    // 2. Patient Roles in AAFIYA Pro (Rejected)
    // -------------------------------------------------------------------------
    group('Patient Roles in Pro App', () {
      test('rejects patient_registered from Pro app (returns patient result)', () {
        const user = User(
          id: 'pat-1',
          name: 'Patient Yazan',
          email: 'yazan@aafiya.dz',
          roles: [UserRole.patientRegistered],
        );

        final result = resolver.resolveProDestination(user);
        expect(result, equals(RoleResolutionResult.patient));
      });

      test('rejects patient_guest from Pro app (returns patient result)', () {
        const user = User(
          id: 'guest-1',
          name: 'Guest Patient',
          email: 'guest@aafiya.dz',
          roles: [UserRole.patientGuest],
        );

        final result = resolver.resolveProDestination(user);
        expect(result, equals(RoleResolutionResult.patient));
      });
    });

    // -------------------------------------------------------------------------
    // 3. Web-Only Roles in AAFIYA Pro (Graceful webOnly Guidance)
    // -------------------------------------------------------------------------
    group('Web-Only Roles in Pro App', () {
      test('maps admin to RoleResolutionResult.webOnly', () {
        const user = User(
          id: 'adm-1',
          name: 'Admin Lakhdar',
          email: 'admin@aafiya.dz',
          roles: [UserRole.admin],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.webOnly));
      });

      test('maps admin_assistant to RoleResolutionResult.webOnly', () {
        const user = User(
          id: 'adm-asst-1',
          name: 'Admin Assistant',
          email: 'admin.asst@aafiya.dz',
          roles: [UserRole.adminAssistant],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.webOnly));
      });

      test('maps lab to RoleResolutionResult.webOnly', () {
        const user = User(
          id: 'lab-1',
          name: 'Lab Manager',
          email: 'lab@aafiya.dz',
          roles: [UserRole.lab],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.webOnly));
      });

      test('maps lab_assistant to RoleResolutionResult.webOnly', () {
        const user = User(
          id: 'lab-asst-1',
          name: 'Lab Technician',
          email: 'lab.tech@aafiya.dz',
          roles: [UserRole.labAssistant],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.webOnly));
      });

      test('maps radiology to RoleResolutionResult.webOnly', () {
        const user = User(
          id: 'rad-1',
          name: 'Radiologist',
          email: 'rad@aafiya.dz',
          roles: [UserRole.radiology],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.webOnly));
      });

      test('maps rad_assistant to RoleResolutionResult.webOnly', () {
        const user = User(
          id: 'rad-asst-1',
          name: 'Radiology Tech',
          email: 'rad.tech@aafiya.dz',
          roles: [UserRole.radAssistant],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.webOnly));
      });
    });

    // -------------------------------------------------------------------------
    // 4. Unknown Roles in AAFIYA Pro
    // -------------------------------------------------------------------------
    group('Unknown Roles', () {
      test('safely rejects unknown backend role as unauthorized', () {
        const user = User(
          id: 'unk-1',
          name: 'Unknown User',
          email: 'unk@aafiya.dz',
          roles: [UserRole.unknown],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.unauthorized));
      });
    });

    // -------------------------------------------------------------------------
    // 5. Patient App Resolution
    // -------------------------------------------------------------------------
    group('Patient App Resolution', () {
      test('resolves patient_registered to patient in Patient app', () {
        const user = User(
          id: 'pat-1',
          name: 'Registered Patient',
          email: 'patient@aafiya.dz',
          roles: [UserRole.patientRegistered],
        );

        expect(resolver.resolvePatientDestination(user), equals(RoleResolutionResult.patient));
      });

      test('rejects professional doctor role in Patient app', () {
        const user = User(
          id: 'doc-1',
          name: 'Doctor',
          email: 'doc@aafiya.dz',
          roles: [UserRole.doctor],
        );

        expect(resolver.resolvePatientDestination(user), equals(RoleResolutionResult.unauthorized));
      });

      test('rejects web-only admin in Patient app with webOnly result', () {
        const user = User(
          id: 'adm-1',
          name: 'Admin',
          email: 'adm@aafiya.dz',
          roles: [UserRole.admin],
        );

        expect(resolver.resolvePatientDestination(user), equals(RoleResolutionResult.webOnly));
      });
    });

    // -------------------------------------------------------------------------
    // 6. Safety & Edge Cases
    // -------------------------------------------------------------------------
    group('Safety Guards', () {
      test('rejects empty role list as unauthorized', () {
        const user = User(
          id: 'empty-1',
          name: 'No Roles',
          email: 'empty@aafiya.dz',
          roles: [],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.unauthorized));
        expect(resolver.resolvePatientDestination(user), equals(RoleResolutionResult.unauthorized));
      });

      test('rejects inactive user regardless of roles', () {
        const user = User(
          id: 'inact-1',
          name: 'Inactive Doctor',
          email: 'inactive@aafiya.dz',
          isActive: false,
          roles: [UserRole.doctor],
        );

        expect(resolver.resolveProDestination(user), equals(RoleResolutionResult.unauthorized));
        expect(resolver.resolvePatientDestination(user), equals(RoleResolutionResult.unauthorized));
      });

      test('multi-role user safely rejects as unauthorized without inventing priority', () {
        // Current AAFIYA accounts are single-role.
        // If multiple roles exist, must NOT silently pick doctor or any other role.
        const multiRoleDoctorAdmin = User(
          id: 'multi-1',
          name: 'Doctor and Admin',
          email: 'docadmin@aafiya.dz',
          roles: [UserRole.doctor, UserRole.admin],
        );

        expect(
          resolver.resolveProDestination(multiRoleDoctorAdmin),
          equals(RoleResolutionResult.unauthorized),
        );

        const multiRoleDoctorAssistant = User(
          id: 'multi-2',
          name: 'Doctor and Assistant',
          email: 'docasst@aafiya.dz',
          roles: [UserRole.doctor, UserRole.doctorAssistant],
        );

        expect(
          resolver.resolveProDestination(multiRoleDoctorAssistant),
          equals(RoleResolutionResult.unauthorized),
        );
      });
    });

    // -------------------------------------------------------------------------
    // 7. User.fromJson Backend Deserialization Verification
    // -------------------------------------------------------------------------
    group('User.fromJson Role Deserialization', () {
      test('preserves all 11 backend role string keys', () {
        final rawBackendRoles = [
          'doctor',
          'doctor_assistant',
          'booking_center',
          'patient_registered',
          'patient_guest',
          'admin',
          'admin_assistant',
          'lab',
          'lab_assistant',
          'radiology',
          'rad_assistant',
        ];

        for (final roleKey in rawBackendRoles) {
          final user = User.fromJson({
            'id': 'test-id',
            'name': 'Test User',
            'email': 'test@aafiya.dz',
            'roles': [roleKey],
          });

          expect(user.roles.length, equals(1), reason: 'Failed for role: $roleKey');
          expect(user.roles.first, isNot(equals(UserRole.unknown)), reason: 'Parsed as unknown: $roleKey');
          expect(user.roles.first.key, equals(roleKey));
        }
      });

      test('critical previously vulnerable role strings survive deserialization', () {
        final user = User.fromJson({
          'id': 'crit-1',
          'name': 'Critical Roles User',
          'email': 'critical@aafiya.dz',
          'roles': [
            'doctor_assistant',
            'patient_registered',
            'lab_assistant',
            'rad_assistant',
          ],
        });

        expect(user.roles, contains(UserRole.doctorAssistant));
        expect(user.roles, contains(UserRole.patientRegistered));
        expect(user.roles, contains(UserRole.labAssistant));
        expect(user.roles, contains(UserRole.radAssistant));
      });

      test('unrecognized backend role parses to UserRole.unknown without being dropped', () {
        final user = User.fromJson({
          'id': 'unk-json-1',
          'name': 'Custom Operator',
          'email': 'custom@aafiya.dz',
          'roles': ['custom_new_role'],
        });

        expect(user.roles.length, equals(1));
        expect(user.roles.first, equals(UserRole.unknown));
      });
    });
  });
}


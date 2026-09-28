import 'doctor_clinic.dart';
import 'user_role.dart';

/// Lightweight User model mapped from Laravel `UserResource`.
class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.isActive = true,
    this.roles = const [],
    this.permissions = const [],
    this.clinic,
    this.clinics = const [],
  });

  final dynamic id;
  final String name;
  final String email;
  final String? phone;
  final bool isActive;
  final List<UserRole> roles;
  final List<String> permissions;
  final DoctorClinic? clinic;
  final List<DoctorClinic> clinics;

  /// Primary role deduced from the user's role list.
  UserRole get primaryRole => roles.firstOrNull ?? UserRole.unknown;

  /// Whether the user holds a given permission.
  bool hasPermission(String permission) => permissions.contains(permission);

  /// Tolerantly parses a User from backend JSON dictionary.
  factory User.fromJson(Map<String, dynamic> json) {
    final rawRoles = json['roles'];
    final parsedRoles = <UserRole>[];
    if (rawRoles is List) {
      for (final r in rawRoles) {
        final roleStr = r is Map ? r['name']?.toString() : r?.toString();
        if (roleStr != null) {
          final parsed = UserRole.fromString(roleStr);
          if (!parsedRoles.contains(parsed)) {
            parsedRoles.add(parsed);
          }
        }
      }
    }

    final rawPermissions = json['permissions'];
    final parsedPermissions = <String>[];
    if (rawPermissions is List) {
      for (final p in rawPermissions) {
        final permStr = p is Map ? p['name']?.toString() : p?.toString();
        if (permStr != null && !parsedPermissions.contains(permStr)) {
          parsedPermissions.add(permStr);
        }
      }
    }

    final rawClinic = json['clinic'];
    DoctorClinic? parsedClinic;
    if (rawClinic is Map<String, dynamic>) {
      parsedClinic = DoctorClinic.fromJson(rawClinic);
    }

    final rawClinics = json['clinics'];
    final parsedClinics = <DoctorClinic>[];
    if (rawClinics is List) {
      for (final c in rawClinics) {
        if (c is Map<String, dynamic>) {
          parsedClinics.add(DoctorClinic.fromJson(c));
        }
      }
    }

    return User(
      id: json['id'] ?? '',
      name: (json['name'] as String?) ?? '',
      email: (json['email'] as String?) ?? '',
      phone: json['phone'] as String?,
      isActive: (json['is_active'] as bool?) ?? true,
      roles: parsedRoles,
      permissions: parsedPermissions,
      clinic: parsedClinic,
      clinics: parsedClinics,
    );
  }
}

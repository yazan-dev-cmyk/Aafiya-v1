import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('User Model — Doctor Identity Parsing', () {
    test('parses nested doctor object and sets doctorId correctly', () {
      final json = {
        'id': 'user-uuid-1111',
        'name': 'د. حسان بوعلام',
        'email': 'hassan@aafiya.dz',
        'phone': '+213550000001',
        'is_active': true,
        'roles': ['doctor'],
        'permissions': ['clinic.view'],
        'doctor': {
          'id': 'doctor-uuid-2222',
          'specialty': 'طب عام',
          'license_number': 'LIC-12345',
          'bio': 'طبيب ممارس',
          'is_verified': true,
        },
        'clinic': {
          'id': 'clinic-uuid-3333',
          'name': 'عيادة الشفاء',
          'position': 'doctor',
          'is_director': false,
        },
      };

      final user = User.fromJson(json);

      expect(user.id, 'user-uuid-1111');
      expect(user.doctorId, 'doctor-uuid-2222');
      expect(user.doctorId, isNot(equals(user.id)));
      expect(user.name, 'د. حسان بوعلام');
      expect(user.primaryRole, UserRole.doctor);
    });

    test('handles absent doctor object safely (doctorId is null)', () {
      final json = {
        'id': 'patient-uuid-4444',
        'name': 'أحمد المريض',
        'email': 'patient@aafiya.dz',
        'roles': ['patient'],
      };

      final user = User.fromJson(json);

      expect(user.id, 'patient-uuid-4444');
      expect(user.doctorId, isNull);
    });

    test('handles null doctor object safely (doctorId is null)', () {
      final json = {
        'id': 'user-uuid-5555',
        'name': 'مساعد عيادة',
        'email': 'assistant@aafiya.dz',
        'doctor': null,
      };

      final user = User.fromJson(json);

      expect(user.id, 'user-uuid-5555');
      expect(user.doctorId, isNull);
    });

    test('handles legacy flat doctor_id if present', () {
      final json = {
        'id': 'user-uuid-6666',
        'name': 'طبيب قديم',
        'email': 'legacy@aafiya.dz',
        'doctor_id': 'doctor-uuid-7777',
      };

      final user = User.fromJson(json);

      expect(user.id, 'user-uuid-6666');
      expect(user.doctorId, 'doctor-uuid-7777');
    });
  });
}

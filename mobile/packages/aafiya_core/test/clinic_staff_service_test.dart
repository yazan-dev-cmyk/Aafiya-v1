import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  const clinicId = 'clinic-uuid-001';
  const doctorId = 'doctor-uuid-002';
  const assistantId = 'assistant-uuid-003';
  const invitationId = 'invitation-uuid-004';

  group('Clinic Staff Models', () {
    test('ClinicDoctorStaff serialization and properties', () {
      final json = {
        'id': doctorId,
        'user_id': 'user-002',
        'name': 'Dr. Amine Taleb',
        'email': 'amine.taleb@aafiya.test',
        'phone': '0555123456',
        'specialty': 'Cardiology',
        'license_number': 'CARD-12345',
        'position': 'director',
        'is_primary': true,
        'is_active': true,
        'joined_at': '2026-01-01',
      };

      final doc = ClinicDoctorStaff.fromJson(json);
      expect(doc.id, equals(doctorId));
      expect(doc.userId, equals('user-002'));
      expect(doc.name, equals('Dr. Amine Taleb'));
      expect(doc.specialty, equals('Cardiology'));
      expect(doc.isDirector, isTrue);
      expect(doc.isPrimary, isTrue);
      expect(doc.isActive, isTrue);

      final outJson = doc.toJson();
      expect(outJson['position'], equals('director'));
      expect(outJson['is_primary'], isTrue);
    });

    test('ClinicAssistantStaff serialization and Layer 4 permissions', () {
      final json = {
        'id': assistantId,
        'user_id': 'user-003',
        'name': 'Samir Assistant',
        'email': 'samir@aafiya.test',
        'phone': '0555789012',
        'position': 'assistant',
        'is_active': true,
        'joined_at': '2026-02-01',
        'delegated_permissions': [
          'booking.manage_queue',
          'booking.confirm_attendance',
        ],
      };

      final assistant = ClinicAssistantStaff.fromJson(json);
      expect(assistant.id, equals(assistantId));
      expect(assistant.name, equals('Samir Assistant'));
      expect(assistant.permissions, contains('booking.manage_queue'));
      expect(assistant.permissions, contains('booking.confirm_attendance'));
      expect(assistant.createdAt, equals('2026-02-01'));
      expect(assistant.isActive, isTrue);
    });

    test('DoctorLookupResult properties and canInvite logic', () {
      final result = DoctorLookupResult.fromJson({
        'id': doctorId,
        'full_name': 'Dr. Nadia Kaci',
        'specialty': 'Pediatrics',
        'license_number': 'PED-54321',
        'is_verified': true,
        'is_already_member': false,
        'is_active_member': false,
        'has_pending_invitation': false,
      });

      expect(result.id, equals(doctorId));
      expect(result.name, equals('Dr. Nadia Kaci'));
      expect(result.canInvite, isTrue);
      expect(result.isAlreadyEmployed, isFalse);
      expect(result.isInvited, isFalse);

      final invited = result.copyWith(isInvited: true);
      expect(invited.isInvited, isTrue);
      expect(invited.canInvite, isFalse);
    });

    test('ClinicDoctorInvitation pending status', () {
      final inv = ClinicDoctorInvitation.fromJson({
        'id': invitationId,
        'doctor_id': doctorId,
        'doctor_name': 'Dr. Nora',
        'status': 'pending',
      });

      expect(inv.id, equals(invitationId));
      expect(inv.isPending, isTrue);
    });
  });

  group('ClinicStaffService — All 13 Operations', () {
    test('1. fetchClinicStaff GET /clinics/{id}', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('GET'));
        expect(req.url.path, endsWith('/clinics/$clinicId'));
        return http.Response(
          jsonEncode({
            'data': {
              'id': clinicId,
              'name': 'Clinique El Chifa',
              'is_active': true,
              'doctors': [
                {
                  'id': doctorId,
                  'name': 'Dr. Amine',
                  'position': 'director',
                  'is_primary': true,
                  'is_active': true,
                }
              ],
              'assistants': [
                {
                  'id': assistantId,
                  'name': 'Samir',
                  'delegated_permissions': ['booking.manage_queue'],
                  'is_active': true,
                }
              ],
            }
          }),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.fetchClinicStaff(clinicId);
      expect(res, isA<ApiSuccess<ClinicStaffData>>());
      final staff = (res as ApiSuccess<ClinicStaffData>).data;
      expect(staff.clinicName, equals('Clinique El Chifa'));
      expect(staff.doctors.length, equals(1));
      expect(staff.assistants.length, equals(1));
    });

    test('2. createEmployedDoctor POST /clinics/{id}/doctors', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('POST'));
        expect(req.url.path, endsWith('/clinics/$clinicId/doctors'));
        final body = jsonDecode(req.body);
        expect(body['name'], equals('Dr. Nouvel'));
        expect(body['email'], equals('nouvel@aafiya.test'));
        expect(body['specialty'], equals('Neurology'));
        return http.Response(
          jsonEncode({
            'data': {
              'user': {
                'id': 'new-user-id',
                'name': 'Dr. Nouvel',
                'email': 'nouvel@aafiya.test',
              },
            }
          }),
          201,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.createEmployedDoctor(
        clinicId,
        name: 'Dr. Nouvel',
        email: 'nouvel@aafiya.test',
        phone: '0555000000',
        password: 'password123',
        specialty: 'Neurology',
        licenseNumber: 'NEU-1234',
      );

      expect(res, isA<ApiSuccess<ClinicDoctorStaff>>());
      expect((res as ApiSuccess<ClinicDoctorStaff>).data.name, equals('Dr. Nouvel'));
    });

    test('3. lookupDoctor GET /clinics/{id}/doctors/lookup', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('GET'));
        expect(req.url.path, endsWith('/clinics/$clinicId/doctors/lookup'));
        expect(req.url.queryParameters['email'], equals('kaci@aafiya.test'));
        return http.Response(
          jsonEncode({
            'data': {
              'id': doctorId,
              'full_name': 'Dr. Leila Kaci',
              'is_verified': true,
              'is_already_member': false,
            }
          }),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.lookupDoctor(clinicId, 'kaci@aafiya.test');
      expect(res, isA<ApiSuccess<DoctorLookupResult>>());
      expect((res as ApiSuccess<DoctorLookupResult>).data.fullName, equals('Dr. Leila Kaci'));
    });

    test('4. sendDoctorInvitation POST /clinics/{id}/doctor-invitations', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('POST'));
        expect(req.url.path, endsWith('/clinics/$clinicId/doctor-invitations'));
        final body = jsonDecode(req.body);
        expect(body['doctor_id'], equals(doctorId));
        return http.Response(
          jsonEncode({
            'data': {
              'id': invitationId,
              'doctor_id': doctorId,
              'status': 'pending',
            }
          }),
          201,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.sendDoctorInvitation(clinicId, doctorId: doctorId);
      expect(res, isA<ApiSuccess<ClinicDoctorInvitation>>());
      expect((res as ApiSuccess<ClinicDoctorInvitation>).data.id, equals(invitationId));
    });

    test('5. fetchClinicInvitations GET /clinics/{id}/doctor-invitations', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('GET'));
        expect(req.url.path, endsWith('/clinics/$clinicId/doctor-invitations'));
        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': invitationId,
                'doctor_id': doctorId,
                'status': 'pending',
              }
            ]
          }),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.fetchClinicInvitations(clinicId);
      expect(res, isA<ApiSuccess<List<ClinicDoctorInvitation>>>());
      expect((res as ApiSuccess<List<ClinicDoctorInvitation>>).data.length, equals(1));
    });

    test('6. cancelInvitation POST /clinics/{id}/doctor-invitations/{id}/cancel', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('POST'));
        expect(req.url.path, endsWith('/clinics/$clinicId/doctor-invitations/$invitationId/cancel'));
        return http.Response(
          jsonEncode({'message': 'Invitation cancelled'}),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.cancelInvitation(clinicId, invitationId);
      expect(res, isA<ApiSuccess<bool>>());
      expect((res as ApiSuccess<bool>).data, isTrue);
    });

    test('7. updateDoctorStatus PUT /clinics/{id}/doctors/{id}/status', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('PUT'));
        expect(req.url.path, endsWith('/clinics/$clinicId/doctors/$doctorId/status'));
        final body = jsonDecode(req.body);
        expect(body['is_active'], isFalse);
        return http.Response(
          jsonEncode({'message': 'Doctor status updated'}),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.updateDoctorStatus(clinicId, doctorId, isActive: false);
      expect(res, isA<ApiSuccess<bool>>());
    });

    test('8. detachDoctor DELETE /clinics/{id}/doctors/{id}', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('DELETE'));
        expect(req.url.path, endsWith('/clinics/$clinicId/doctors/$doctorId'));
        return http.Response(
          jsonEncode({'message': 'Doctor detached'}),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.detachDoctor(clinicId, doctorId);
      expect(res, isA<ApiSuccess<bool>>());
    });

    test('9. createAssistant POST /clinics/{id}/assistants', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('POST'));
        expect(req.url.path, endsWith('/clinics/$clinicId/assistants'));
        final body = jsonDecode(req.body);
        expect(body['name'], equals('Assistant Yasmine'));
        expect(body['permissions_json'], contains('booking.manage_queue'));
        return http.Response(
          jsonEncode({
            'data': {
              'id': assistantId,
              'name': 'Assistant Yasmine',
              'delegated_permissions': ['booking.manage_queue'],
            }
          }),
          201,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.createAssistant(
        clinicId,
        name: 'Assistant Yasmine',
        email: 'yasmine@aafiya.test',
        phone: '0555999888',
        password: 'password123',
        permissions: ['booking.manage_queue'],
      );

      expect(res, isA<ApiSuccess<ClinicAssistantStaff>>());
      expect((res as ApiSuccess<ClinicAssistantStaff>).data.name, equals('Assistant Yasmine'));
    });

    test('10. updateAssistantStatus PUT /clinics/{id}/assistants/{id}/status', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('PUT'));
        expect(req.url.path, endsWith('/clinics/$clinicId/assistants/$assistantId/status'));
        final body = jsonDecode(req.body);
        expect(body['is_active'], isTrue);
        return http.Response(
          jsonEncode({'message': 'Assistant status updated'}),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.updateAssistantStatus(clinicId, assistantId, isActive: true);
      expect(res, isA<ApiSuccess<bool>>());
    });

    test('11. updateAssistantPermissions PUT /clinics/{id}/assistants/{id}/permissions', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('PUT'));
        expect(req.url.path, endsWith('/clinics/$clinicId/assistants/$assistantId/permissions'));
        final body = jsonDecode(req.body);
        expect(body['permissions'], contains('patient.view_contacts'));
        return http.Response(
          jsonEncode({
            'data': {
              'id': assistantId,
              'name': 'Assistant Yasmine',
              'delegated_permissions': ['patient.view_contacts'],
            }
          }),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.updateAssistantPermissions(
        clinicId,
        assistantId,
        permissions: ['patient.view_contacts'],
      );

      expect(res, isA<ApiSuccess<ClinicAssistantStaff>>());
      expect(
        (res as ApiSuccess<ClinicAssistantStaff>).data.permissions,
        contains('patient.view_contacts'),
      );
    });

    test('12. deleteAssistant DELETE /clinics/{id}/assistants/{id}', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('DELETE'));
        expect(req.url.path, endsWith('/clinics/$clinicId/assistants/$assistantId'));
        return http.Response(
          jsonEncode({'message': 'Assistant deleted'}),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.deleteAssistant(clinicId, assistantId);
      expect(res, isA<ApiSuccess<bool>>());
    });

    test('13. getStaffDetail GET /clinics/{id}/staff/{id}', () async {
      final mock = MockClient((req) async {
        expect(req.method, equals('GET'));
        expect(req.url.path, endsWith('/clinics/$clinicId/staff/$doctorId'));
        return http.Response(
          jsonEncode({
            'data': {
              'id': doctorId,
              'name': 'Dr. Amine',
              'type': 'doctor',
              'position': 'doctor',
            }
          }),
          200,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.getStaffDetail(clinicId, doctorId);
      expect(res, isA<ApiSuccess<StaffMemberDetail>>());
      expect((res as ApiSuccess<StaffMemberDetail>).data.name, equals('Dr. Amine'));
    });

    test('Forbidden 403 maps to ForbiddenException', () async {
      final mock = MockClient((req) async {
        return http.Response(
          jsonEncode({'message': 'Action unauthorized.'}),
          403,
        );
      });

      final service = ClinicStaffService(
        apiClient: ApiClient(httpClient: mock),
      );

      final res = await service.fetchClinicStaff(clinicId);
      expect(res, isA<ApiFailure<dynamic>>());
      expect((res as ApiFailure).exception, isA<ForbiddenException>());
    });
  });
}

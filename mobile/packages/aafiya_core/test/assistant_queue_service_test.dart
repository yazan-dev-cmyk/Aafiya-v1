import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  const appointmentId = 'appt-uuid-001';
  const token = '64charactertokenforappointmentcheckintest1234567890abcdef12345678';
  const patientId = 'patient-uuid-002';

  group('PatientSearchResult Model Tests', () {
    test('PatientSearchResult deserialization and fullName', () {
      final json = {
        'id': patientId,
        'mrn': 'MRN-2026-VAL99',
        'first_name': 'Sarah',
        'last_name': 'Benali',
        'gender': 'female',
        'date_of_birth': '1995-05-15',
        'phone': '0555123456',
        'email': 'sarah@aafiya.test',
        'national_id': '199516010099',
        'blood_type': 'O+',
      };

      final patient = PatientSearchResult.fromJson(json);
      expect(patient.id, equals(patientId));
      expect(patient.mrn, equals('MRN-2026-VAL99'));
      expect(patient.firstName, equals('Sarah'));
      expect(patient.lastName, equals('Benali'));
      expect(patient.fullName, equals('Sarah Benali'));
      expect(patient.phone, equals('0555123456'));
      expect(patient.gender, equals('female'));
      expect(patient.bloodType, equals('O+'));

      final out = patient.toJson();
      expect(out['mrn'], equals('MRN-2026-VAL99'));
      expect(out['first_name'], equals('Sarah'));
    });
  });

  group('AssistantQueueService Tests', () {
    test('fetchTodayQueue passes correct query parameters and parses PaginatedAppointments', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, endsWith('/appointments'));
        expect(request.url.queryParameters['sort_by'], equals('time_slot'));
        expect(request.url.queryParameters['sort_order'], equals('asc'));
        expect(request.url.queryParameters['appointment_date'], equals('2026-09-16'));
        expect(request.url.queryParameters['status'], equals('confirmed'));
        expect(request.url.queryParameters['page'], equals('1'));
        expect(request.url.queryParameters['per_page'], equals('20'));

        final responseData = {
          'data': [
            {
              'id': appointmentId,
              'booking_reference': 'BK-20260916-0001',
              'secure_token': token,
              'appointment_date': '2026-09-16',
              'time_slot': '09:00',
              'status': 'confirmed',
              'patient': {
                'id': patientId,
                'name': 'Sarah Benali',
                'phone': '0555123456',
                'mrn': 'MRN-2026-VAL99',
              },
            }
          ],
          'meta': {
            'current_page': 1,
            'last_page': 1,
            'per_page': 20,
            'total': 1,
          },
        };

        return http.Response(jsonEncode(responseData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.fetchTodayQueue(
        appointmentDate: '2026-09-16',
        status: 'confirmed',
        page: 1,
        perPage: 20,
      );

      expect(result, isA<ApiSuccess<PaginatedAppointments>>());
      final paginated = (result as ApiSuccess<PaginatedAppointments>).data;
      expect(paginated.items.length, equals(1));
      expect(paginated.items.first.id, equals(appointmentId));
      expect(paginated.items.first.status, equals(AppointmentStatus.confirmed));
      expect(paginated.items.first.patient.name, equals('Sarah Benali'));
    });

    test('checkInAppointment submits token via POST /appointments/check-in', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments/check-in'));
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['token'], equals(token));

        final responseData = {
          'message': 'تم تأكيد حضور الموعد بنجاح.',
          'data': {
            'id': appointmentId,
            'booking_reference': 'BK-20260916-0001',
            'secure_token': token,
            'appointment_date': '2026-09-16',
            'time_slot': '09:00',
            'status': 'attended',
            'checked_in_at': '2026-09-16T10:00:00.000000Z',
            'patient': {
              'id': patientId,
              'name': 'Sarah Benali',
              'phone': '0555123456',
              'mrn': 'MRN-2026-VAL99',
            },
          }
        };

        return http.Response(jsonEncode(responseData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.checkInAppointment(token);

      expect(result, isA<ApiSuccess<Appointment>>());
      final appt = (result as ApiSuccess<Appointment>).data;
      expect(appt.id, equals(appointmentId));
      expect(appt.status, equals(AppointmentStatus.attended));
      expect(appt.checkedInAt, isNotNull);
    });

    test('attendAppointment calls POST /appointments/{id}/attend', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments/$appointmentId/attend'));

        final responseData = {
          'message': 'تم تسجيل حضور الموعد بنجاح.',
          'data': {
            'id': appointmentId,
            'booking_reference': 'BK-20260916-0001',
            'status': 'attended',
            'checked_in_at': '2026-09-16T10:05:00.000000Z',
          }
        };

        return http.Response(jsonEncode(responseData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.attendAppointment(appointmentId);

      expect(result, isA<ApiSuccess<Appointment>>());
      final appt = (result as ApiSuccess<Appointment>).data;
      expect(appt.id, equals(appointmentId));
      expect(appt.status, equals(AppointmentStatus.attended));
    });

    test('markNoShow calls POST /appointments/{id}/no-show with reason', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments/$appointmentId/no-show'));
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['reason'], equals('Patient unreachable'));

        final responseData = {
          'message': 'تم تسجيل عدم حضور المريض.',
          'data': {
            'id': appointmentId,
            'status': 'no_show',
          }
        };

        return http.Response(jsonEncode(responseData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.markNoShow(appointmentId, reason: 'Patient unreachable');

      expect(result, isA<ApiSuccess<Appointment>>());
      final appt = (result as ApiSuccess<Appointment>).data;
      expect(appt.id, equals(appointmentId));
      expect(appt.status, equals(AppointmentStatus.noShow));
    });

    test('searchPatients queries GET /patients and parses patient results', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, endsWith('/patients'));
        expect(request.url.queryParameters['search'], equals('Sarah'));
        expect(request.url.queryParameters['page'], equals('1'));
        expect(request.url.queryParameters['per_page'], equals('20'));

        final responseData = {
          'data': [
            {
              'id': patientId,
              'mrn': 'MRN-2026-VAL99',
              'first_name': 'Sarah',
              'last_name': 'Benali',
              'phone': '0555123456',
              'email': 'sarah@aafiya.test',
              'gender': 'female',
            }
          ]
        };

        return http.Response(jsonEncode(responseData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.searchPatients(query: 'Sarah');

      expect(result, isA<ApiSuccess<List<PatientSearchResult>>>());
      final list = (result as ApiSuccess<List<PatientSearchResult>>).data;
      expect(list.length, equals(1));
      expect(list.first.id, equals(patientId));
      expect(list.first.fullName, equals('Sarah Benali'));
      expect(list.first.mrn, equals('MRN-2026-VAL99'));
    });

    test('confirmAppointment posts to /appointments/{id}/confirm and deserializes confirmed Appointment', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments/$appointmentId/confirm'));

        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['reason'], equals('Confirmed by assistant'));

        final responseData = {
          'message': 'Appointment confirmed successfully',
          'data': {
            'id': appointmentId,
            'booking_reference': 'BK-20260916-0001',
            'appointment_date': '2026-09-16',
            'time_slot': '11:00',
            'status': 'confirmed',
            'patient': {
              'id': patientId,
              'name': 'Sarah Benali',
              'phone': '0555123456',
            },
          },
        };

        return http.Response(jsonEncode(responseData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.confirmAppointment(appointmentId, reason: 'Confirmed by assistant');

      expect(result, isA<ApiSuccess<Appointment>>());
      final appt = (result as ApiSuccess<Appointment>).data;
      expect(appt.id, equals(appointmentId));
      expect(appt.status, equals(AppointmentStatus.confirmed));
    });

    test('confirmAppointment returns ApiFailure on 403 Forbidden', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'Unauthorized action: missing booking.confirm permission.',
          }),
          403,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.confirmAppointment(appointmentId);

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<ForbiddenException>());
      expect(failure.exception.message, contains('missing booking.confirm'));
    });

    test('fetchQueue transmits doctor_id and date range filters when supplied', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, endsWith('/appointments'));
        expect(request.url.queryParameters['doctor_id'], equals('doc-101'));
        expect(request.url.queryParameters['from_date'], equals('2026-09-01'));
        expect(request.url.queryParameters['to_date'], equals('2026-09-30'));
        expect(request.url.queryParameters['status'], equals('pending'));
        expect(request.url.queryParameters['appointment_date'], isNull);

        final responseData = {
          'data': [
            {
              'id': appointmentId,
              'booking_reference': 'BK-PENDING-001',
              'appointment_date': '2026-09-16',
              'time_slot': '14:00',
              'status': 'pending',
              'patient': {
                'id': patientId,
                'name': 'Sarah Benali',
              },
            }
          ],
          'meta': {
            'current_page': 1,
            'last_page': 1,
            'per_page': 15,
            'total': 1,
          },
        };

        return http.Response(jsonEncode(responseData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.fetchQueue(
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
        doctorId: 'doc-101',
        status: 'pending',
      );

      expect(result, isA<ApiSuccess<PaginatedAppointments>>());
      final data = (result as ApiSuccess<PaginatedAppointments>).data;
      expect(data.items.length, equals(1));
      expect(data.items.first.status, equals(AppointmentStatus.pending));
    });
  });
}

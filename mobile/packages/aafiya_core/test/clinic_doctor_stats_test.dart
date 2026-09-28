import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('ClinicStatsSummary Model Tests', () {
    test('ClinicStatsSummary.fromJson correctly deserializes all 10 KPIs', () {
      final json = {
        'total_appointments': 45,
        'pending_check_in': 8,
        'in_waiting_room': 5,
        'completed': 22,
        'no_show': 3,
        'cancelled': 4,
        'rejected': 1,
        'expired': 2,
        'rescheduled': 0,
        'walk_in_visits': 7,
      };

      final summary = ClinicStatsSummary.fromJson(json);

      expect(summary.totalAppointments, equals(45));
      expect(summary.pendingCheckIn, equals(8));
      expect(summary.inWaitingRoom, equals(5));
      expect(summary.completed, equals(22));
      expect(summary.noShow, equals(3));
      expect(summary.cancelled, equals(4));
      expect(summary.rejected, equals(1));
      expect(summary.expired, equals(2));
      expect(summary.rescheduled, equals(0));
      expect(summary.walkInVisits, equals(7));
      expect(summary == ClinicStatsSummary.zero, isFalse);
    });

    test('ClinicStatsSummary.fromJson handles missing or null fields gracefully', () {
      final summary = ClinicStatsSummary.fromJson({});

      expect(summary.totalAppointments, equals(0));
      expect(summary.pendingCheckIn, equals(0));
      expect(summary.inWaitingRoom, equals(0));
      expect(summary.completed, equals(0));
      expect(summary.noShow, equals(0));
      expect(summary.cancelled, equals(0));
      expect(summary.rejected, equals(0));
      expect(summary.expired, equals(0));
      expect(summary.rescheduled, equals(0));
      expect(summary.walkInVisits, equals(0));
      expect(summary == ClinicStatsSummary.zero, isTrue);
    });

    test('ClinicStatsSummary.zero creates an instance with all zeros', () {
      const zero = ClinicStatsSummary.zero;

      expect(zero.totalAppointments, equals(0));
      expect(zero.completed, equals(0));
      expect(zero.inWaitingRoom, equals(0));
      expect(zero.walkInVisits, equals(0));
    });
  });

  group('ClinicDoctorItem & ClinicSelectedDoctor Models', () {
    test('ClinicDoctorItem.fromJson parses doctor metadata and metrics', () {
      final json = {
        'id': 'doc-uuid-101',
        'name': 'Dr. Fatima Zahra',
        'specialty': 'Cardiology',
        'position': 'director',
        'metrics': {
          'total_appointments': 15,
          'pending_check_in': 2,
          'in_waiting_room': 3,
          'completed': 9,
          'no_show': 1,
          'cancelled': 0,
          'rejected': 0,
          'expired': 0,
          'rescheduled': 0,
          'walk_in_visits': 4,
        },
      };

      final doctor = ClinicDoctorItem.fromJson(json);

      expect(doctor.id, equals('doc-uuid-101'));
      expect(doctor.name, equals('Dr. Fatima Zahra'));
      expect(doctor.specialty, equals('Cardiology'));
      expect(doctor.position, equals('director'));
      expect(doctor.metrics.totalAppointments, equals(15));
      expect(doctor.metrics.completed, equals(9));
      expect(doctor.metrics.walkInVisits, equals(4));
    });

    test('ClinicSelectedDoctor.fromJson parses focused doctor details', () {
      final json = {
        'id': 'doc-uuid-202',
        'name': 'Dr. Karim Mansour',
        'specialty': 'Pediatrics',
        'position': 'doctor',
      };

      final selectedDoctor = ClinicSelectedDoctor.fromJson(json);

      expect(selectedDoctor.id, equals('doc-uuid-202'));
      expect(selectedDoctor.name, equals('Dr. Karim Mansour'));
      expect(selectedDoctor.specialty, equals('Pediatrics'));
      expect(selectedDoctor.position, equals('doctor'));
    });
  });

  group('ClinicDoctorStatsData Root Container Tests', () {
    test('Correctly deserializes All Doctors Mode response', () {
      final json = {
        'clinic': {
          'id': 'clinic-uuid-001',
          'name': 'Clinique Centrale Alger',
        },
        'filters': {
          'from_date': '2026-09-01',
          'to_date': '2026-09-20',
          'doctor_id': null,
        },
        'summary': {
          'total_appointments': 100,
          'pending_check_in': 10,
          'in_waiting_room': 15,
          'completed': 65,
          'no_show': 5,
          'cancelled': 3,
          'rejected': 1,
          'expired': 1,
          'rescheduled': 0,
          'walk_in_visits': 12,
        },
        'doctors': [
          {
            'id': 'doc-1',
            'name': 'Dr. Ahmed',
            'specialty': 'General',
            'position': 'doctor',
            'metrics': {'total_appointments': 50, 'completed': 35},
          },
          {
            'id': 'doc-2',
            'name': 'Dr. Sarah',
            'specialty': 'Dental',
            'position': 'doctor',
            'metrics': {'total_appointments': 50, 'completed': 30},
          },
        ],
        'selected_doctor': null,
      };

      final data = ClinicDoctorStatsData.fromJson(json);

      expect(data.clinic.id, equals('clinic-uuid-001'));
      expect(data.clinic.name, equals('Clinique Centrale Alger'));
      expect(data.filters.fromDate, equals('2026-09-01'));
      expect(data.filters.toDate, equals('2026-09-20'));
      expect(data.filters.doctorId, isNull);
      expect(data.summary.totalAppointments, equals(100));
      expect(data.doctors.length, equals(2));
      expect(data.selectedDoctor, isNull);
      expect(data.isSelectedDoctorMode, isFalse);
      expect(data.isZeroRecords, isFalse);
    });

    test('Correctly deserializes Selected Doctor Mode response', () {
      final json = {
        'clinic': {
          'id': 'clinic-uuid-001',
          'name': 'Clinique Centrale Alger',
        },
        'filters': {
          'from_date': '2026-09-15',
          'to_date': '2026-09-15',
          'doctor_id': 'doc-1',
        },
        'summary': {
          'total_appointments': 20,
          'pending_check_in': 2,
          'in_waiting_room': 3,
          'completed': 14,
          'no_show': 1,
          'cancelled': 0,
          'rejected': 0,
          'expired': 0,
          'rescheduled': 0,
          'walk_in_visits': 5,
        },
        'doctors': <Map<String, dynamic>>[],
        'selected_doctor': {
          'id': 'doc-1',
          'name': 'Dr. Ahmed',
          'specialty': 'General',
          'position': 'doctor',
        },
      };

      final data = ClinicDoctorStatsData.fromJson(json);

      expect(data.isSelectedDoctorMode, isTrue);
      expect(data.selectedDoctor, isNotNull);
      expect(data.selectedDoctor!.id, equals('doc-1'));
      expect(data.selectedDoctor!.name, equals('Dr. Ahmed'));
      expect(data.doctors, isEmpty);
      expect(data.summary.completed, equals(14));
    });

    test('Correctly detects zero records', () {
      final json = {
        'clinic': {'id': 'c1', 'name': 'C1'},
        'filters': {'from_date': '2026-09-20', 'to_date': '2026-09-20'},
        'summary': {
          'total_appointments': 0,
          'pending_check_in': 0,
          'in_waiting_room': 0,
          'completed': 0,
          'no_show': 0,
          'cancelled': 0,
          'rejected': 0,
          'expired': 0,
          'rescheduled': 0,
          'walk_in_visits': 0,
        },
        'doctors': <Map<String, dynamic>>[],
        'selected_doctor': null,
      };

      final data = ClinicDoctorStatsData.fromJson(json);
      expect(data.isZeroRecords, isTrue);
    });
  });

  group('ClinicDoctorStatsService Networking Tests', () {
    test('fetches clinic doctor stats without query params by default', () async {
      String? requestedPath;
      Map<String, String>? requestedHeaders;

      final mockHttp = MockClient((req) async {
        requestedPath = req.url.toString();
        requestedHeaders = req.headers;

        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'clinic': {'id': 'c-1', 'name': 'Test Clinic'},
              'filters': {'from_date': '2026-09-20', 'to_date': '2026-09-20'},
              'summary': {
                'total_appointments': 10,
                'pending_check_in': 1,
                'in_waiting_room': 2,
                'completed': 7,
                'no_show': 0,
                'cancelled': 0,
                'rejected': 0,
                'expired': 0,
                'rescheduled': 0,
                'walk_in_visits': 2,
              },
              'doctors': <Map<String, dynamic>>[],
              'selected_doctor': null,
            },
          }),
          200,
        );
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      apiClient.setActiveClinicId('c-1');
      final service = ClinicDoctorStatsService(apiClient: apiClient);

      final result = await service.fetchClinicDoctorStats();

      expect(result, isA<ApiSuccess<ClinicDoctorStatsData>>());
      final data = (result as ApiSuccess<ClinicDoctorStatsData>).data;
      expect(data.clinic.id, equals('c-1'));
      expect(data.summary.totalAppointments, equals(10));
      expect(requestedPath, contains('/clinic/doctor-stats'));
      expect(requestedPath, isNot(contains('from_date=')));
      expect(requestedHeaders?['x-clinic-id'] ?? requestedHeaders?['X-Clinic-ID'], equals('c-1'));
    });

    test('preserves from_date, to_date, and doctor_id query parameters', () async {
      Uri? requestedUri;

      final mockHttp = MockClient((req) async {
        requestedUri = req.url;
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'clinic': {'id': 'c-1', 'name': 'Test Clinic'},
              'filters': {
                'from_date': '2026-09-01',
                'to_date': '2026-09-15',
                'doctor_id': 'doc-test-99',
              },
              'summary': {
                'total_appointments': 5,
                'pending_check_in': 0,
                'in_waiting_room': 0,
                'completed': 5,
                'no_show': 0,
                'cancelled': 0,
                'rejected': 0,
                'expired': 0,
                'rescheduled': 0,
                'walk_in_visits': 0,
              },
              'doctors': <Map<String, dynamic>>[],
              'selected_doctor': {
                'id': 'doc-test-99',
                'name': 'Dr. Test',
                'specialty': 'Neurology',
                'position': 'doctor',
              },
            },
          }),
          200,
        );
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final service = ClinicDoctorStatsService(apiClient: apiClient);

      final result = await service.fetchClinicDoctorStats(
        fromDate: '2026-09-01',
        toDate: '2026-09-15',
        doctorId: 'doc-test-99',
      );

      expect(result, isA<ApiSuccess<ClinicDoctorStatsData>>());
      expect(requestedUri?.queryParameters['from_date'], equals('2026-09-01'));
      expect(requestedUri?.queryParameters['to_date'], equals('2026-09-15'));
      expect(requestedUri?.queryParameters['doctor_id'], equals('doc-test-99'));
    });

    test('returns ApiFailure on 403 Forbidden', () async {
      final mockHttp = MockClient((req) async {
        return http.Response(
          jsonEncode({
            'message': 'Unauthorized. User does not have clinic director privileges.',
          }),
          403,
        );
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final service = ClinicDoctorStatsService(apiClient: apiClient);

      final result = await service.fetchClinicDoctorStats();

      expect(result, isA<ApiFailure<ClinicDoctorStatsData>>());
      final failure = result as ApiFailure<ClinicDoctorStatsData>;
      expect(failure.exception, isA<ForbiddenException>());
      expect((failure.exception as ForbiddenException).statusCode, equals(403));
      expect(failure.exception.message, contains('Unauthorized'));
    });

    test('returns ApiFailure on 422 Unprocessable Entity with validation errors', () async {
      final mockHttp = MockClient((req) async {
        return http.Response(
          jsonEncode({
            'message': 'The to date must be a date after or equal to from date.',
            'errors': {
              'to_date': ['The to date must be a date after or equal to from date.'],
            },
          }),
          422,
        );
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final service = ClinicDoctorStatsService(apiClient: apiClient);

      final result = await service.fetchClinicDoctorStats(
        fromDate: '2026-09-20',
        toDate: '2026-09-10',
      );

      expect(result, isA<ApiFailure<ClinicDoctorStatsData>>());
      final failure = result as ApiFailure<ClinicDoctorStatsData>;
      expect(failure.exception, isA<ValidationException>());
      expect((failure.exception as ValidationException).statusCode, equals(422));
    });
  });
}

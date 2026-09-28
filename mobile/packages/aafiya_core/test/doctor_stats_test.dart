import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('DoctorStats Model Tests', () {
    test('DoctorStats.fromJson correctly deserializes verified backend contract', () {
      final json = {
        'today_total': 12,
        'pending_check_in': 4,
        'in_waiting_room': 3,
        'completed_today': 5,
        'no_show_today': 1,
        'active_clinic_id': '01a084d2-021f-71eb-b09c-39d9ddce3458',
        'active_clinic_name': 'عيادة شفاء الاختبارية 01',
        'date': '2026-09-15',
      };

      final stats = DoctorStats.fromJson(json);

      expect(stats.todayTotal, 12);
      expect(stats.pendingCheckIn, 4);
      expect(stats.inWaitingRoom, 3);
      expect(stats.completedToday, 5);
      expect(stats.noShowToday, 1);
      expect(stats.activeClinicId, '01a084d2-021f-71eb-b09c-39d9ddce3458');
      expect(stats.activeClinicName, 'عيادة شفاء الاختبارية 01');
      expect(stats.date, '2026-09-15');
    });

    test('DoctorStats.fromJson handles missing or null fields gracefully', () {
      final stats = DoctorStats.fromJson({});

      expect(stats.todayTotal, 0);
      expect(stats.pendingCheckIn, 0);
      expect(stats.inWaitingRoom, 0);
      expect(stats.completedToday, 0);
      expect(stats.noShowToday, 0);
      expect(stats.activeClinicId, isNull);
      expect(stats.activeClinicName, isNull);
      expect(stats.date, '');
    });

    test('DoctorStats.empty creates instance with zero values', () {
      final empty = DoctorStats.empty(date: '2026-09-15');

      expect(empty.todayTotal, 0);
      expect(empty.pendingCheckIn, 0);
      expect(empty.inWaitingRoom, 0);
      expect(empty.completedToday, 0);
      expect(empty.noShowToday, 0);
      expect(empty.date, '2026-09-15');
    });

    test('DoctorStats equality and hashCode', () {
      final stats1 = DoctorStats.fromJson({
        'today_total': 5,
        'pending_check_in': 2,
        'in_waiting_room': 1,
        'completed_today': 2,
        'no_show_today': 0,
        'date': '2026-09-15',
      });

      final stats2 = DoctorStats.fromJson({
        'today_total': 5,
        'pending_check_in': 2,
        'in_waiting_room': 1,
        'completed_today': 2,
        'no_show_today': 0,
        'date': '2026-09-15',
      });

      expect(stats1, equals(stats2));
      expect(stats1.hashCode, equals(stats2.hashCode));
    });
  });

  group('PaginatedAppointments Model Tests', () {
    test('PaginatedAppointments.fromJson correctly parses items and pagination meta', () {
      final json = {
        'data': [
          {
            'id': 'app-001',
            'booking_reference': 'REF-001',
            'status': 'confirmed',
            'appointment_date': '2026-09-15',
            'time_slot': '09:00',
            'patient': {
              'id': 'pat-001',
              'name': 'أحمد محمد',
            },
            'clinic': {
              'id': 'clinic-001',
              'name': 'العيادة المركزية',
            },
          },
          {
            'id': 'app-002',
            'booking_reference': 'REF-002',
            'status': 'attended',
            'appointment_date': '2026-09-15',
            'time_slot': '09:30',
            'patient': {
              'id': 'pat-002',
              'name': 'فاطمة علي',
            },
          },
        ],
        'meta': {
          'current_page': 1,
          'last_page': 3,
          'per_page': 2,
          'total': 6,
        },
      };

      final result = PaginatedAppointments.fromJson(json);

      expect(result.items.length, 2);
      expect(result.items[0].id, 'app-001');
      expect(result.items[0].patient.name, 'أحمد محمد');
      expect(result.items[0].status, AppointmentStatus.confirmed);
      expect(result.items[1].id, 'app-002');
      expect(result.items[1].status, AppointmentStatus.attended);
      expect(result.currentPage, 1);
      expect(result.lastPage, 3);
      expect(result.perPage, 2);
      expect(result.total, 6);
      expect(result.hasMore, isTrue);
      expect(result.isEmpty, isFalse);
      expect(result.isNotEmpty, isTrue);
    });

    test('PaginatedAppointments.fromJson handles empty list cleanly', () {
      final json = {
        'data': <Map<String, dynamic>>[],
        'meta': {
          'current_page': 1,
          'last_page': 1,
          'per_page': 20,
          'total': 0,
        },
      };

      final result = PaginatedAppointments.fromJson(json);

      expect(result.items, isEmpty);
      expect(result.hasMore, isFalse);
      expect(result.isEmpty, isTrue);
    });
  });

  group('DoctorDashboardService Tests', () {
    test('fetchDoctorStats fetches and parses stats successfully', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/doctor/stats'));
        expect(request.method, 'GET');

        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'today_total': 8,
              'pending_check_in': 3,
              'in_waiting_room': 2,
              'completed_today': 3,
              'no_show_today': 0,
              'active_clinic_id': 'clinic-abc',
              'active_clinic_name': 'عيادة الشفاء',
              'date': '2026-09-15',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );

      final service = DoctorDashboardService(apiClient: apiClient);
      final result = await service.fetchDoctorStats();

      expect(result, isA<ApiSuccess<DoctorStats>>());
      final stats = (result as ApiSuccess<DoctorStats>).data;
      expect(stats.todayTotal, 8);
      expect(stats.inWaitingRoom, 2);
      expect(stats.activeClinicName, 'عيادة الشفاء');
    });

    test('fetchDoctorStats transmits date parameter if specified', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.queryParameters['date'], '2026-09-20');
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {'today_total': 0, 'date': '2026-09-20'},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );

      final service = DoctorDashboardService(apiClient: apiClient);
      final result = await service.fetchDoctorStats(date: '2026-09-20');

      expect(result, isA<ApiSuccess<DoctorStats>>());
      expect((result as ApiSuccess<DoctorStats>).data.date, '2026-09-20');
    });

    test('fetchDoctorStats handles network error', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'message': 'Unauthenticated'}),
          401,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );

      final service = DoctorDashboardService(apiClient: apiClient);
      final result = await service.fetchDoctorStats();

      expect(result, isA<ApiFailure<DoctorStats>>());
    });

    test('fetchTodayAgenda queries /appointments with sorting and pagination', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/appointments'));
        expect(request.url.queryParameters['sort_by'], 'time_slot');
        expect(request.url.queryParameters['sort_order'], 'asc');
        expect(request.url.queryParameters['page'], '2');
        expect(request.url.queryParameters['per_page'], '10');
        expect(request.url.queryParameters['appointment_date'], '2026-09-15');
        expect(request.url.queryParameters['status'], 'confirmed');

        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'app-100',
                'booking_reference': 'MS-100',
                'status': 'confirmed',
                'appointment_date': '2026-09-15',
                'time_slot': '10:00',
              }
            ],
            'meta': {
              'current_page': 2,
              'last_page': 2,
              'per_page': 10,
              'total': 11,
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );

      final service = DoctorDashboardService(apiClient: apiClient);
      final result = await service.fetchTodayAgenda(
        appointmentDate: '2026-09-15',
        page: 2,
        perPage: 10,
        status: 'confirmed',
      );

      expect(result, isA<ApiSuccess<PaginatedAppointments>>());
      final agenda = (result as ApiSuccess<PaginatedAppointments>).data;
      expect(agenda.items.length, 1);
      expect(agenda.items[0].id, 'app-100');
      expect(agenda.currentPage, 2);
      expect(agenda.hasMore, isFalse);
    });

    test('attendAppointment sends POST to /appointments/{id}/attend and returns updated appointment', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/api/v1/appointments/app-123/attend');

        return http.Response(
          jsonEncode({
            'message': 'تم تسجيل حضور الموعد بنجاح.',
            'data': {
              'id': 'app-123',
              'booking_reference': 'MS-123',
              'status': 'attended',
              'appointment_date': '2026-09-15',
              'time_slot': '09:30',
              'checked_in_at': '2026-09-15T09:35:00.000Z',
              'checked_in_by': 'د. طبيب اختباري',
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );

      final service = DoctorDashboardService(apiClient: apiClient);
      final result = await service.attendAppointment('app-123');

      expect(result, isA<ApiSuccess<Appointment>>());
      final app = (result as ApiSuccess<Appointment>).data;
      expect(app.id, 'app-123');
      expect(app.status, AppointmentStatus.attended);
      expect(app.checkedInAt, '2026-09-15T09:35:00.000Z');
      expect(app.checkedInBy, 'د. طبيب اختباري');
    });

    test('markNoShow sends POST to /appointments/{id}/no-show with optional reason', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/api/v1/appointments/app-456/no-show');
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['reason'], 'المريض لم يحضر بعد انتظار ساعة');

        return http.Response(
          jsonEncode({
            'message': 'تم تسجيل عدم حضور المريض للموعد (No-Show).',
            'data': {
              'id': 'app-456',
              'booking_reference': 'MS-456',
              'status': 'no_show',
              'appointment_date': '2026-09-15',
              'time_slot': '11:00',
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );

      final service = DoctorDashboardService(apiClient: apiClient);
      final result = await service.markNoShow('app-456', reason: 'المريض لم يحضر بعد انتظار ساعة');

      expect(result, isA<ApiSuccess<Appointment>>());
      final app = (result as ApiSuccess<Appointment>).data;
      expect(app.id, 'app-456');
      expect(app.status, AppointmentStatus.noShow);
    });
  });
}

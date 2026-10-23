import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('PatientNotification Model Tests', () {
    test('parses valid payload with all fields correctly', () {
      final json = {
        'id': '01928374-uuid-patient-1',
        'appointment_id': '101',
        'created_at': '2026-10-23T08:00:00Z',
        'acknowledged_at': null,
        'template': 'vacation_reschedule_success',
        'payload': {
          'message': 'تمت إعادة جدولة موعدكم إلى 2026-10-25',
          'new_date': '2026-10-25',
          'new_slot': '09:00',
          'clinic_name': 'عيادة النور',
          'booking_reference': 'BK-12345',
        },
        // Sensitive engine fields that must be dropped/ignored
        'recipient_phone': '0555123456',
        'retry_count': 0,
        'last_error': null,
      };

      final notification = PatientNotification.fromJson(json);

      expect(notification.id, equals('01928374-uuid-patient-1'));
      expect(notification.appointmentId, equals('101'));
      expect(notification.isAcknowledged, isFalse);
      expect(notification.acknowledgedAt, isNull);
      expect(notification.message,
          equals('تمت إعادة جدولة موعدكم إلى 2026-10-25'));
      expect(notification.newDate, equals('2026-10-25'));
      expect(notification.newSlot, equals('09:00'));
      expect(notification.clinicName, equals('عيادة النور'));
      expect(notification.bookingReference, equals('BK-12345'));
    });

    test(
        'derives template-specific fallback messages when payload.message is empty or missing',
        () {
      final templatesAndFallbacks = {
        'vacation_reschedule_success':
            'تمت إعادة جدولة موعدكم الطبي نظراً لإجازة الطبيب.',
        'appointment_cancelled': 'تم إلغاء الموعد الطبي.',
        'appointment_rejected': 'تم رفض طلب الموعد الطبي.',
        'unknown_or_custom': 'إشعار طبي جديد.',
      };

      for (final entry in templatesAndFallbacks.entries) {
        final json = {
          'id': 'uuid-${entry.key}',
          'template': entry.key,
          'created_at': '2026-10-23T08:00:00Z',
          'payload': <String, dynamic>{},
        };

        final notification = PatientNotification.fromJson(json);
        expect(notification.message, equals(entry.value));
      }
    });

    test(
        'handles completely missing or non-map payload defensively without crashing',
        () {
      final json = {
        'id': 'uuid-malformed',
        'template': 'vacation_reschedule_success',
        'created_at': '2026-10-23T08:00:00Z',
        'payload': 'malformed_string_not_a_map',
      };

      final notification = PatientNotification.fromJson(json);
      expect(notification.id, equals('uuid-malformed'));
      expect(notification.message,
          equals('تمت إعادة جدولة موعدكم الطبي نظراً لإجازة الطبيب.'));
      expect(notification.clinicName, isNull);
    });

    test(
        'acknowledged notification parses acknowledgedAt and reports isAcknowledged true',
        () {
      final json = {
        'id': 'uuid-ack',
        'created_at': '2026-10-23T08:00:00Z',
        'acknowledged_at': '2026-10-23T09:30:00Z',
        'template': 'vacation_reschedule_success',
        'payload': {'message': 'إشعار مقر'},
      };

      final notification = PatientNotification.fromJson(json);
      expect(notification.isAcknowledged, isTrue);
      expect(notification.acknowledgedAt, isNotNull);
    });
  });

  group('PatientNotificationsResponse Tests', () {
    test('parses length-aware paginator envelope with items and metadata', () {
      final json = {
        'current_page': 1,
        'last_page': 3,
        'per_page': 20,
        'total': 45,
        'data': [
          {
            'id': 'uuid-1',
            'created_at': '2026-10-23T08:00:00Z',
            'template': 'vacation_reschedule_success',
            'payload': {'message': 'رسالة 1'},
          },
          'corrupted_entry_not_a_map',
          {
            'id': 'uuid-2',
            'created_at': '2026-10-23T08:05:00Z',
            'template': 'appointment_cancelled',
            'payload': {'message': 'رسالة 2'},
          },
        ],
      };

      final response = PatientNotificationsResponse.fromJson(json);
      expect(response.currentPage, equals(1));
      expect(response.lastPage, equals(3));
      expect(response.total, equals(45));
      expect(response.hasMore, isTrue);
      expect(response.items.length, equals(2)); // Skips corrupted item
      expect(response.items.first.id, equals('uuid-1'));
      expect(response.items.last.id, equals('uuid-2'));
    });
  });

  group('ClinicEscalation Model Tests', () {
    test('parses ClinicEscalationResource fields accurately', () {
      final json = {
        'id': '01928374-uuid-escalation-1',
        'appointment_id': '501',
        'patient_name': 'أحمد بن علي',
        'patient_phone': '0555987654',
        'doctor_name': 'د. فاطمة الزهراء',
        'clinic_id': '12',
        'clinic_name': 'عيادة الأمل',
        'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
        'instruction': 'يرجى التواصل الهاتفي المباشر مع المريض.',
        'original_date': '2026-10-24',
        'original_time_slot': '10:00',
        'replacement_appointment_id': '502',
        'new_date': '2026-10-27',
        'new_slot': '11:00',
        'escalated_at': '2026-10-23T08:00:00Z',
        'acknowledged_at': null,
        'is_acknowledged': false,
      };

      final escalation = ClinicEscalation.fromJson(json);

      expect(escalation.id, equals('01928374-uuid-escalation-1'));
      expect(escalation.appointmentId, equals('501'));
      expect(escalation.patientName, equals('أحمد بن علي'));
      expect(escalation.patientPhone, equals('0555987654'));
      expect(escalation.doctorName, equals('د. فاطمة الزهراء'));
      expect(escalation.clinicId, equals('12'));
      expect(escalation.clinicName, equals('عيادة الأمل'));
      expect(escalation.escalationReason,
          equals('PATIENT_UNREAD_SLA_EXPIRED_24H'));
      expect(escalation.instruction,
          equals('يرجى التواصل الهاتفي المباشر مع المريض.'));
      expect(escalation.originalDate, equals('2026-10-24'));
      expect(escalation.newDate, equals('2026-10-27'));
      expect(escalation.isAcknowledged, isFalse);
    });
  });

  group('ClinicEscalationsResponse Tests', () {
    test('parses nested meta pagination envelope', () {
      final json = {
        'data': [
          {
            'id': 'esc-1',
            'appointment_id': '501',
            'patient_name': 'مريض 1',
            'patient_phone': '0555111222',
            'doctor_name': 'طبيب 1',
            'clinic_id': '12',
            'clinic_name': 'عيادة',
            'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
            'instruction': 'تعليمات',
            'is_acknowledged': false,
          }
        ],
        'meta': {
          'current_page': 1,
          'last_page': 2,
          'per_page': 20,
          'total': 25,
        },
      };

      final response = ClinicEscalationsResponse.fromJson(json);
      expect(response.currentPage, equals(1));
      expect(response.lastPage, equals(2));
      expect(response.total, equals(25));
      expect(response.hasMore, isTrue);
      expect(response.items.length, equals(1));
    });
  });

  group('Service Layer Integration Tests', () {
    test('PatientNotificationService.fetchNotifications success', () async {
      final client = MockClient((request) async {
        if (request.url.path.contains('/patient/notifications')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'uuid-p1',
                  'created_at': '2026-10-23T08:00:00Z',
                  'template': 'vacation_reschedule_success',
                  'payload': {'message': 'تمت إعادة الجدولة'},
                }
              ],
              'current_page': 1,
              'last_page': 1,
              'per_page': 20,
              'total': 1,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final service = PatientNotificationService(apiClient: apiClient);

      final result = await service.fetchNotifications();
      expect(result, isA<ApiSuccess<PatientNotificationsResponse>>());
      final data = (result as ApiSuccess<PatientNotificationsResponse>).data;
      expect(data.items.length, equals(1));
      expect(data.items.first.id, equals('uuid-p1'));
    });

    test('PatientNotificationService.acknowledgeNotification success',
        () async {
      final client = MockClient((request) async {
        if (request.url.path.contains('/acknowledge')) {
          return http.Response(
            jsonEncode({
              'message': 'تم تأكيد استلام الإشعار بنجاح.',
              'data': {
                'id': 'uuid-p1',
                'created_at': '2026-10-23T08:00:00Z',
                'acknowledged_at': '2026-10-23T09:00:00Z',
                'template': 'vacation_reschedule_success',
                'payload': {'message': 'تمت إعادة الجدولة'},
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final service = PatientNotificationService(apiClient: apiClient);

      final result = await service.acknowledgeNotification('uuid-p1');
      expect(result, isA<ApiSuccess<PatientNotification>>());
      final notification = (result as ApiSuccess<PatientNotification>).data;
      expect(notification.isAcknowledged, isTrue);
      expect(notification.id, equals('uuid-p1'));
    });

    test(
        'ClinicNotificationService.acknowledgeEscalation handles missing data with ApiFailure',
        () async {
      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({'message': 'Unexpected missing data key'}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: client);
      final service = ClinicNotificationService(apiClient: apiClient);

      final result = await service.acknowledgeEscalation('esc-1');
      expect(result, isA<ApiFailure<ClinicEscalation>>());
    });
  });
}

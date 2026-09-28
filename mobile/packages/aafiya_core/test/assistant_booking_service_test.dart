import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  const clinicId = '01a081ea-2e14-72d8-b97d-29026efc4bf4';
  const doctorId = '01a081ea-2e12-73b9-a130-c6026b413ba8';
  const appointmentDate = '2026-09-18';
  const timeSlot = '10:00';

  group('AppointmentSlot Model Tests', () {
    test('AppointmentSlot correctly parses backend JSON structure', () {
      final json = {
        'time_slot': '09:00',
        'max_capacity': 10,
        'occupied': 3,
        'available': 7,
        'is_available': true,
      };

      final slot = AppointmentSlot.fromJson(json);
      expect(slot.timeSlot, equals('09:00'));
      expect(slot.maxCapacity, equals(10));
      expect(slot.occupied, equals(3));
      expect(slot.available, equals(7));
      expect(slot.isAvailable, isTrue);

      final outJson = slot.toJson();
      expect(outJson['time_slot'], equals('09:00'));
      expect(outJson['available'], equals(7));
      expect(outJson['is_available'], isTrue);
    });

    test('AppointmentSlot handles full capacity and zero available', () {
      final json = {
        'time_slot': '14:00',
        'max_capacity': 10,
        'occupied': 10,
        'available': 0,
        'is_available': false,
      };

      final slot = AppointmentSlot.fromJson(json);
      expect(slot.timeSlot, equals('14:00'));
      expect(slot.occupied, equals(10));
      expect(slot.available, equals(0));
      expect(slot.isAvailable, isFalse);
    });

    test('AppointmentSlot value equality and hashCode', () {
      const slot1 = AppointmentSlot(
        timeSlot: '08:00',
        maxCapacity: 10,
        occupied: 1,
        available: 9,
        isAvailable: true,
      );
      const slot2 = AppointmentSlot(
        timeSlot: '08:00',
        maxCapacity: 10,
        occupied: 1,
        available: 9,
        isAvailable: true,
      );
      const slot3 = AppointmentSlot(
        timeSlot: '09:00',
        maxCapacity: 10,
        occupied: 1,
        available: 9,
        isAvailable: true,
      );

      expect(slot1, equals(slot2));
      expect(slot1.hashCode, equals(slot2.hashCode));
      expect(slot1, isNot(equals(slot3)));
    });
  });

  group('AssistantBookingService Tests', () {
    test('getClinicDoctors returns active doctors only', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, endsWith('/clinics/$clinicId'));

        final responseData = {
          'data': {
            'id': clinicId,
            'name': 'عيادة الأمل',
            'doctors': [
              {
                'id': doctorId,
                'name': 'د. مرسلي فاتح',
                'email': 'morsli@aafiya.test',
                'specialty': 'طب عام',
                'position': 'director',
                'is_active': true,
              },
              {
                'id': '01a084d6-a74c-7312-b72a-f89151b20496',
                'name': 'د. سمير بن علي',
                'email': 'samir@aafiya.test',
                'specialty': 'أمراض باطنية',
                'position': 'doctor',
                'is_active': true,
              },
              {
                'id': 'inactive-doc-uuid',
                'name': 'د. طبيب غير نشط',
                'position': 'doctor',
                'is_active': false,
              },
            ],
          },
        };

        return http.Response(
          jsonEncode(responseData),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantBookingService(apiClient: apiClient);
      final result = await service.getClinicDoctors(clinicId);

      expect(result, isA<ApiSuccess<List<ClinicDoctorStaff>>>());
      final doctors = (result as ApiSuccess<List<ClinicDoctorStaff>>).data;
      expect(doctors.length, equals(2));
      expect(doctors[0].name, equals('د. مرسلي فاتح'));
      expect(doctors[0].isActive, isTrue);
      expect(doctors[1].name, equals('د. سمير بن علي'));
      expect(doctors[1].isActive, isTrue);
    });

    test('getAvailableSlots passes query params and parses 10 hourly slots', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, endsWith('/appointments/slots'));
        expect(request.url.queryParameters['clinic_id'], equals(clinicId));
        expect(request.url.queryParameters['doctor_id'], equals(doctorId));
        expect(request.url.queryParameters['date'], equals(appointmentDate));

        final responseData = {
          'data': {
            'slots': [
              {'time_slot': '08:00', 'max_capacity': 10, 'occupied': 2, 'available': 8, 'is_available': true},
              {'time_slot': '09:00', 'max_capacity': 10, 'occupied': 5, 'available': 5, 'is_available': true},
              {'time_slot': '10:00', 'max_capacity': 10, 'occupied': 10, 'available': 0, 'is_available': false},
              {'time_slot': '11:00', 'max_capacity': 10, 'occupied': 1, 'available': 9, 'is_available': true},
              {'time_slot': '12:00', 'max_capacity': 10, 'occupied': 0, 'available': 10, 'is_available': true},
              {'time_slot': '13:00', 'max_capacity': 10, 'occupied': 0, 'available': 10, 'is_available': true},
              {'time_slot': '14:00', 'max_capacity': 10, 'occupied': 3, 'available': 7, 'is_available': true},
              {'time_slot': '15:00', 'max_capacity': 10, 'occupied': 4, 'available': 6, 'is_available': true},
              {'time_slot': '16:00', 'max_capacity': 10, 'occupied': 0, 'available': 10, 'is_available': true},
              {'time_slot': '17:00', 'max_capacity': 10, 'occupied': 1, 'available': 9, 'is_available': true},
            ],
          },
        };

        return http.Response(
          jsonEncode(responseData),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantBookingService(apiClient: apiClient);
      final result = await service.getAvailableSlots(
        clinicId: clinicId,
        doctorId: doctorId,
        date: appointmentDate,
      );

      expect(result, isA<ApiSuccess<List<AppointmentSlot>>>());
      final slots = (result as ApiSuccess<List<AppointmentSlot>>).data;
      expect(slots.length, equals(10));
      expect(slots[0].timeSlot, equals('08:00'));
      expect(slots[0].available, equals(8));
      expect(slots[2].timeSlot, equals('10:00'));
      expect(slots[2].isAvailable, isFalse);
      expect(slots[2].available, equals(0));
    });

    test('createAppointment sends proper JSON payload without booking_center_id', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments'));

        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['clinic_id'], equals(clinicId));
        expect(body['doctor_id'], equals(doctorId));
        expect(body['appointment_date'], equals(appointmentDate));
        expect(body['time_slot'], equals(timeSlot));
        expect(body['patient_name'], equals('أحمد الجزائري'));
        expect(body['patient_phone'], equals('0555112233'));
        expect(body['patient_id'], equals('patient-uuid-123'));
        expect(body['patient_mrn'], equals('MRN-2026-VAL99'));
        expect(body['notes'], equals('متابعة فحص ضغط الدم'));

        // CRITICAL CONTRACT CHECK: booking_center_id MUST NOT be sent for in-clinic assistant bookings
        expect(body.containsKey('booking_center_id'), isFalse);

        final responseData = {
          'data': {
            'id': 'appt-uuid-999',
            'booking_reference': 'MS-2026-0042',
            'status': 'pending',
            'appointment_date': appointmentDate,
            'time_slot': timeSlot,
            'notes': 'متابعة فحص ضغط الدم',
            'clinic': {'id': clinicId, 'name': 'عيادة الأمل'},
            'doctor': {'id': doctorId, 'name': 'د. مرسلي فاتح'},
            'patient': {
              'id': 'patient-uuid-123',
              'name': 'أحمد الجزائري',
              'phone': '0555112233',
              'mrn': 'MRN-2026-VAL99',
            },
          },
        };

        return http.Response(
          jsonEncode(responseData),
          201,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantBookingService(apiClient: apiClient);
      final result = await service.createAppointment(
        clinicId: clinicId,
        doctorId: doctorId,
        appointmentDate: appointmentDate,
        timeSlot: timeSlot,
        patientName: 'أحمد الجزائري',
        patientPhone: '0555112233',
        patientId: 'patient-uuid-123',
        patientMrn: 'MRN-2026-VAL99',
        notes: 'متابعة فحص ضغط الدم',
      );

      expect(result, isA<ApiSuccess<Appointment>>());
      final appointment = (result as ApiSuccess<Appointment>).data;
      expect(appointment.id, equals('appt-uuid-999'));
      expect(appointment.bookingReference, equals('MS-2026-0042'));
      expect(appointment.status, equals(AppointmentStatus.pending));
      expect(appointment.patient.name, equals('أحمد الجزائري'));
      expect(appointment.patient.mrn, equals('MRN-2026-VAL99'));
    });

    test('createAppointment handles 422 slot full conflict correctly', () async {
      final mockClient = MockClient((request) async {
        final errorResponse = {
          'message': 'Selected time slot has reached maximum capacity.',
          'errors': {
            'time_slot': ['The selected time slot is full.'],
          },
        };

        return http.Response(
          jsonEncode(errorResponse),
          422,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantBookingService(apiClient: apiClient);
      final result = await service.createAppointment(
        clinicId: clinicId,
        doctorId: doctorId,
        appointmentDate: appointmentDate,
        timeSlot: timeSlot,
        patientName: 'أحمد الجزائري',
        patientPhone: '0555112233',
      );

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<ValidationException>());
      final validation = failure.exception as ValidationException;
      expect(validation.statusCode, equals(422));
      expect(validation.message, contains('maximum capacity'));
    });
  });
}

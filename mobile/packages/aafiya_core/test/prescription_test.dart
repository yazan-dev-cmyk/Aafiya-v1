import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('Prescription Model Tests', () {
    final sampleJson = {
      'id': 'rx-uuid-101',
      'prescription_reference': 'RX-2026-0001',
      'secure_token': 'sec_tok_998877',
      'qr_verification_url': 'https://api.aafiya.dz/v/sec_tok_998877',
      'patient': {
        'id': 'pat-uuid-1',
        'name': 'Ahmed Benali',
        'mrn': 'MRN-123456',
        'phone': '+213555123456',
      },
      'doctor': {
        'id': 'doc-uuid-1',
        'name': 'Dr. Fatima Mansouri',
        'specialty': 'Cardiology',
      },
      'clinic': {
        'id': 'cli-uuid-1',
        'name': 'El Chifa Clinic',
        'phone': '+21321456789',
      },
      'clinical_visit_id': 'visit-uuid-1',
      'issue_date': '2026-09-14',
      'expiry_date': '2026-10-14',
      'status': 'active',
      'is_valid': true,
      'notes': 'Take medications with plenty of water',
      'items': [
        {
          'id': 'item-1',
          'medication_name': 'Amoxicillin 500mg',
          'dosage': '500mg',
          'frequency': '3 times daily',
          'duration': '7 days',
          'instructions': 'Take after meals',
          'substitution_allowed': false,
        },
        {
          'id': 'item-2',
          'medication_name': 'Paracetamol 1g',
          'dosage': '1000mg',
          'frequency': 'As needed for fever',
          'duration': '5 days',
          'instructions': 'Max 3g per day',
        },
      ],
      'created_at': '2026-09-14T10:30:00.000Z',
    };

    test('Prescription.fromJson correctly parses all fields and nested objects', () {
      final rx = Prescription.fromJson(sampleJson);

      expect(rx.id, equals('rx-uuid-101'));
      expect(rx.prescriptionReference, equals('RX-2026-0001'));
      expect(rx.secureToken, equals('sec_tok_998877'));
      expect(rx.qrVerificationUrl, equals('https://api.aafiya.dz/v/sec_tok_998877'));
      expect(rx.patient.name, equals('Ahmed Benali'));
      expect(rx.patient.mrn, equals('MRN-123456'));
      expect(rx.doctor.name, equals('Dr. Fatima Mansouri'));
      expect(rx.doctor.specialty, equals('Cardiology'));
      expect(rx.clinic.name, equals('El Chifa Clinic'));
      expect(rx.status, equals('active'));
      expect(rx.isValid, isTrue);
      expect(rx.isActive, isTrue);
      expect(rx.isExpired, isFalse);
      expect(rx.isVoided, isFalse);
      expect(rx.notes, equals('Take medications with plenty of water'));
      expect(rx.items.length, equals(2));

      final item1 = rx.items.first;
      expect(item1.medicationName, equals('Amoxicillin 500mg'));
      expect(item1.dosage, equals('500mg'));
      expect(item1.frequency, equals('3 times daily'));
      expect(item1.duration, equals('7 days'));
      expect(item1.instructions, equals('Take after meals'));
      expect(item1.substitutionAllowed, isFalse);

      final item2 = rx.items[1];
      expect(item2.medicationName, equals('Paracetamol 1g'));
      expect(item2.substitutionAllowed, isNull);
    });

    test('Prescription status getters work deterministically', () {
      final voidedRx = Prescription.fromJson({
        ...sampleJson,
        'status': 'voided',
        'is_valid': false,
      });
      expect(voidedRx.isVoided, isTrue);
      expect(voidedRx.isActive, isFalse);

      final expiredRx = Prescription.fromJson({
        ...sampleJson,
        'status': 'expired',
        'is_valid': false,
      });
      expect(expiredRx.isExpired, isTrue);
      expect(expiredRx.isActive, isFalse);

      final completedRx = Prescription.fromJson({
        ...sampleJson,
        'status': 'completed',
        'is_valid': false,
      });
      expect(completedRx.isCompleted, isTrue);
      expect(completedRx.isActive, isFalse);
    });

    test('Prescription.toJson roundtrip preserves integrity', () {
      final rx = Prescription.fromJson(sampleJson);
      final jsonOutput = rx.toJson();

      expect(jsonOutput['id'], equals('rx-uuid-101'));
      expect(jsonOutput['prescription_reference'], equals('RX-2026-0001'));
      expect(jsonOutput['patient']['name'], equals('Ahmed Benali'));
      expect(jsonOutput['items'].length, equals(2));
    });
  });

  group('PrescriptionService Tests', () {
    test('fetchPrescriptions deserializes paginated response with filter parameters', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/prescriptions'));
        expect(request.url.queryParameters['status'], equals('active'));
        expect(request.url.queryParameters['page'], equals('1'));
        expect(request.url.queryParameters['per_page'], equals('10'));

        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'rx-1',
                'prescription_reference': 'RX-001',
                'secure_token': 'tok1',
                'qr_verification_url': 'https://api.aafiya.dz/v/tok1',
                'patient': {'id': 'p1', 'name': 'P1'},
                'doctor': {'id': 'd1', 'name': 'D1'},
                'clinic': {'id': 'c1', 'name': 'C1'},
                'status': 'active',
                'is_valid': true,
                'items': <dynamic>[],
              }
            ],
            'meta': {
              'current_page': 1,
              'last_page': 1,
              'total': 1,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = PrescriptionService(apiClient);

      final result = await service.fetchPrescriptions(
        status: 'active',
        page: 1,
        perPage: 10,
      );

      expect(result, isA<ApiSuccess<PrescriptionPaginatedResult>>());
      final paginated = (result as ApiSuccess<PrescriptionPaginatedResult>).data;
      expect(paginated.prescriptions.length, equals(1));
      expect(paginated.prescriptions.first.id, equals('rx-1'));
      expect(paginated.currentPage, equals(1));
      expect(paginated.total, equals(1));
      expect(paginated.hasMore, isFalse);
    });

    test('getPrescription fetches single prescription by ID', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/prescriptions/rx-123'));
        return http.Response(
          jsonEncode({
            'data': {
              'id': 'rx-123',
              'prescription_reference': 'RX-123',
              'secure_token': 'tok123',
              'qr_verification_url': 'https://api.aafiya.dz/v/tok123',
              'patient': {'id': 'p1', 'name': 'Ahmed'},
              'doctor': {'id': 'd1', 'name': 'Dr. Mansouri'},
              'clinic': {'id': 'c1', 'name': 'Clinic 1'},
              'status': 'active',
              'is_valid': true,
              'items': <dynamic>[],
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = PrescriptionService(apiClient);

      final result = await service.getPrescription('rx-123');
      expect(result, isA<ApiSuccess<Prescription>>());
      final rx = (result as ApiSuccess<Prescription>).data;
      expect(rx.id, equals('rx-123'));
      expect(rx.doctor.name, equals('Dr. Mansouri'));
    });

    test('verifyToken queries public verification endpoint', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/v/test_token_abc'));
        return http.Response(
          jsonEncode({
            'data': {
              'is_valid': true,
              'verification_status': 'active',
              'prescription_reference': 'RX-ABC',
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = PrescriptionService(apiClient);

      final result = await service.verifyToken('test_token_abc');
      expect(result, isA<ApiSuccess<Map<String, dynamic>>>());
      final data = (result as ApiSuccess<Map<String, dynamic>>).data;
      expect(data['is_valid'], isTrue);
      expect(data['verification_status'], equals('active'));
    });
  });
}

import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('EmergencyProfile Model Tests', () {
    final sampleJson = {
      'id': 'pat-uuid-55',
      'mrn': 'MRN-998877',
      'first_name': 'Karim',
      'last_name': 'Zidane',
      'full_name': 'Karim Zidane',
      'gender': 'male',
      'date_of_birth': '1985-06-15',
      'blood_group': 'O+',
      'phone': '+213555987654',
      'email': 'karim.zidane@example.com',
      'national_id': '198501020304',
      'address': 'Didouche Mourad St, Algiers',
      'wilaya': 'الجزائر',
      'is_active': true,
      'emergency_contacts': [
        {
          'id': 'ec-1',
          'patient_id': 'pat-uuid-55',
          'name': 'Samia Zidane',
          'relationship': 'Spouse',
          'phone': '+213555112233',
          'is_primary': true,
          'created_at': '2026-01-10T12:00:00.000Z',
        },
        {
          'id': 'ec-2',
          'patient_id': 'pat-uuid-55',
          'name': 'Mustapha Zidane',
          'relationship': 'Brother',
          'phone': '+213555445566',
          'is_primary': false,
        },
      ],
      'allergies': [
        {
          'id': 'al-1',
          'patient_id': 'pat-uuid-55',
          'allergen': 'Penicillin',
          'severity': 'severe',
          'reaction': 'Anaphylactic shock',
          'diagnosed_at': '2020-04-12',
          'notes': 'Carry EpiPen',
          'created_at': '2020-04-12T08:00:00.000Z',
        },
        {
          'id': 'al-2',
          'patient_id': 'pat-uuid-55',
          'allergen': 'Peanuts',
          'severity': 'moderate',
          'reaction': 'Hives, swelling',
          'diagnosed_at': '2018-09-20',
        },
      ],
      'chronic_conditions': [
        {
          'id': 'cc-1',
          'patient_id': 'pat-uuid-55',
          'condition_name': 'Hypertension',
          'icd10_code': 'I10',
          'diagnosed_date': '2022-02-10',
          'status': 'active',
          'notes': 'Monitored monthly',
        },
      ],
      'current_medications': [
        {
          'id': 'med-1',
          'patient_id': 'pat-uuid-55',
          'medication_name': 'Amlodipine 5mg',
          'dosage': '5mg',
          'frequency': 'Once daily in morning',
          'prescribed_by': 'Dr. Amrani',
          'start_date': '2022-02-15',
          'status': 'active',
        },
      ],
      'created_at': '2026-01-01T00:00:00.000Z',
    };

    test('EmergencyProfile.fromJson correctly parses full profile structure', () {
      final profile = EmergencyProfile.fromJson(sampleJson);

      expect(profile.id, equals('pat-uuid-55'));
      expect(profile.mrn, equals('MRN-998877'));
      expect(profile.fullName, equals('Karim Zidane'));
      expect(profile.bloodGroup, equals('O+'));
      expect(profile.bloodType, equals('O+'));
      expect(profile.gender, equals('male'));
      expect(profile.dateOfBirth, equals('1985-06-15'));
      expect(profile.phone, equals('+213555987654'));
      expect(profile.wilaya, equals('الجزائر'));

      // Emergency Contacts
      expect(profile.hasEmergencyContacts, isTrue);
      expect(profile.emergencyContacts.length, equals(2));
      final primaryContact = profile.emergencyContacts.first;
      expect(primaryContact.name, equals('Samia Zidane'));
      expect(primaryContact.relationship, equals('Spouse'));
      expect(primaryContact.phone, equals('+213555112233'));
      expect(primaryContact.isPrimary, isTrue);

      // Allergies
      expect(profile.hasAllergies, isTrue);
      expect(profile.allergies.length, equals(2));
      final allergy1 = profile.allergies.first;
      expect(allergy1.allergen, equals('Penicillin'));
      expect(allergy1.severity, equals('severe'));
      expect(allergy1.isSevere, isTrue);
      expect(allergy1.reaction, equals('Anaphylactic shock'));
      expect(allergy1.notes, equals('Carry EpiPen'));

      // Chronic Conditions
      expect(profile.hasChronicConditions, isTrue);
      expect(profile.isChronic, isTrue);
      expect(profile.chronicConditions.length, equals(1));
      final condition = profile.chronicConditions.first;
      expect(condition.conditionName, equals('Hypertension'));
      expect(condition.icd10Code, equals('I10'));
      expect(condition.isActive, isTrue);

      // Medications
      expect(profile.currentMedications.length, equals(1));
      final med = profile.currentMedications.first;
      expect(med.medicationName, equals('Amlodipine 5mg'));
      expect(med.dosage, equals('5mg'));
    });

    test('EmergencyProfile handles empty/sparse profile gracefully', () {
      final minimalJson = {
        'id': 'pat-uuid-minimal',
        'mrn': 'MRN-000',
        'first_name': 'Nadia',
        'last_name': 'Boukhalfa',
        'full_name': 'Nadia Boukhalfa',
      };

      final profile = EmergencyProfile.fromJson(minimalJson);
      expect(profile.id, equals('pat-uuid-minimal'));
      expect(profile.fullName, equals('Nadia Boukhalfa'));
      expect(profile.bloodGroup, isNull);
      expect(profile.bloodType, isNull);
      expect(profile.hasAllergies, isFalse);
      expect(profile.hasChronicConditions, isFalse);
      expect(profile.isChronic, isFalse);
      expect(profile.hasEmergencyContacts, isFalse);
      expect(profile.emergencyContacts, isEmpty);
      expect(profile.allergies, isEmpty);
      expect(profile.chronicConditions, isEmpty);
      expect(profile.currentMedications, isEmpty);
    });

    test('EmergencyProfile.toJson roundtrip preserves integrity', () {
      final profile = EmergencyProfile.fromJson(sampleJson);
      final jsonOutput = profile.toJson();

      expect(jsonOutput['id'], equals('pat-uuid-55'));
      expect(jsonOutput['full_name'], equals('Karim Zidane'));
      expect(jsonOutput['blood_group'], equals('O+'));
      expect(jsonOutput['emergency_contacts'].length, equals(2));
      expect(jsonOutput['allergies'].length, equals(2));
      expect(jsonOutput['chronic_conditions'].length, equals(1));
    });
  });

  group('EmergencyProfileService Tests', () {
    test('getEmergencyProfile calls /patients/me and returns EmergencyProfile', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/patients/me'));
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'id': 'pat-me-1',
              'mrn': 'MRN-ME-1',
              'first_name': 'Leila',
              'last_name': 'Kaci',
              'full_name': 'Leila Kaci',
              'blood_group': 'B+',
              'emergency_contacts': <dynamic>[],
              'allergies': <dynamic>[],
              'chronic_conditions': <dynamic>[],
              'current_medications': <dynamic>[],
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
      );
      final service = EmergencyProfileService(apiClient);

      final result = await service.getEmergencyProfile();
      expect(result, isA<ApiSuccess<EmergencyProfile>>());
      final profile = (result as ApiSuccess<EmergencyProfile>).data;
      expect(profile.id, equals('pat-me-1'));
      expect(profile.fullName, equals('Leila Kaci'));
      expect(profile.bloodGroup, equals('B+'));
    });

    test('getPatientSummary calls /patients/{id} with clinic header and returns EmergencyProfile', () async {
      const patientId = '01a084d2-381a-7039-bde1-460d64d06daa';
      const clinicId = '01a084d2-021f-71eb-b09c-39d9ddce3458';

      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/patients/$patientId'));
        expect(request.headers['X-Clinic-ID'], equals(clinicId));
        return http.Response(
          jsonEncode({
            'data': {
              'id': patientId,
              'mrn': 'MRN-2026-0002',
              'first_name': 'مريض',
              'last_name': 'اختباري 001',
              'full_name': 'مريض اختباري 001',
              'blood_group': 'O+',
              'gender': 'male',
              'date_of_birth': '1990-01-15',
              'phone': '+213550000001',
              'email': 'patient001@aafiya.test',
              'address': 'شارع الاختبار 001',
              'wilaya': 'Alger',
              'is_active': true,
              'emergency_contacts': [
                {
                  'id': 'ec-001',
                  'patient_id': patientId,
                  'name': 'فاطمة اختباري',
                  'relationship': 'spouse',
                  'phone': '0555123456',
                  'is_primary': true,
                }
              ],
              'allergies': [
                {
                  'id': 'al-001',
                  'patient_id': patientId,
                  'allergen': 'بنسلين',
                  'severity': 'life_threatening',
                  'reaction': 'صدمة تحسسية',
                  'diagnosed_at': '2020-01-10',
                  'notes': 'تحذير عالي الخطورة',
                }
              ],
              'chronic_conditions': [
                {
                  'id': 'cc-001',
                  'patient_id': patientId,
                  'condition_name': 'السكري من النوع 2',
                  'icd10_code': 'E11',
                  'status': 'active',
                  'notes': 'متابعة دورية',
                }
              ],
              'current_medications': <dynamic>[],
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId(clinicId);
      final service = EmergencyProfileService(apiClient);

      final result = await service.getPatientSummary(patientId);
      expect(result, isA<ApiSuccess<EmergencyProfile>>());
      final profile = (result as ApiSuccess<EmergencyProfile>).data;
      expect(profile.id, equals(patientId));
      expect(profile.fullName, equals('مريض اختباري 001'));
      expect(profile.bloodGroup, equals('O+'));
      expect(profile.allergies.length, equals(1));
      expect(profile.allergies.first.allergen, equals('بنسلين'));
      expect(profile.allergies.first.isLifeThreatening, isTrue);
      expect(profile.allergies.first.isSevere, isFalse);
      expect(profile.chronicConditions.length, equals(1));
      expect(profile.chronicConditions.first.conditionName, equals('السكري من النوع 2'));
      expect(profile.emergencyContacts.length, equals(1));
      expect(profile.emergencyContacts.first.name, equals('فاطمة اختباري'));
      expect(profile.emergencyContacts.first.isPrimary, isTrue);
    });

    test('getPatientSummary handles 403 Forbidden correctly', () async {
      const patientId = 'unauthorized-patient';

      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'غير مصرح لك بعرض الملف الطبي لهذا المريض.',
          }),
          403,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = EmergencyProfileService(apiClient);

      final result = await service.getPatientSummary(patientId);
      expect(result, isA<ApiFailure<EmergencyProfile>>());
      final failure = result as ApiFailure<EmergencyProfile>;
      expect(failure.exception, isA<ForbiddenException>());
      expect((failure.exception as ForbiddenException).statusCode, equals(403));
      expect(failure.exception.message, contains('غير مصرح لك بعرض الملف الطبي'));
    });
  });
}

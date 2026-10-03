import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('1. Wilaya Model Tests', () {
    test('deserializes complete JSON payload correctly', () {
      final json = {
        'code': '16',
        'name_ar': 'الجزائر',
        'name_fr': 'Alger',
        'name_en': 'Algiers',
        'is_active': true,
        'display_order': 16,
      };

      final wilaya = Wilaya.fromJson(json);

      expect(wilaya.code, equals('16'));
      expect(wilaya.nameAr, equals('الجزائر'));
      expect(wilaya.nameFr, equals('Alger'));
      expect(wilaya.nameEn, equals('Algiers'));
      expect(wilaya.isActive, isTrue);
      expect(wilaya.displayOrder, equals(16));
    });

    test('toJson serializes all fields correctly', () {
      const wilaya = Wilaya(
        code: '31',
        nameAr: 'وهران',
        nameFr: 'Oran',
        nameEn: 'Oran',
        isActive: true,
        displayOrder: 31,
      );

      final json = wilaya.toJson();

      expect(json['code'], equals('31'));
      expect(json['name_ar'], equals('وهران'));
      expect(json['name_fr'], equals('Oran'));
      expect(json['name_en'], equals('Oran'));
      expect(json['is_active'], isTrue);
      expect(json['display_order'], equals(31));
    });

    test('localizedName returns correct language based on locale code', () {
      const wilaya = Wilaya(
        code: '16',
        nameAr: 'الجزائر',
        nameFr: 'Alger',
        nameEn: 'Algiers',
      );

      expect(wilaya.localizedName('ar'), equals('الجزائر'));
      expect(wilaya.localizedName('fr'), equals('Alger'));
      expect(wilaya.localizedName('en'), equals('Algiers'));
      expect(wilaya.localizedName('unknown'), equals('Algiers'));
    });

    test('equality and hashCode are based strictly on code', () {
      const w1 = Wilaya(code: '16', nameAr: 'الجزائر', nameFr: 'Alger', nameEn: 'Algiers');
      const w2 = Wilaya(code: '16', nameAr: 'الجزائر العاصمة', nameFr: 'Alger Centre', nameEn: 'Algiers');
      const w3 = Wilaya(code: '31', nameAr: 'وهران', nameFr: 'Oran', nameEn: 'Oran');

      expect(w1, equals(w2));
      expect(w1.hashCode, equals(w2.hashCode));
      expect(w1, isNot(equals(w3)));
    });
  });

  group('2. Commune Model Tests', () {
    test('deserializes complete JSON payload with valid postal code', () {
      final json = {
        'code': '1601',
        'wilaya_code': '16',
        'name_ar': 'الجزائر الوسطى',
        'name_fr': 'Alger-Centre',
        'name_en': 'Algiers Centre',
        'postal_code': '16000',
        'is_active': true,
        'display_order': 1,
      };

      final commune = Commune.fromJson(json);

      expect(commune.code, equals('1601'));
      expect(commune.wilayaCode, equals('16'));
      expect(commune.nameAr, equals('الجزائر الوسطى'));
      expect(commune.nameFr, equals('Alger-Centre'));
      expect(commune.nameEn, equals('Algiers Centre'));
      expect(commune.postalCode, equals('16000'));
      expect(commune.isActive, isTrue);
      expect(commune.displayOrder, equals(1));
    });

    test('deserializes JSON with nullable postal code preserved', () {
      final json = {
        'code': '5901',
        'wilaya_code': '59',
        'name_ar': 'أفلو',
        'name_fr': 'Aflou',
        'name_en': 'Aflou',
        'postal_code': null,
        'is_active': true,
        'display_order': 1,
      };

      final commune = Commune.fromJson(json);

      expect(commune.code, equals('5901'));
      expect(commune.postalCode, isNull);
    });

    test('localizedName returns correct language based on locale code', () {
      const commune = Commune(
        code: '1601',
        wilayaCode: '16',
        nameAr: 'الجزائر الوسطى',
        nameFr: 'Alger-Centre',
        nameEn: 'Algiers Centre',
      );

      expect(commune.localizedName('ar'), equals('الجزائر الوسطى'));
      expect(commune.localizedName('fr'), equals('Alger-Centre'));
      expect(commune.localizedName('en'), equals('Algiers Centre'));
    });
  });

  group('3. MasterDataService Tests & In-Memory Caching', () {
    test('getWilayas fetches from API and caches result in memory', () async {
      int apiCallCount = 0;
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/master/wilayas') {
          apiCallCount++;
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {'code': '16', 'name_ar': 'الجزائر', 'name_fr': 'Alger', 'name_en': 'Algiers', 'is_active': true, 'display_order': 16},
                {'code': '01', 'name_ar': 'أدرار', 'name_fr': 'Adrar', 'name_en': 'Adrar', 'is_active': true, 'display_order': 1},
                {'code': '31', 'name_ar': 'وهران', 'name_fr': 'Oran', 'name_en': 'Oran', 'is_active': true, 'display_order': 31},
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = MasterDataService(apiClient);

      // First call hits API
      final res1 = await service.getWilayas();
      expect(res1, isA<ApiSuccess<List<Wilaya>>>());
      final list1 = (res1 as ApiSuccess<List<Wilaya>>).data;
      expect(list1.length, equals(3));
      expect(list1.first.code, equals('01')); // Sorted by display_order 1
      expect(apiCallCount, equals(1));

      // Second call uses in-memory cache without hitting API
      final res2 = await service.getWilayas();
      expect(res2, isA<ApiSuccess<List<Wilaya>>>());
      final list2 = (res2 as ApiSuccess<List<Wilaya>>).data;
      expect(list2, equals(list1));
      expect(apiCallCount, equals(1)); // No additional API call

      // Force refresh hits API again
      final res3 = await service.getWilayas(forceRefresh: true);
      expect(res3, isA<ApiSuccess<List<Wilaya>>>());
      expect(apiCallCount, equals(2));
    });

    test('getCommunes fetches and isolates caches by wilaya code', () async {
      int apiCallCount = 0;
      final mockClient = MockClient((request) async {
        apiCallCount++;
        if (request.url.path == '/api/v1/master/wilayas/16/communes') {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {'code': '1601', 'wilaya_code': '16', 'name_ar': 'الجزائر الوسطى', 'name_fr': 'Alger-Centre', 'name_en': 'Algiers Centre', 'is_active': true, 'display_order': 1},
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        } else if (request.url.path == '/api/v1/master/wilayas/31/communes') {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {'code': '3101', 'wilaya_code': '31', 'name_ar': 'وهران', 'name_fr': 'Oran', 'name_en': 'Oran', 'is_active': true, 'display_order': 1},
                {'code': '3102', 'wilaya_code': '31', 'name_ar': 'السانية', 'name_fr': 'Es Sénia', 'name_en': 'Es Senia', 'is_active': true, 'display_order': 2},
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = MasterDataService(apiClient);

      // Fetch communes for Wilaya 16
      final res16 = await service.getCommunes('16');
      expect(res16, isA<ApiSuccess<List<Commune>>>());
      final list16 = (res16 as ApiSuccess<List<Commune>>).data;
      expect(list16.length, equals(1));
      expect(list16.first.wilayaCode, equals('16'));
      expect(apiCallCount, equals(1));

      // Repeated fetch for Wilaya 16 uses cache
      final res16Cached = await service.getCommunes('16');
      expect(res16Cached, isA<ApiSuccess<List<Commune>>>());
      expect(apiCallCount, equals(1));

      // Fetch communes for Wilaya 31 (separate cache)
      final res31 = await service.getCommunes('31');
      expect(res31, isA<ApiSuccess<List<Commune>>>());
      final list31 = (res31 as ApiSuccess<List<Commune>>).data;
      expect(list31.length, equals(2));
      expect(list31.first.wilayaCode, equals('31'));
      expect(apiCallCount, equals(2));

      // Verify cross-Wilaya isolation: 16 data != 31 data
      expect(list16.first.code, isNot(equals(list31.first.code)));
    });

    test('handles API errors gracefully without throwing', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'message': 'Server Error'}), 500);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = MasterDataService(apiClient);

      final wilayaResult = await service.getWilayas();
      expect(wilayaResult, isA<ApiFailure<List<Wilaya>>>());

      final communeResult = await service.getCommunes('16');
      expect(communeResult, isA<ApiFailure<List<Commune>>>());
    });

    test('resolveLegacyWilaya matches codes, localized names, and aliases', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {'code': '16', 'name_ar': 'الجزائر', 'name_fr': 'Alger', 'name_en': 'Algiers', 'is_active': true, 'display_order': 16},
              {'code': '31', 'name_ar': 'وهران', 'name_fr': 'Oran', 'name_en': 'Oran', 'is_active': true, 'display_order': 31},
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = MasterDataService(apiClient);
      await service.getWilayas(); // Populate cache

      // Direct code
      expect(service.resolveLegacyWilaya('16')?.code, equals('16'));
      // Arabic name
      expect(service.resolveLegacyWilaya('الجزائر')?.code, equals('16'));
      // French name
      expect(service.resolveLegacyWilaya('Alger')?.code, equals('16'));
      // English name
      expect(service.resolveLegacyWilaya('Algiers')?.code, equals('16'));
      // Alias
      expect(service.resolveLegacyWilaya('الجزائر العاصمة')?.code, equals('16'));
      expect(service.resolveLegacyWilaya('alger centre')?.code, equals('16'));
      expect(service.resolveLegacyWilaya('Oran')?.code, equals('31'));
      // Unknown
      expect(service.resolveLegacyWilaya('unknown_place'), isNull);
    });
  });

  group('4. MedicalSpecialty Model & ID Invariant Tests', () {
    test('deserializes complete JSON payload correctly', () {
      final json = {
        'id': 2,
        'code': 'CARD',
        'name_ar': 'أمراض القلب والأوعية الدموية',
        'name_fr': 'Cardiologie',
        'name_en': 'Cardiology',
        'is_active': true,
        'display_order': 2,
      };

      final specialty = MedicalSpecialty.fromJson(json);

      expect(specialty.id, equals(2));
      expect(specialty.code, equals('CARD'));
      expect(specialty.nameAr, equals('أمراض القلب والأوعية الدموية'));
      expect(specialty.nameFr, equals('Cardiologie'));
      expect(specialty.nameEn, equals('Cardiology'));
      expect(specialty.isActive, isTrue);
      expect(specialty.displayOrder, equals(2));
    });

    test('REQUIRED ID INVARIANT: ID remains identical across AR, FR, EN', () {
      const specialty = MedicalSpecialty(
        id: 2,
        code: 'CARD',
        nameAr: 'أمراض القلب',
        nameFr: 'Cardiologie',
        nameEn: 'Cardiology',
        isActive: true,
        displayOrder: 2,
      );

      // Verify ID = 2 across all languages
      expect(specialty.id, equals(2));
      expect(specialty.localizedName('ar'), equals('أمراض القلب'));
      expect(specialty.id, equals(2)); // Still 2 in Arabic

      expect(specialty.localizedName('fr'), equals('Cardiologie'));
      expect(specialty.id, equals(2)); // Still 2 in French

      expect(specialty.localizedName('en'), equals('Cardiology'));
      expect(specialty.id, equals(2)); // Still 2 in English
    });

    test('Wilaya ID Invariant: ID remains identical across AR, FR, EN', () {
      const wilaya = Wilaya(
        id: 16,
        code: '16',
        nameAr: 'الجزائر',
        nameFr: 'Alger',
        nameEn: 'Algiers',
        isActive: true,
        displayOrder: 16,
      );

      expect(wilaya.id, equals(16));
      expect(wilaya.localizedName('ar'), equals('الجزائر'));
      expect(wilaya.id, equals(16));

      expect(wilaya.localizedName('fr'), equals('Alger'));
      expect(wilaya.id, equals(16));

      expect(wilaya.localizedName('en'), equals('Algiers'));
      expect(wilaya.id, equals(16));
    });

    test('Doctor model integrates canonical MedicalSpecialty and prioritizes localized name', () {
      const canonicalCard = MedicalSpecialty(
        id: 2,
        code: 'CARD',
        nameAr: 'أمراض القلب',
        nameFr: 'Cardiologie',
        nameEn: 'Cardiology',
      );

      const doc = Doctor(
        id: 'doc-001',
        name: 'Dr. Test',
        specialty: 'Cardiology Legacy Free Text',
        specialtyId: 2,
        medicalSpecialty: canonicalCard,
      );

      expect(doc.specialtyId, equals(2));
      expect(doc.localizedSpecialty('ar'), equals('أمراض القلب'));
      expect(doc.localizedSpecialty('fr'), equals('Cardiologie'));
      expect(doc.localizedSpecialty('en'), equals('Cardiology'));

      // Fallback behavior when medicalSpecialty is null
      const docLegacy = Doctor(
        id: 'doc-002',
        name: 'Dr. Legacy',
        specialty: 'General Legacy Text',
      );
      expect(docLegacy.specialtyId, isNull);
      expect(docLegacy.localizedSpecialty('ar'), equals('General Legacy Text'));
      expect(docLegacy.localizedSpecialty('en'), equals('General Legacy Text'));
    });
  });

  group('5. MasterDataService getSpecialties & Safety Invariants', () {
    test('getSpecialties loads canonical catalog and EXCLUDES RAD and PATH', () async {
      int apiCallCount = 0;
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/master/specialties')) {
          apiCallCount++;
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {'id': 1, 'code': 'GP', 'name_ar': 'طب عام', 'name_fr': 'Médecine générale', 'name_en': 'General Practice', 'is_active': true, 'display_order': 1},
                {'id': 2, 'code': 'CARD', 'name_ar': 'أمراض القلب', 'name_fr': 'Cardiologie', 'name_en': 'Cardiology', 'is_active': true, 'display_order': 2},
                {'id': 3, 'code': 'PED', 'name_ar': 'طب الأطفال', 'name_fr': 'Pédiatrie', 'name_en': 'Pediatrics', 'is_active': true, 'display_order': 3},
                // RAD and PATH in payload (must be defensively rejected by Mobile service)
                {'id': 37, 'code': 'RAD', 'name_ar': 'الأشعة والتصوير الطبي', 'name_fr': 'Radiologie', 'name_en': 'Radiology', 'is_active': false, 'display_order': 37},
                {'id': 38, 'code': 'PATH', 'name_ar': 'علم الأمراض والتشريح المرضي', 'name_fr': 'Pathologie', 'name_en': 'Pathology', 'is_active': false, 'display_order': 38},
              ],
              'meta': {'total': 3},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = MasterDataService(apiClient);

      final result = await service.getSpecialties();
      expect(result, isA<ApiSuccess<List<MedicalSpecialty>>>());
      final specialties = (result as ApiSuccess<List<MedicalSpecialty>>).data;

      // RAD and PATH Safety Proof:
      expect(specialties.length, equals(3));
      final codes = specialties.map((s) => s.code).toList();
      expect(codes, contains('GP'));
      expect(codes, contains('CARD'));
      expect(codes, contains('PED'));
      expect(codes, isNot(contains('RAD')), reason: 'RAD must never appear in physician appointment specialties');
      expect(codes, isNot(contains('PATH')), reason: 'PATH must never appear in physician appointment specialties');

      // Subsequent call uses in-memory cache
      final cachedResult = await service.getSpecialties();
      expect(cachedResult, isA<ApiSuccess<List<MedicalSpecialty>>>());
      expect(apiCallCount, equals(1));

      // forceRefresh triggers new fetch
      await service.getSpecialties(forceRefresh: true);
      expect(apiCallCount, equals(2));
    });

    test('getSpecialties handles API failure gracefully without throwing or silently substituting fake catalog', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'message': 'Internal Server Error'}), 500);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = MasterDataService(apiClient);

      final result = await service.getSpecialties();
      expect(result, isA<ApiFailure<List<MedicalSpecialty>>>());
    });

    test('resolveLegacySpecialty resolves code, id, and localized names, rejecting RAD/PATH', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {'id': 2, 'code': 'CARD', 'name_ar': 'أمراض القلب', 'name_fr': 'Cardiologie', 'name_en': 'Cardiology', 'is_active': true, 'display_order': 2},
              {'id': 3, 'code': 'PED', 'name_ar': 'طب الأطفال', 'name_fr': 'Pédiatrie', 'name_en': 'Pediatrics', 'is_active': true, 'display_order': 3},
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = MasterDataService(apiClient);
      await service.getSpecialties();

      // By code
      expect(service.resolveLegacySpecialty('CARD')?.id, equals(2));
      expect(service.resolveLegacySpecialty('card')?.id, equals(2));
      // By numeric id
      expect(service.resolveLegacySpecialty('2')?.code, equals('CARD'));
      expect(service.resolveLegacySpecialty('3')?.code, equals('PED'));
      // By localized names
      expect(service.resolveLegacySpecialty('أمراض القلب')?.id, equals(2));
      expect(service.resolveLegacySpecialty('Cardiologie')?.id, equals(2));
      expect(service.resolveLegacySpecialty('Pediatrics')?.id, equals(3));
      // Unknown / RAD / PATH
      expect(service.resolveLegacySpecialty('RAD'), isNull);
      expect(service.resolveLegacySpecialty('Radiologie'), isNull);
      expect(service.resolveLegacySpecialty('unknown_spec'), isNull);
    });
  });
}

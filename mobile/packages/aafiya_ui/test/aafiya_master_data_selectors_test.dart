// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

Widget createTestableWidget({required Widget child, Locale locale = const Locale('ar')}) {
  return MaterialApp(
    locale: locale,
    supportedLocales: const [Locale('ar'), Locale('fr'), Locale('en')],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(body: Padding(padding: const EdgeInsets.all(16), child: child)),
  );
}

void main() {
  group('1. AafiyaWilayaSelector Widget Tests', () {
    testWidgets('renders loading state initially, then displays loaded wilaya', (tester) async {
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
      final masterDataService = MasterDataService(apiClient);

      Wilaya? selected;

      await tester.pumpWidget(
        createTestableWidget(
          child: AafiyaWilayaSelector(
            masterDataService: masterDataService,
            selectedCode: '16',
            onChanged: (w) => selected = w,
          ),
        ),
      );

      // Loading state
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();

      // Loaded state with selected Wilaya
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text('16 - الجزائر'), findsOneWidget);

      // Tap selector to open sheet
      await tester.tap(find.text('16 - الجزائر'));
      await tester.pumpAndSettle();

      // Modal bottom sheet should be open
      expect(find.text('اختر الولاية'), findsWidgets);
      expect(find.text('31 - وهران'), findsOneWidget);

      // Tap '31 - وهران'
      await tester.tap(find.text('31 - وهران'));
      await tester.pumpAndSettle();

      expect(selected?.code, equals('31'));
    });

    testWidgets('renders error state and retry succeeds', (tester) async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        if (attempts == 1) {
          return http.Response('Server Error', 500);
        }
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {'code': '16', 'name_ar': 'الجزائر', 'name_fr': 'Alger', 'name_en': 'Algiers', 'is_active': true, 'display_order': 16},
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final masterDataService = MasterDataService(apiClient);

      await tester.pumpWidget(
        createTestableWidget(
          child: AafiyaWilayaSelector(
            masterDataService: masterDataService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Error state icon and retry
      expect(find.byIcon(Icons.refresh_rounded), findsOneWidget);

      // Tap retry
      await tester.tap(find.byIcon(Icons.refresh_rounded));
      await tester.pumpAndSettle();

      expect(attempts, equals(2));
      expect(find.byIcon(Icons.refresh_rounded), findsNothing);
      expect(find.text('اختر الولاية'), findsOneWidget);
    });
  });

  group('2. AafiyaCommuneSelector Widget Tests', () {
    testWidgets('disabled when wilayaCode is null/empty and displays prompt', (tester) async {
      final mockClient = MockClient((request) async => http.Response('Not Found', 404));
      final apiClient = ApiClient(httpClient: mockClient);
      final masterDataService = MasterDataService(apiClient);

      await tester.pumpWidget(
        createTestableWidget(
          child: AafiyaCommuneSelector(
            masterDataService: masterDataService,
            wilayaCode: null,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('اختر الولاية أولاً'), findsOneWidget);

      // Tapping does nothing
      await tester.tap(find.text('اختر الولاية أولاً'));
      await tester.pumpAndSettle();

      expect(find.text('اختر البلدية'), findsNothing);
    });

    testWidgets('loads communes for wilaya and cascades/resets on wilaya change', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/16/communes')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {'code': '1601', 'wilaya_code': '16', 'name_ar': 'الجزائر الوسطى', 'name_fr': 'Alger-Centre', 'name_en': 'Algiers Centre', 'postal_code': '16000', 'is_active': true, 'display_order': 1},
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        } else if (request.url.path.contains('/31/communes')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {'code': '3101', 'wilaya_code': '31', 'name_ar': 'وهران', 'name_fr': 'Oran', 'name_en': 'Oran', 'postal_code': '31000', 'is_active': true, 'display_order': 1},
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final masterDataService = MasterDataService(apiClient);

      Commune? selectedCommune;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (ctx, setState) {
            return createTestableWidget(
              child: AafiyaCommuneSelector(
                masterDataService: masterDataService,
                wilayaCode: '16',
                selectedCode: '1601',
                onChanged: (c) => selectedCommune = c,
              ),
            );
          },
        ),
      );

      await tester.pumpAndSettle();

      // Displays selected commune of Wilaya 16
      expect(find.text('الجزائر الوسطى (16000)'), findsOneWidget);

      // Now re-pump widget with wilayaCode = '31'
      await tester.pumpWidget(
        createTestableWidget(
          child: AafiyaCommuneSelector(
            masterDataService: masterDataService,
            wilayaCode: '31',
            selectedCode: null,
            onChanged: (c) => selectedCommune = c,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Selection has reset and now displays prompt
      expect(find.text('اختر البلدية'), findsOneWidget);

      // Tap to open sheet for Wilaya 31
      await tester.tap(find.text('اختر البلدية'));
      await tester.pumpAndSettle();

      // Only Oran commune should be shown
      expect(find.text('وهران (31000)'), findsOneWidget);
      expect(find.text('الجزائر الوسطى (16000)'), findsNothing);

      await tester.tap(find.text('وهران (31000)'));
      await tester.pumpAndSettle();

      expect(selectedCommune?.code, equals('3101'));
    });
  });

  group('3. AafiyaWilayaFilterChips Widget Tests', () {
    testWidgets('renders all wilayas chips and invokes callback on tap', (tester) async {
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
      final masterDataService = MasterDataService(apiClient);

      String? selectedWilaya;

      await tester.pumpWidget(
        createTestableWidget(
          child: AafiyaWilayaFilterChips(
            masterDataService: masterDataService,
            selectedWilaya: selectedWilaya,
            onWilayaSelected: (code) => selectedWilaya = code,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('جميع الولايات'), findsOneWidget);
      expect(find.text('الجزائر'), findsOneWidget);
      expect(find.text('وهران'), findsOneWidget);

      // Tap 'الجزائر'
      await tester.tap(find.text('الجزائر'));
      await tester.pumpAndSettle();

      expect(selectedWilaya, equals('16'));
    });
  });

  group('4. AafiyaSpecialtyFilterChips Widget Tests', () {
    testWidgets('renders all specialties chips, excludes RAD and PATH, and invokes callback with canonical ID', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {'id': 1, 'code': 'GP', 'name_ar': 'طب عام', 'name_fr': 'Médecine générale', 'name_en': 'General Practice', 'is_active': true, 'display_order': 1},
              {'id': 2, 'code': 'CARD', 'name_ar': 'أمراض القلب', 'name_fr': 'Cardiologie', 'name_en': 'Cardiology', 'is_active': true, 'display_order': 2},
              {'id': 3, 'code': 'PED', 'name_ar': 'طب الأطفال', 'name_fr': 'Pédiatrie', 'name_en': 'Pediatrics', 'is_active': true, 'display_order': 3},
              // RAD and PATH must not appear
              {'id': 37, 'code': 'RAD', 'name_ar': 'الأشعة والتصوير الطبي', 'name_fr': 'Radiologie', 'name_en': 'Radiology', 'is_active': false, 'display_order': 37},
              {'id': 38, 'code': 'PATH', 'name_ar': 'علم الأمراض', 'name_fr': 'Pathologie', 'name_en': 'Pathology', 'is_active': false, 'display_order': 38},
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final masterDataService = MasterDataService(apiClient);

      int? selectedId;

      await tester.pumpWidget(
        createTestableWidget(
          locale: const Locale('ar'),
          child: AafiyaSpecialtyFilterChips(
            masterDataService: masterDataService,
            selectedSpecialtyId: selectedId,
            onSpecialtySelected: (id) => selectedId = id,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('جميع التخصصات'), findsOneWidget);
      expect(find.text('طب عام'), findsOneWidget);
      expect(find.text('أمراض القلب'), findsOneWidget);
      expect(find.text('طب الأطفال'), findsOneWidget);

      // RAD and PATH safety verification:
      expect(find.text('الأشعة والتصوير الطبي'), findsNothing);
      expect(find.text('علم الأمراض'), findsNothing);
      expect(find.text('RAD'), findsNothing);
      expect(find.text('PATH'), findsNothing);

      // Tap 'أمراض القلب'
      await tester.tap(find.text('أمراض القلب'));
      await tester.pumpAndSettle();

      expect(selectedId, equals(2));
    });

    testWidgets('REQUIRED ID INVARIANT: localized name adapts across AR, FR, EN while selecting same canonical ID 2', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {'id': 2, 'code': 'CARD', 'name_ar': 'أمراض القلب', 'name_fr': 'Cardiologie', 'name_en': 'Cardiology', 'is_active': true, 'display_order': 2},
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final masterDataService = MasterDataService(apiClient);

      int? selectedId;

      // 1. English
      await tester.pumpWidget(
        createTestableWidget(
          locale: const Locale('en'),
          child: AafiyaSpecialtyFilterChips(
            masterDataService: masterDataService,
            selectedSpecialtyId: selectedId,
            onSpecialtySelected: (id) => selectedId = id,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Cardiology'), findsOneWidget);
      await tester.tap(find.text('Cardiology'));
      expect(selectedId, equals(2));

      // 2. French
      selectedId = null;
      await tester.pumpWidget(
        createTestableWidget(
          locale: const Locale('fr'),
          child: AafiyaSpecialtyFilterChips(
            masterDataService: masterDataService,
            selectedSpecialtyId: selectedId,
            onSpecialtySelected: (id) => selectedId = id,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Cardiologie'), findsOneWidget);
      await tester.tap(find.text('Cardiologie'));
      expect(selectedId, equals(2));
    });
  });

  group('5. AafiyaSpecialtySelector Widget Tests', () {
    testWidgets('opens sheet, excludes RAD/PATH, and selects canonical specialty', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {'id': 2, 'code': 'CARD', 'name_ar': 'أمراض القلب', 'name_fr': 'Cardiologie', 'name_en': 'Cardiology', 'is_active': true, 'display_order': 2},
              {'id': 3, 'code': 'PED', 'name_ar': 'طب الأطفال', 'name_fr': 'Pédiatrie', 'name_en': 'Pediatrics', 'is_active': true, 'display_order': 3},
              {'id': 37, 'code': 'RAD', 'name_ar': 'الأشعة والتصوير الطبي', 'name_fr': 'Radiologie', 'name_en': 'Radiology', 'is_active': false, 'display_order': 37},
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final masterDataService = MasterDataService(apiClient);

      MedicalSpecialty? selectedSpecialty;

      await tester.pumpWidget(
        createTestableWidget(
          child: AafiyaSpecialtySelector(
            masterDataService: masterDataService,
            onChanged: (s) => selectedSpecialty = s,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap selector container to open modal bottom sheet
      await tester.tap(find.byType(AafiyaSpecialtySelector));
      await tester.pumpAndSettle();

      // Check modal content
      expect(find.text('أمراض القلب'), findsOneWidget);
      expect(find.text('طب الأطفال'), findsOneWidget);
      expect(find.text('الأشعة والتصوير الطبي'), findsNothing);

      // Tap 'أمراض القلب'
      await tester.tap(find.text('أمراض القلب'));
      await tester.pumpAndSettle();

      expect(selectedSpecialty, isNotNull);
      expect(selectedSpecialty!.id, equals(2));
      expect(selectedSpecialty!.code, equals('CARD'));
    });
  });
}

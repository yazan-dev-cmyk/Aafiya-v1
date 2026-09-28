// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/patient_summary_sheet.dart';

void main() {
  const samplePatientId = 'pat-uuid-001';
  const sampleClinicId = 'clinic-uuid-001';

  final samplePatientResponse = {
    'data': {
      'id': samplePatientId,
      'mrn': 'MRN-2026-0002',
      'first_name': 'مريض',
      'last_name': 'اختباري 001',
      'full_name': 'مريض اختباري 001',
      'gender': 'male',
      'date_of_birth': '1990-01-15',
      'blood_group': 'O+',
      'phone': '+213550000001', // Must NOT be rendered (data minimization)
      'email': 'patient001@aafiya.test', // Must NOT be rendered
      'national_id': '199001020304', // Must NOT be rendered
      'address': 'شارع الاختبار 001', // Must NOT be rendered
      'wilaya': 'Alger',
      'is_active': true,
      'emergency_contacts': [
        {
          'id': 'ec-001',
          'patient_id': samplePatientId,
          'name': 'فاطمة اختباري',
          'relationship': 'spouse',
          'phone': '0555123456',
          'is_primary': true,
        },
      ],
      'allergies': [
        {
          'id': 'al-001',
          'patient_id': samplePatientId,
          'allergen': 'بنسلين',
          'severity': 'life_threatening',
          'reaction': 'صدمة تحسسية حادة',
          'diagnosed_at': '2020-01-10',
          'notes': 'تحذير عالي الخطورة',
        },
        {
          'id': 'al-002',
          'patient_id': samplePatientId,
          'allergen': 'أسبرين',
          'severity': 'moderate',
          'reaction': 'طفح جلدي',
        },
      ],
      'chronic_conditions': [
        {
          'id': 'cc-001',
          'patient_id': samplePatientId,
          'condition_name': 'السكري من النوع 2',
          'icd10_code': 'E11',
          'status': 'active',
          'notes': 'متابعة دورية كل 3 أشهر',
        },
      ],
      'current_medications': <dynamic>[],
    }
  };

  Widget createTestWidget({
    required ApiClient apiClient,
    Locale locale = const Locale('ar'),
    String patientId = samplePatientId,
    String patientName = 'مريض اختباري 001',
    String? mrn = 'MRN-2026-0002',
  }) {
    return MaterialApp(
      locale: locale,
      supportedLocales: AafiyaSupportedLocale.supportedLocales,
      localizationsDelegates: const [
        AafiyaLocalizationsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AafiyaTheme.lightTheme,
      home: Scaffold(
        body: PatientSummarySheet(
          apiClient: apiClient,
          patientId: patientId,
          patientName: patientName,
          mrn: mrn,
        ),
      ),
    );
  }

  group('PatientSummarySheet Widget Tests', () {
    testWidgets('1. Loading: displays loading indicator while fetching', (tester) async {
      final mockClient = MockClient((request) async {
        await Future<void>.delayed(const Duration(milliseconds: 100));
        return http.Response(jsonEncode(samplePatientResponse), 200);
      });
      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId(sampleClinicId);

      await tester.pumpWidget(createTestWidget(apiClient: apiClient));
      expect(find.byType(AafiyaLoadingView), findsOneWidget);

      await tester.pumpAndSettle();
      expect(find.byType(AafiyaLoadingView), findsNothing);
    });

    testWidgets('2. Content: renders patient identity, allergies, conditions, and emergency contact', (tester) async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/patients/$samplePatientId'));
        expect(request.headers['X-Clinic-ID'], equals(sampleClinicId));
        return http.Response(
          jsonEncode(samplePatientResponse),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId(sampleClinicId);

      await tester.pumpWidget(createTestWidget(apiClient: apiClient));
      await tester.pumpAndSettle();

      // Header & Identity
      expect(find.text('الملخص الطبي للمريض'), findsOneWidget);
      expect(find.text('مريض اختباري 001'), findsWidgets);
      expect(find.text('MRN: MRN-2026-0002'), findsOneWidget);
      expect(find.text('O+'), findsOneWidget);
      expect(find.text('1990-01-15'), findsOneWidget);

      // Allergies
      expect(find.text('بنسلين'), findsOneWidget);
      expect(find.text('مهددة للحياة'), findsOneWidget);
      expect(find.textContaining('صدمة تحسسية حادة'), findsOneWidget);
      expect(find.text('أسبرين'), findsOneWidget);
      expect(find.text('متوسطة'), findsOneWidget);

      // Chronic Conditions
      expect(find.text('السكري من النوع 2'), findsOneWidget);
      expect(find.text('ICD-10: E11'), findsOneWidget);
      expect(find.text('نشط'), findsOneWidget);

      // Emergency Contacts
      expect(find.text('فاطمة اختباري'), findsOneWidget);
      expect(find.text('0555123456'), findsOneWidget);
      expect(find.text('رئيسي'), findsOneWidget);
    });

    testWidgets('3. Data Minimization: strictly whitelist only - no patient phone/email/address', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(samplePatientResponse),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId(sampleClinicId);

      await tester.pumpWidget(createTestWidget(apiClient: apiClient));
      await tester.pumpAndSettle();

      // Verified Whitelist Data Minimization:
      // Patient private phone, email, address, and national ID MUST NOT be rendered
      expect(find.text('+213550000001'), findsNothing);
      expect(find.text('patient001@aafiya.test'), findsNothing);
      expect(find.text('199001020304'), findsNothing);
      expect(find.text('شارع الاختبار 001'), findsNothing);
    });

    testWidgets('4. Empty States: displays localized empty indications when collections are empty', (tester) async {
      final emptyPatientResponse = {
        'data': {
          'id': samplePatientId,
          'mrn': 'MRN-2026-0002',
          'first_name': 'علي',
          'last_name': 'عمراني',
          'full_name': 'علي عمراني',
          'blood_group': null,
          'emergency_contacts': <dynamic>[],
          'allergies': <dynamic>[],
          'chronic_conditions': <dynamic>[],
          'current_medications': <dynamic>[],
        }
      };

      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(emptyPatientResponse),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId(sampleClinicId);

      await tester.pumpWidget(createTestWidget(apiClient: apiClient));
      await tester.pumpAndSettle();

      expect(find.text('لا توجد أي حساسيات مسجلة لهذا المريض.'), findsOneWidget);
      expect(find.text('لا توجد أي أمراض مزمنة مسجلة لهذا المريض.'), findsOneWidget);
      expect(find.text('لا توجد جهات اتصال للطوارئ مسجلة.'), findsOneWidget);
    });

    testWidgets('5. 403 Forbidden: displays access denied view, NOT empty record', (tester) async {
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
      apiClient.setActiveClinicId(sampleClinicId);

      await tester.pumpWidget(createTestWidget(apiClient: apiClient));
      await tester.pumpAndSettle();

      expect(find.text('غير مصرح لك بعرض الملف الطبي لهذا المريض.'), findsWidgets);
      expect(find.byIcon(Icons.gpp_bad_outlined), findsOneWidget);
      expect(find.byType(AafiyaButton), findsOneWidget); // Retry button
    });

    testWidgets('6. DISC-02: Strictly Read-Only Guarantee - zero input fields or edit buttons', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(samplePatientResponse),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId(sampleClinicId);

      await tester.pumpWidget(createTestWidget(apiClient: apiClient));
      await tester.pumpAndSettle();

      // Zero editable text form fields or inputs
      expect(find.byType(TextField), findsNothing);
      expect(find.byType(TextFormField), findsNothing);

      // Read-only notice banner must be visible
      expect(find.textContaining('للقراءة فقط'), findsOneWidget);
    });

    testWidgets('7. Trilingual Localization: renders correctly in English and French', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(samplePatientResponse),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId(sampleClinicId);

      // Test English
      await tester.pumpWidget(createTestWidget(apiClient: apiClient, locale: const Locale('en')));
      await tester.pumpAndSettle();
      expect(find.text('Patient Medical Summary'), findsOneWidget);
      expect(find.text('Life-Threatening'), findsOneWidget);
      expect(find.text('Moderate'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);

      // Test French
      await tester.pumpWidget(createTestWidget(apiClient: apiClient, locale: const Locale('fr')));
      await tester.pumpAndSettle();
      expect(find.text('Résumé médical du patient'), findsOneWidget);
      expect(find.text('Menace vitale'), findsOneWidget);
      expect(find.text('Modérée'), findsOneWidget);
      expect(find.text('Actif'), findsOneWidget);
    });

    testWidgets('8. Stale Response Protection: late response from previous clinic is discarded', (tester) async {
      late http.Response lateResponse;
      final mockClient = MockClient((request) async {
        // Simulate late response
        await Future<void>.delayed(const Duration(milliseconds: 50));
        return lateResponse;
      });

      lateResponse = http.Response(
        jsonEncode(samplePatientResponse),
        200,
        headers: {'content-type': 'application/json'},
      );

      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId('clinic-01');

      await tester.pumpWidget(createTestWidget(apiClient: apiClient));
      expect(find.byType(AafiyaLoadingView), findsOneWidget);

      // Simulate clinic context switch while fetch is in-flight
      apiClient.setActiveClinicId('clinic-02');

      await tester.pumpAndSettle();

      // Profile should NOT be committed because active clinic changed
      expect(find.text('MRN: MRN-2026-0002'), findsNothing);
    });
  });
}

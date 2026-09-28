// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/screens/emergency_profile_screen.dart';
import 'package:aafiya_patient/screens/prescriptions_screen.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';

void main() {
  group('TASK-03-04: Emergency Medical Profile Tests', () {
    final samplePatientMeResponse = {
      'status': 'success',
      'data': {
        'id': 'pat-uuid-99',
        'mrn': 'MRN-ALG-2026',
        'first_name': 'يوسف',
        'last_name': 'براهيمي',
        'full_name': 'يوسف براهيمي',
        'gender': 'male',
        'date_of_birth': '1992-04-10',
        'blood_group': 'AB+',
        'phone': '0555998877',
        'email': 'youssef@example.dz',
        'national_id': '199201020304',
        'wilaya': 'الجزائر',
        'is_active': true,
        'emergency_contacts': [
          {
            'id': 'ec-1',
            'name': 'أمينة براهيمي',
            'relationship': 'زوجة',
            'phone': '0555112233',
            'is_primary': true,
          },
          {
            'id': 'ec-2',
            'name': 'علي براهيمي',
            'relationship': 'أخ',
            'phone': '0555445566',
            'is_primary': false,
          },
        ],
        'allergies': [
          {
            'id': 'al-1',
            'allergen': 'بنسلين (Penicillin)',
            'severity': 'severe',
            'reaction': 'صدمة تحسسية حادة',
            'diagnosed_at': '2019-05-12',
            'notes': 'يمنع إعطاء أي مشتقات بنسلين.',
          },
          {
            'id': 'al-2',
            'allergen': 'فول سوداني (Peanuts)',
            'severity': 'moderate',
            'reaction': 'طفح جلدي وضيق تنفس خفيف',
          },
        ],
        'chronic_conditions': [
          {
            'id': 'cc-1',
            'condition_name': 'ارتفاع ضغط الدم (Hypertension)',
            'icd10_code': 'I10',
            'status': 'active',
            'notes': 'متابعة دورية كل 3 أشهر.',
          },
        ],
        'current_medications': [],
      }
    };

    Widget createTestableWidget({
      required Widget child,
      Locale locale = const Locale('ar'),
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
        home: child,
      );
    }

    // =========================================================================
    // 1. EmergencyProfileScreen Rendering Tests
    // =========================================================================
    group('1. EmergencyProfileScreen View', () {
      testWidgets('renders blood group, chronic conditions, allergies, and emergency contacts', (tester) async {
        final mockClient = MockClient((request) async {
          expect(request.url.path, endsWith('/patients/me'));
          return http.Response(
            jsonEncode(samplePatientMeResponse),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient);

        await tester.pumpWidget(
          createTestableWidget(
            child: EmergencyProfileScreen(apiClient: apiClient),
          ),
        );

        // Initial loading view
        expect(find.byType(AafiyaLoadingView), findsOneWidget);

        await tester.pumpAndSettle();

        // Read-only policy notice
        expect(
          find.text('هذا الملف مخصص للعرض في حالات الطوارئ. تعديل البيانات يتم حصراً عبر الطبيب أو العيادة المعتمدة.'),
          findsOneWidget,
        );

        // Hero Blood Group & Patient Name
        expect(find.text('AB+'), findsOneWidget);
        expect(find.text('يوسف براهيمي'), findsOneWidget);
        expect(find.textContaining('MRN-ALG-2026'), findsOneWidget);

        // Chronic Condition Section
        expect(find.text('الأمراض والحالات المزمنة'), findsOneWidget);
        expect(find.text('مريض مصاب بأمراض مزمنة'), findsOneWidget);
        expect(find.text('ارتفاع ضغط الدم (Hypertension)'), findsOneWidget);
        expect(find.textContaining('I10'), findsOneWidget);

        // Allergies Section
        expect(find.textContaining('الحساسية الطبية'), findsOneWidget);
        expect(find.text('بنسلين (Penicillin)'), findsOneWidget);
        expect(find.text('شديدة الخطورة'), findsOneWidget);
        expect(find.textContaining('صدمة تحسسية حادة'), findsOneWidget);
        expect(find.text('فول سوداني (Peanuts)'), findsOneWidget);
        expect(find.text('متوسطة'), findsOneWidget);

        // Emergency Contacts Section
        expect(find.textContaining('جهات الاتصال في حالات الطوارئ'), findsOneWidget);
        expect(find.text('أمينة براهيمي'), findsOneWidget);
        expect(find.text('جهة اتصال رئيسية'), findsOneWidget);
        expect(find.textContaining('0555112233'), findsOneWidget);
        expect(find.text('علي براهيمي'), findsOneWidget);
        expect(find.textContaining('0555445566'), findsOneWidget);

        // Read-only verification: ZERO edit / save / update buttons
        expect(find.text('تعديل'), findsNothing);
        expect(find.text('حفظ'), findsNothing);
        expect(find.text('إضافة'), findsNothing);
        expect(find.text('حذف'), findsNothing);
      });

      testWidgets('renders empty/clean state when no allergies or conditions exist', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {
                'id': 'pat-clean',
                'mrn': 'MRN-CLEAN',
                'first_name': 'خالد',
                'last_name': 'سعيد',
                'full_name': 'خالد سعيد',
                'blood_group': null,
                'emergency_contacts': [],
                'allergies': [],
                'chronic_conditions': [],
                'current_medications': [],
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient);

        await tester.pumpWidget(
          createTestableWidget(
            child: EmergencyProfileScreen(apiClient: apiClient),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('لا توجد أمراض مزمنة مسجلة'), findsOneWidget);
        expect(find.text('لا توجد حالات حساسية مسجلة.'), findsOneWidget);
        expect(find.text('لا توجد جهات اتصال طوارئ مسجلة.'), findsOneWidget);
      });

      testWidgets('renders in English (LTR) and French (LTR)', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode(samplePatientMeResponse),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient);

        // English
        await tester.pumpWidget(
          createTestableWidget(
            locale: const Locale('en'),
            child: EmergencyProfileScreen(apiClient: apiClient),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Emergency Medical Profile'), findsOneWidget);
        expect(find.text('Chronic Conditions'), findsOneWidget);
        expect(find.textContaining('Emergency Contacts'), findsOneWidget);

        // French
        await tester.pumpWidget(
          createTestableWidget(
            locale: const Locale('fr'),
            child: EmergencyProfileScreen(apiClient: apiClient),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text("Profil médical d'urgence"), findsOneWidget);
        expect(find.text('Affections chroniques'), findsOneWidget);
        expect(find.textContaining("Contacts d'urgence"), findsOneWidget);
      });
    });

    // =========================================================================
    // 2. Home Navigation & <= 2 Taps Requirement Tests
    // =========================================================================
    group('2. Home Shell Navigation & Emergency Access (<= 2 taps)', () {
      testWidgets('Access to Emergency Profile from Home is exactly 1 tap', (tester) async {
        final mockClient = MockClient((request) async {
          if (request.url.path.endsWith('/appointments')) {
            return http.Response(
              jsonEncode({'data': []}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (request.url.path.endsWith('/patients/me')) {
            return http.Response(
              jsonEncode(samplePatientMeResponse),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response('{}', 200);
        });

        final apiClient = ApiClient(httpClient: mockClient);
        final sessionManager = AuthSessionManager(
          apiClient: apiClient,
          tokenStorage: InMemoryTokenStorage('valid_token'),
        );

        await tester.pumpWidget(
          createTestableWidget(
            child: PatientHomeShell(
              sessionManager: sessionManager,
              apiClient: apiClient,
              onSignOut: () {},
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Verify Home Shell is loaded
        expect(find.byType(PatientHomeShell), findsOneWidget);

        // Verify quick emergency card is present on Home overview
        final emergencyCardFinder = find.text('الملف الطبي للطوارئ');
        expect(emergencyCardFinder, findsWidgets);

        // Tap 1: Tap the emergency profile quick action card on Home overview
        await tester.ensureVisible(emergencyCardFinder.first);
        await tester.tap(emergencyCardFinder.first);
        await tester.pumpAndSettle();

        // Verified: EmergencyProfileScreen opened in exactly 1 tap!
        expect(find.byType(EmergencyProfileScreen), findsOneWidget);
        expect(find.text('AB+'), findsOneWidget);

        // Back to home
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();

        expect(find.byType(PatientHomeShell), findsOneWidget);

        // Also test AppBar emergency button (1 tap everywhere!)
        final appBarEmergencyFinder = find.byIcon(Icons.health_and_safety_rounded);
        expect(appBarEmergencyFinder, findsWidgets);
        await tester.tap(appBarEmergencyFinder.first);
        await tester.pumpAndSettle();

        expect(find.byType(EmergencyProfileScreen), findsOneWidget);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
      });

      testWidgets('Access to Prescriptions from Home is exactly 1 tap', (tester) async {
        final mockClient = MockClient((request) async {
          if (request.url.path.endsWith('/appointments')) {
            return http.Response(jsonEncode({'data': []}), 200);
          }
          if (request.url.path.endsWith('/prescriptions')) {
            return http.Response(
              jsonEncode({
                'data': [],
                'meta': {'current_page': 1, 'last_page': 1, 'total': 0},
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response('{}', 200);
        });

        final apiClient = ApiClient(httpClient: mockClient);
        final sessionManager = AuthSessionManager(
          apiClient: apiClient,
          tokenStorage: InMemoryTokenStorage('valid_token'),
        );

        await tester.pumpWidget(
          createTestableWidget(
            child: PatientHomeShell(
              sessionManager: sessionManager,
              apiClient: apiClient,
              onSignOut: () {},
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Tap Prescriptions card on Home overview
        final rxCardFinder = find.text('الوصفات الطبية');
        expect(rxCardFinder, findsWidgets);

        await tester.ensureVisible(rxCardFinder.first);
        await tester.tap(rxCardFinder.first);
        await tester.pumpAndSettle();

        // Verified: PrescriptionsScreen opened in exactly 1 tap!
        expect(find.byType(PrescriptionsScreen), findsOneWidget);

        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();

        expect(find.byType(PatientHomeShell), findsOneWidget);
      });
    });
  });
}

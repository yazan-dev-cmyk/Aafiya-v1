import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const sampleToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  final validRecordJson = {
    'data': {
      'scope': 'all_emr',
      'patient': {
        'id': 'pat-uuid-999',
        'mrn': 'MRN-998877',
        'first_name': 'Amina',
        'last_name': 'Zouari',
        'full_name': 'Amina Zouari',
        'gender': 'female',
        'date_of_birth': '1992-04-12',
        'blood_group': 'A+',
        'allergies': [
          {
            'id': 'alg-1',
            'patient_id': 'pat-uuid-999',
            'allergen': 'Aspirin',
            'severity': 'moderate',
            'reaction': 'Rash',
            'diagnosed_at': '2021-03-15',
            'notes': 'Avoid NSAIDs',
            'created_at': '2021-03-15T09:00:00Z',
          }
        ],
        'chronic_conditions': [
          {
            'id': 'cnd-1',
            'patient_id': 'pat-uuid-999',
            'condition_name': 'Asthma',
            'icd10_code': 'J45',
            'diagnosed_date': '2015-08-01',
            'status': 'active',
            'notes': 'Uses Salbutamol',
            'created_at': '2015-08-01T09:00:00Z',
          }
        ],
        'current_medications': [
          {
            'id': 'med-1',
            'patient_id': 'pat-uuid-999',
            'medication_name': 'Salbutamol Inhaler',
            'dosage': '100mcg',
            'frequency': 'As needed',
            'start_date': '2015-08-10',
            'prescribed_by': 'Dr. Kaci',
            'is_active': true,
            'notes': '2 puffs on wheezing',
            'created_at': '2015-08-10T09:00:00Z',
          }
        ],
      },
      'share_metadata': {
        'scope': 'all_emr',
        'access_granted_at': '2026-10-16T08:00:00Z',
        'expires_at': '2026-10-16T12:00:00Z',
        'authorized_clinical_scope': 'ملف طبي موحد معتمد (خالٍ من بيانات الاتصال والهوية الشخصية)',
      },
    }
  };

  Widget buildTestApp({
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
      home: Scaffold(body: child),
    );
  }

  group('SharedRecordViewerSheet Widget Tests', () {
    testWidgets('renders PIN entry form in Arabic with RTL layout', (tester) async {
      final mockClient = MockClient((_) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: SharedRecordViewerSheet(
            apiClient: apiClient,
            initialToken: sampleToken,
          ),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('عرض السجل الطبي المشفر'), findsOneWidget);
      expect(find.text('رمز الحماية PIN'), findsOneWidget);
      expect(find.text('فك التشفير وعرض السجل'), findsOneWidget);
      // Directionality in Arabic
      final textDirection = Directionality.of(tester.element(find.text('عرض السجل الطبي المشفر')));
      expect(textDirection, equals(TextDirection.rtl));
    });

    testWidgets('renders PIN entry form in English with LTR layout', (tester) async {
      final mockClient = MockClient((_) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: SharedRecordViewerSheet(
            apiClient: apiClient,
            initialToken: sampleToken,
          ),
          locale: const Locale('en'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('View Encrypted Medical Record'), findsOneWidget);
      expect(find.text('Security PIN'), findsOneWidget);
      expect(find.text('Decrypt & View Record'), findsOneWidget);
      final textDirection = Directionality.of(tester.element(find.text('View Encrypted Medical Record')));
      expect(textDirection, equals(TextDirection.ltr));
    });

    testWidgets('validates PIN length locally before network call', (tester) async {
      bool networkCalled = false;
      final mockClient = MockClient((_) async {
        networkCalled = true;
        return http.Response('{}', 200);
      });
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: SharedRecordViewerSheet(
            apiClient: apiClient,
            initialToken: sampleToken,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Enter 2-digit PIN (< 4)
      await tester.enterText(find.byType(TextField).last, '12');
      await tester.tap(find.text('فك التشفير وعرض السجل'));
      await tester.pumpAndSettle();

      expect(find.text('يجب أن يتكون رمز الحماية من 4 إلى 8 أرقام'), findsOneWidget);
      expect(networkCalled, isFalse);
    });

    const jsonHeaders = {'content-type': 'application/json; charset=utf-8'};

    testWidgets('displays remaining attempts on 403 Wrong PIN and clears PIN field', (tester) async {
      final mockClient = MockClient((_) async {
        return http.Response(
          jsonEncode({
            'status': 'error',
            'code': 403,
            'message': 'رمز الحماية PIN غير صحيح.',
            'remaining_attempts': 2,
          }),
          403,
          headers: jsonHeaders,
        );
      });
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: SharedRecordViewerSheet(
            apiClient: apiClient,
            initialToken: sampleToken,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).last, '9999');
      await tester.tap(find.text('فك التشفير وعرض السجل'));
      await tester.pumpAndSettle();

      expect(find.textContaining('رمز الحماية PIN غير صحيح'), findsOneWidget);
      expect(find.textContaining('متبقي 2 محاولات'), findsOneWidget);

      // PIN field should be cleared for convenience/security
      final pinField = tester.widget<TextField>(find.byType(TextField).last);
      expect(pinField.controller?.text, isEmpty);
    });

    testWidgets('clears PIN and token and disables submission on 410 Expired/Revoked', (tester) async {
      final mockClient = MockClient((_) async {
        return http.Response(
          jsonEncode({
            'status': 'error',
            'code': 410,
            'message': 'تم إلغاء رابط المشاركة من قِبل المريض، ولم يعد صالحاً للاستخدام.',
          }),
          410,
          headers: jsonHeaders,
        );
      });
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: SharedRecordViewerSheet(
            apiClient: apiClient,
            initialToken: sampleToken,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).last, '1234');
      await tester.tap(find.text('فك التشفير وعرض السجل'));
      await tester.pumpAndSettle();

      expect(find.text('انتهت صلاحية رابط المشاركة أو تم إلغاؤه من قِبل المريض.'), findsOneWidget);
      // Submit button should be hidden on terminal state
      expect(find.text('فك التشفير وعرض السجل'), findsNothing);
    });

    testWidgets('clears PIN and disables submission on 423 Locked', (tester) async {
      final mockClient = MockClient((_) async {
        return http.Response(
          jsonEncode({
            'status': 'error',
            'code': 423,
            'message': 'تم قفل الرابط مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى الانتظار والمحاولة لاحقاً.',
          }),
          423,
          headers: jsonHeaders,
        );
      });
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: SharedRecordViewerSheet(
            apiClient: apiClient,
            initialToken: sampleToken,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).last, '1234');
      await tester.tap(find.text('فك التشفير وعرض السجل'));
      await tester.pumpAndSettle();

      expect(find.text('تم قفل الوصول مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة لاحقاً.'), findsOneWidget);
      expect(find.text('فك التشفير وعرض السجل'), findsNothing);
    });

    testWidgets('successfully resolves and displays medical record with zero prohibited PII', (tester) async {
      final mockClient = MockClient((_) async {
        return http.Response(jsonEncode(validRecordJson), 200, headers: jsonHeaders);
      });
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: SharedRecordViewerSheet(
            apiClient: apiClient,
            initialToken: sampleToken,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).last, '1234');
      await tester.tap(find.text('فك التشفير وعرض السجل'));
      await tester.pumpAndSettle();

      // Clinical information displayed
      expect(find.text('Amina Zouari'), findsOneWidget);
      expect(find.text('MRN: MRN-998877'), findsOneWidget);
      expect(find.text('Aspirin'), findsOneWidget);
      expect(find.text('Asthma'), findsOneWidget);
      expect(find.text('Salbutamol Inhaler'), findsOneWidget);

      // Verified notice badge displayed
      expect(find.text('ملف طبي موحد معتمد (خالٍ من بيانات الاتصال والهوية الشخصية)'), findsOneWidget);

      // Verify prohibited fields are absent
      expect(find.textContaining('phone'), findsNothing);
      expect(find.textContaining('email'), findsNothing);
      expect(find.textContaining('national_id'), findsNothing);
      expect(find.textContaining('address'), findsNothing);
    });
  });
}

// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_patient/app.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

void main() {
  group('Patient Location Registration Tests (Phase 4 Mobile Parity)', () {
    late InMemoryTokenStorage tokenStorage;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

    testWidgets('registration form displays Wilaya, Commune, and Address fields',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/master/wilayas')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {
                  'id': 16,
                  'code': '16',
                  'name_ar': 'الجزائر',
                  'name_fr': 'Alger',
                  'name_en': 'Algiers',
                  'is_active': true,
                  'display_order': 16,
                }
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: manager,
          apiClient: client,
          initialNavState: PatientNavState.auth,
        ),
      );

      await tester.tap(find.text('ليس لديك حساب؟ إنشاء حساب جديد'));
      await tester.pumpAndSettle();

      expect(find.text('الولاية'), findsOneWidget);
      expect(find.text('البلدية'), findsOneWidget);
      expect(find.text('العنوان (اختياري)'), findsOneWidget);
    });

    testWidgets('submitting registration without Wilaya triggers validation dialog',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/master/wilayas')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {
                  'id': 16,
                  'code': '16',
                  'name_ar': 'الجزائر',
                  'name_fr': 'Alger',
                  'name_en': 'Algiers',
                  'is_active': true,
                  'display_order': 16,
                }
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: manager,
          apiClient: client,
          initialNavState: PatientNavState.auth,
        ),
      );

      await tester.tap(find.text('ليس لديك حساب؟ إنشاء حساب جديد'));
      await tester.pumpAndSettle();

      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'الاسم الكامل'), 'خالد جديد');
      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'رقم الهاتف'), '0699112233');
      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني'),
          'khaled@aafiya.dz');
      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'كلمة المرور'), 'SecurePass2026!');
      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'تأكيد كلمة المرور'),
          'SecurePass2026!');

      final submitBtn = find.widgetWithText(AafiyaButton, 'إنشاء حساب');
      await tester.ensureVisible(submitBtn);
      await tester.tap(submitBtn);
      await tester.pumpAndSettle();

      expect(find.byType(AlertDialog), findsOneWidget);
      expect(find.text('يرجى اختيار الولاية'), findsOneWidget);
    });

    testWidgets(
        'successful registration with canonical wilaya and commune sends payload and navigates',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      bool registerCalled = false;
      Map<String, dynamic>? sentBody;

      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/master/wilayas')) {
          if (request.url.path.contains('/communes')) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': [
                  {
                    'code': '1601',
                    'wilaya_code': '16',
                    'name_ar': 'الجزائر الوسطى',
                    'name_fr': 'Alger Centre',
                    'name_en': 'Algiers Center',
                    'postal_code': '16000',
                    'is_active': true,
                    'display_order': 1,
                  }
                ],
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {
                  'id': 16,
                  'code': '16',
                  'name_ar': 'الجزائر',
                  'name_fr': 'Alger',
                  'name_en': 'Algiers',
                  'is_active': true,
                  'display_order': 16,
                }
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        } else if (request.url.path.contains('/auth/register')) {
          registerCalled = true;
          sentBody = jsonDecode(request.body) as Map<String, dynamic>;

          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {
                'token': 'patient_token_verified_location_2026',
                'user': {
                  'id': 'pat-loc-99',
                  'name': 'خالد جديد',
                  'email': 'khaled@aafiya.dz',
                  'phone': '0699112233',
                  'roles': [
                    {'name': 'patient_registered'}
                  ],
                },
              },
            }),
            201,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({'data': []}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: manager,
          apiClient: client,
          initialNavState: PatientNavState.auth,
        ),
      );

      await tester.tap(find.text('ليس لديك حساب؟ إنشاء حساب جديد'));
      await tester.pumpAndSettle();

      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'الاسم الكامل'), 'خالد جديد');
      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'رقم الهاتف'), '0699112233');
      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني'),
          'khaled@aafiya.dz');
      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'كلمة المرور'), 'SecurePass2026!');
      await tester.enterText(
          find.widgetWithText(AafiyaTextField, 'تأكيد كلمة المرور'),
          'SecurePass2026!');

      // Select Wilaya
      final wilayaField = find.byType(AafiyaWilayaSelector);
      await tester.ensureVisible(wilayaField);
      await tester.tap(wilayaField);
      await tester.pumpAndSettle();

      final wilayaOption = find.text('16 - الجزائر');
      expect(wilayaOption, findsWidgets);
      await tester.tap(wilayaOption.last);
      await tester.pumpAndSettle();

      // Select Commune
      final communeField = find.byType(AafiyaCommuneSelector);
      await tester.ensureVisible(communeField);
      await tester.tap(communeField);
      await tester.pumpAndSettle();

      final communeOption = find.text('الجزائر الوسطى (16000)');
      expect(communeOption, findsWidgets);
      await tester.tap(communeOption.last);
      await tester.pumpAndSettle();

      // Enter optional address
      final addressField =
          find.widgetWithText(AafiyaTextField, 'العنوان (اختياري)');
      await tester.ensureVisible(addressField);
      await tester.enterText(addressField, 'شارع الشهداء رقم 5');

      // Accept terms
      final termsCheckbox = find.byType(Checkbox);
      await tester.ensureVisible(termsCheckbox);
      await tester.tap(termsCheckbox);
      await tester.pumpAndSettle();

      // Submit
      final submitBtn = find.widgetWithText(AafiyaButton, 'إنشاء حساب');
      await tester.ensureVisible(submitBtn);
      await tester.tap(submitBtn);
      await tester.pumpAndSettle();

      expect(registerCalled, isTrue);
      expect(sentBody?['name'], equals('خالد جديد'));
      expect(sentBody?['wilaya_code'], equals('16'));
      expect(sentBody?['commune_code'], equals('1601'));
      expect(sentBody?['address'], equals('شارع الشهداء رقم 5'));
      expect(find.byType(PatientHomeShell), findsOneWidget);
      expect(await tokenStorage.getToken(),
          equals('patient_token_verified_location_2026'));
    });
  });
}

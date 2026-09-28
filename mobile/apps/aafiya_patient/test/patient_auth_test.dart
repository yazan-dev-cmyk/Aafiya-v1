// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_patient/app.dart';
import 'package:aafiya_patient/shells/auth_shell.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';
import 'package:aafiya_patient/shells/splash_shell.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

void main() {
  group('TASK-03-01: Patient Authentication & Onboarding Shell Tests', () {
    late InMemoryTokenStorage tokenStorage;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

    // =========================================================================
    // 1. SPLASH SCREEN & SESSION RESTORATION
    // =========================================================================
    group('1. Splash Screen & Session Restore', () {
      testWidgets('renders brand mark, Arabic titles, and language selector', (tester) async {
        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.splash,
          ),
        );

        expect(find.text('ع'), findsOneWidget);
        expect(find.text('عافية'), findsOneWidget);
        expect(find.text('بوابتك إلى العافية'), findsOneWidget);
        expect(find.text('العربية'), findsOneWidget);
        expect(find.text('EN'), findsOneWidget);
        expect(find.text('FR'), findsOneWidget);

        await tester.pump(const Duration(milliseconds: 700));
        await tester.pumpAndSettle();
      });

      testWidgets('splash navigates to auth shell when no token exists', (tester) async {
        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.splash,
          ),
        );

        expect(find.byType(PatientSplashShell), findsOneWidget);

        // Advance artificial 600ms splash delay
        await tester.pump(const Duration(milliseconds: 700));
        await tester.pumpAndSettle();

        // Navigates to PatientAuthShell
        expect(find.byType(PatientAuthShell), findsOneWidget);
        expect(find.text('تسجيل الدخول'), findsWidgets);
      });

      testWidgets('splash navigates to patient home when restorable session exists', (tester) async {
        await tokenStorage.saveToken('valid_test_token');

        final mockHttp = MockClient((request) async {
          if (request.url.path.contains('/auth/me')) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': {
                  'id': 'pat-100',
                  'name': 'فاطمة بن علي',
                  'email': 'fatima@aafiya.dz',
                  'roles': [{'name': 'patient_registered'}],
                },
              }),
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
            initialNavState: PatientNavState.splash,
          ),
        );

        await tester.pump(const Duration(milliseconds: 700));
        await tester.pumpAndSettle();

        expect(find.byType(PatientHomeShell), findsOneWidget);
        expect(find.text('فاطمة بن علي'), findsOneWidget);
      });

      testWidgets('splash navigates to auth shell when token is expired (HTTP 401)', (tester) async {
        await tokenStorage.saveToken('expired_token');

        final mockHttp = MockClient((request) async {
          if (request.url.path.contains('/auth/me')) {
            return http.Response(
              jsonEncode({'message': 'Unauthenticated.'}),
              401,
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
            initialNavState: PatientNavState.splash,
          ),
        );

        await tester.pump(const Duration(milliseconds: 700));
        await tester.pumpAndSettle();

        expect(find.byType(PatientAuthShell), findsOneWidget);
        expect(await tokenStorage.getToken(), isNull);
      });
    });

    // =========================================================================
    // 2. DYNAMIC LANGUAGE SELECTION & DIRECTIONALITY
    // =========================================================================
    group('2. Language Selection & RTL Mirroring', () {
      testWidgets('toggling language to English in splash flips directionality to LTR and text to English', (tester) async {
        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.splash,
            initialLocale: const Locale('ar'),
          ),
        );

        // Initial Arabic state: RTL
        expect(Directionality.of(tester.element(find.byType(PatientSplashShell))), TextDirection.rtl);
        expect(find.text('عافية'), findsOneWidget);

        // Switch to English
        await tester.tap(find.text('EN'));
        await tester.pump();

        // Directionality becomes LTR
        expect(Directionality.of(tester.element(find.byType(PatientSplashShell))), TextDirection.ltr);
        expect(find.text('AAFIYA'), findsOneWidget);
        expect(find.text('Your Gateway To Aafiya'), findsOneWidget);

        // Drain pending splash timer
        await tester.pump(const Duration(milliseconds: 700));
        await tester.pumpAndSettle();
      });

      testWidgets('switching languages in AuthShell AppBar popup menu dynamically updates strings and RTL', (tester) async {
        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.auth,
            initialLocale: const Locale('ar'),
          ),
        );

        expect(find.text('عافية للمرضى'), findsOneWidget);
        expect(Directionality.of(tester.element(find.byType(PatientAuthShell))), TextDirection.rtl);

        // Open language menu and select French
        await tester.tap(find.byIcon(Icons.language_rounded));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Français'));
        await tester.pumpAndSettle();

        // French UI (LTR)
        expect(Directionality.of(tester.element(find.byType(PatientAuthShell))), TextDirection.ltr);
        expect(find.text('Connexion'), findsWidgets);
        expect(find.text('Adresse e-mail'), findsOneWidget);

        // Switch to English (LTR)
        await tester.tap(find.byIcon(Icons.language_rounded));
        await tester.pumpAndSettle();

        await tester.tap(find.text('English'));
        await tester.pumpAndSettle();

        expect(Directionality.of(tester.element(find.byType(PatientAuthShell))), TextDirection.ltr);
        expect(find.text('Sign In'), findsWidgets);
        expect(find.text('Email Address'), findsOneWidget);

        // Switch back to Arabic (RTL)
        await tester.tap(find.byIcon(Icons.language_rounded));
        await tester.pumpAndSettle();

        await tester.tap(find.text('العربية'));
        await tester.pumpAndSettle();

        expect(Directionality.of(tester.element(find.byType(PatientAuthShell))), TextDirection.rtl);
        expect(find.text('تسجيل الدخول'), findsWidgets);
        expect(find.text('البريد الإلكتروني'), findsOneWidget);
      });
    });

    // =========================================================================
    // 3. LOGIN FORM VALIDATION & ERROR DIALOGS
    // =========================================================================
    group('3. Login Validation & Localized Dialogs', () {
      testWidgets('empty fields display localized error dialog', (tester) async {
        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.auth,
          ),
        );

        // Tap sign in with empty fields
        await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
        await tester.pumpAndSettle();

        // Error Dialog appears
        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('فشل تسجيل الدخول'), findsOneWidget);
        expect(find.text('هذا الحقل مطلوب'), findsOneWidget);

        // Dismiss dialog
        await tester.tap(find.text('حسناً'));
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsNothing);
      });

      testWidgets('invalid email format displays validation dialog', (tester) async {
        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.auth,
          ),
        );

        // Enter malformed email
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني').first, 'invalid-email');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور').first, 'password123');

        await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
        await tester.pumpAndSettle();

        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('يرجى إدخال بريد إلكتروني صالح'), findsOneWidget);

        await tester.tap(find.text('حسناً'));
        await tester.pumpAndSettle();
      });

      testWidgets('short password displays validation dialog', (tester) async {
        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.auth,
          ),
        );

        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني').first, 'patient@aafiya.dz');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور').first, 'short');

        await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
        await tester.pumpAndSettle();

        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('كلمة المرور يجب ألا تقل عن 8 أحرف'), findsOneWidget);

        await tester.tap(find.text('حسناً'));
        await tester.pumpAndSettle();
      });

      testWidgets('invalid credentials displays localized error dialog', (tester) async {
        final mockHttp = MockClient((request) async {
          if (request.url.path.contains('/auth/login')) {
            return http.Response(
              jsonEncode({
                'status': 'error',
                'code': 401,
                'message': 'Invalid credentials.',
              }),
              401,
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

        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني').first, 'wrong@aafiya.dz');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور').first, 'wrong_pass');

        await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
        await tester.pumpAndSettle();

        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('البريد الإلكتروني أو كلمة المرور غير صحيحة.'), findsOneWidget);

        await tester.tap(find.text('حسناً'));
        await tester.pumpAndSettle();
      });

      testWidgets('successful patient login stores token and navigates to patient home', (tester) async {
        final mockHttp = MockClient((request) async {
          if (request.url.path.contains('/auth/login')) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': {
                  'token': 'patient_token_abc_123',
                  'user': {
                    'id': 'pat-999',
                    'name': 'ياسمين بوزيد',
                    'email': 'yasmine@aafiya.dz',
                    'roles': [{'name': 'patient_registered'}],
                  },
                },
              }),
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

        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني').first, 'yasmine@aafiya.dz');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور').first, 'secret1234');

        await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
        await tester.pumpAndSettle();

        // Reaches Patient Home
        expect(find.byType(PatientHomeShell), findsOneWidget);
        expect(find.text('ياسمين بوزيد'), findsOneWidget);
        expect(await tokenStorage.getToken(), equals('patient_token_abc_123'));
      });
    });

    // =========================================================================
    // 4. CRITICAL ROLE BOUNDARY ENFORCEMENT
    // =========================================================================
    group('4. Role Boundary Security', () {
      testWidgets('doctor account login is rejected with guidance dialog and does NOT enter patient home', (tester) async {
        final mockHttp = MockClient((request) async {
          if (request.url.path.contains('/auth/login')) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': {
                  'token': 'doc_token_555',
                  'user': {
                    'id': 'doc-1',
                    'name': 'Dr. Ahmed',
                    'email': 'dr.ahmed@aafiya.dz',
                    'roles': [{'name': 'doctor'}],
                  },
                },
              }),
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

        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني').first, 'dr.ahmed@aafiya.dz');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور').first, 'secret1234');

        await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
        await tester.pumpAndSettle();

        // Rejection Dialog appears
        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('الحساب الحالي غير مصرح له بالدخول إلى هذا التطبيق.'), findsOneWidget);
        expect(find.text('هذا الحساب مخصص للكوادر الطبية والإدارية. يرجى استخدام تطبيق عافية للمهنيين (AAFIYA Pro).'), findsOneWidget);

        // Crucial: Must NOT navigate to Patient Home and token must NOT be stored
        expect(find.byType(PatientHomeShell), findsNothing);
        expect(find.byType(PatientAuthShell), findsOneWidget);
        expect(manager.isAuthenticated, isFalse);
        expect(await tokenStorage.getToken(), isNull);
      });

      testWidgets('web-only admin role login is rejected with web portal guidance', (tester) async {
        final mockHttp = MockClient((request) async {
          if (request.url.path.contains('/auth/login')) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': {
                  'token': 'admin_token_777',
                  'user': {
                    'id': 'adm-1',
                    'name': 'Admin User',
                    'email': 'admin@aafiya.dz',
                    'roles': [{'name': 'admin'}],
                  },
                },
              }),
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

        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني').first, 'admin@aafiya.dz');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور').first, 'secret1234');

        await tester.tap(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'));
        await tester.pumpAndSettle();

        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('الوظائف الإدارية والتشخيصية مخصصة للاستخدام عبر بوابة الويب حصرياً.'), findsOneWidget);
        expect(find.byType(PatientHomeShell), findsNothing);
        expect(manager.isAuthenticated, isFalse);
      });
    });

    // =========================================================================
    // 5. REGISTRATION FLOW & TOGGLING
    // =========================================================================
    group('5. Registration Flow', () {
      testWidgets('toggling between Sign In and Register switches form fields', (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.auth,
          ),
        );

        // Initially in Sign In mode
        expect(find.text('الاسم الكامل'), findsNothing);
        expect(find.text('رقم الهاتف'), findsNothing);
        expect(find.text('تأكيد كلمة المرور'), findsNothing);

        // Tap "إنشاء حساب جديد" prompt or button
        await tester.tap(find.text('ليس لديك حساب؟ إنشاء حساب جديد'));
        await tester.pumpAndSettle();

        // Registration fields now visible
        expect(find.text('الاسم الكامل'), findsOneWidget);
        expect(find.text('رقم الهاتف'), findsOneWidget);
        expect(find.text('البريد الإلكتروني'), findsOneWidget);
        expect(find.text('كلمة المرور'), findsOneWidget);
        expect(find.text('تأكيد كلمة المرور'), findsOneWidget);
        expect(find.widgetWithText(AafiyaButton, 'إنشاء حساب'), findsOneWidget);

        // Switch back to Sign In
        final backToLogin = find.text('لديك حساب بالفعل؟ تسجيل الدخول');
        await tester.ensureVisible(backToLogin);
        await tester.tap(backToLogin);
        await tester.pumpAndSettle();

        expect(find.text('الاسم الكامل'), findsNothing);
        expect(find.widgetWithText(AafiyaButton, 'تسجيل الدخول'), findsOneWidget);
      });

      testWidgets('registration empty fields trigger validation dialog', (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final client = ApiClient(tokenStorage: tokenStorage);
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

        final submitBtn = find.widgetWithText(AafiyaButton, 'إنشاء حساب');
        await tester.ensureVisible(submitBtn);
        await tester.tap(submitBtn);
        await tester.pumpAndSettle();

        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('فشل إنشاء الحساب'), findsOneWidget);
        expect(find.text('هذا الحقل مطلوب'), findsOneWidget);

        await tester.tap(find.text('حسناً'));
        await tester.pumpAndSettle();
      });

      testWidgets('registration password mismatch triggers validation dialog', (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final client = ApiClient(tokenStorage: tokenStorage);
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

        await tester.enterText(find.widgetWithText(AafiyaTextField, 'الاسم الكامل'), 'مراد قادري');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'رقم الهاتف'), '0555333444');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني'), 'mourad@aafiya.dz');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور'), 'password123');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'تأكيد كلمة المرور'), 'mismatch999');

        final submitBtn = find.widgetWithText(AafiyaButton, 'إنشاء حساب');
        await tester.ensureVisible(submitBtn);
        await tester.tap(submitBtn);
        await tester.pumpAndSettle();

        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('كلمتا المرور غير متطابقتين'), findsOneWidget);

        await tester.tap(find.text('حسناً'));
        await tester.pumpAndSettle();
      });

      testWidgets('registration backend error displays localized error dialog', (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final mockHttp = MockClient((request) async {
          if (request.url.path.contains('/auth/register')) {
            return http.Response(
              jsonEncode({
                'status': 'error',
                'code': 422,
                'message': 'البريد الإلكتروني مستخدم بالفعل.',
              }),
              422,
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

        await tester.enterText(find.widgetWithText(AafiyaTextField, 'الاسم الكامل'), 'مراد قادري');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'رقم الهاتف'), '0555333444');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني'), 'taken@aafiya.dz');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور'), 'password123');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'تأكيد كلمة المرور'), 'password123');

        final submitBtn = find.widgetWithText(AafiyaButton, 'إنشاء حساب');
        await tester.ensureVisible(submitBtn);
        await tester.tap(submitBtn);
        await tester.pumpAndSettle();

        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('البريد الإلكتروني مستخدم بالفعل.'), findsOneWidget);

        await tester.tap(find.text('حسناً'));
        await tester.pumpAndSettle();
      });

      testWidgets('successful registration provisions session, verifies patient role, and navigates to home', (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        bool registerCalled = false;
        final mockHttp = MockClient((request) async {
          if (request.url.path.contains('/auth/register')) {
            registerCalled = true;
            final body = jsonDecode(request.body) as Map<String, dynamic>;
            expect(body['name'], equals('مراد قادري'));
            expect(body['phone'], equals('0555333444'));
            expect(body['email'], equals('mourad@aafiya.dz'));

            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': {
                  'token': 'new_registered_patient_token_888',
                  'user': {
                    'id': 'pat-77',
                    'name': 'مراد قادري',
                    'email': 'mourad@aafiya.dz',
                    'phone': '0555333444',
                    'roles': [{'name': 'patient_registered'}],
                  },
                },
              }),
              201,
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

        await tester.enterText(find.widgetWithText(AafiyaTextField, 'الاسم الكامل'), 'مراد قادري');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'رقم الهاتف'), '0555333444');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'البريد الإلكتروني'), 'mourad@aafiya.dz');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'كلمة المرور'), 'password123');
        await tester.enterText(find.widgetWithText(AafiyaTextField, 'تأكيد كلمة المرور'), 'password123');

        final submitBtn = find.widgetWithText(AafiyaButton, 'إنشاء حساب');
        await tester.ensureVisible(submitBtn);
        await tester.tap(submitBtn);
        await tester.pumpAndSettle();

        expect(registerCalled, isTrue);
        expect(find.byType(PatientHomeShell), findsOneWidget);
        expect(find.text('مراد قادري'), findsOneWidget);
        expect(await tokenStorage.getToken(), equals('new_registered_patient_token_888'));
      });
    });

    // =========================================================================
    // 6. PASSWORD VISIBILITY TOGGLE
    // =========================================================================
    group('6. Password Visibility Toggle', () {
      testWidgets('tapping password visibility icon toggles obscurity', (tester) async {
        final client = ApiClient(tokenStorage: tokenStorage);
        final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: manager,
            apiClient: client,
            initialNavState: PatientNavState.auth,
          ),
        );

        // Find password eye icon
        final visibilityToggle = find.byIcon(Icons.visibility_outlined).first;
        expect(visibilityToggle, findsOneWidget);

        // Tap to reveal password
        await tester.tap(visibilityToggle);
        await tester.pumpAndSettle();

        // Icon changes to visibility_off
        expect(find.byIcon(Icons.visibility_off_outlined), findsWidgets);
      });
    });
  });
}

// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/shells/auth_shell.dart';
import 'package:aafiya_pro/shells/doctor_shell.dart';
import 'package:aafiya_pro/shells/role_resolution_shell.dart';
import 'package:aafiya_pro/screens/doctor_queue_screen.dart';

Widget createTestApp({
  required Widget child,
  Locale locale = const Locale('ar'),
}) {
  return MaterialApp(
    locale: locale,
    theme: AafiyaTheme.lightTheme,
    supportedLocales: AafiyaSupportedLocale.supportedLocales,
    localizationsDelegates: const [
      AafiyaLocalizationsDelegate(),
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: child,
  );
}

void main() {
  group('Doctor Authentication & Role Resolution Tests', () {
    late InMemoryTokenStorage tokenStorage;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

    testWidgets('ProAuthShell renders login form and submits credentials', (tester) async {
      bool loginSuccessCalled = false;

      final mockHttpClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/login')) {
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          if (body['email'] == 'mansouri@example.dz' && body['password'] == 'ValidPass123!') {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': {
                  'user': {
                    'id': 'doc-uuid-1',
                    'name': 'Dr. Mansouri',
                    'email': 'mansouri@example.dz',
                    'roles': ['doctor'],
                  },
                  'token': 'mock_jwt_doctor_token',
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
        }
        return http.Response(jsonEncode({'message': 'Invalid credentials'}), 401);
      });

      final mockApiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockHttpClient,
      );
      final testSessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: mockApiClient,
      );

      await tester.pumpWidget(
        createTestApp(
          child: Scaffold(
            body: ProAuthShell(
              sessionManager: testSessionManager,
              apiClient: mockApiClient,
              onLoginSuccess: () {
                loginSuccessCalled = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('عافية للمهنيين'), findsWidgets);
      expect(find.byType(AafiyaTextField), findsNWidgets(2));

      await tester.enterText(find.byType(TextFormField).at(0), 'mansouri@example.dz');
      await tester.enterText(find.byType(TextFormField).at(1), 'ValidPass123!');
      await tester.pump();

      await tester.tap(find.byType(AafiyaButton));
      await tester.pumpAndSettle();

      expect(loginSuccessCalled, isTrue);
      expect(testSessionManager.isAuthenticated, isTrue);
      expect(testSessionManager.currentUser?.name, equals('Dr. Mansouri'));
      expect(testSessionManager.currentUser?.roles.contains(UserRole.doctor), isTrue);
    });

    testWidgets('RoleResolutionShell routes doctor to DoctorShell', (tester) async {
      const doctorUser = User(
        id: 'doc-1',
        name: 'Dr. Fatima',
        email: 'fatima@example.dz',
        roles: [UserRole.doctor],
      );

      final mockHttpClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'cli-1',
                'name': 'Clinique El Chifa',
                'wilaya': 'الجزائر',
                'position': 'doctor',
                'is_director': false,
                'is_active': true,
                'is_primary': true,
              },
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final mockApiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockHttpClient,
      );
      final testSessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: mockApiClient,
      );

      await testSessionManager.setAuthenticatedUser(
        token: 'doctor_mock_token',
        user: doctorUser,
      );

      await tester.pumpWidget(
        createTestApp(
          child: RoleResolutionShell(
            sessionManager: testSessionManager,
            apiClient: mockApiClient,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.byType(DoctorShell), findsOneWidget);
      expect(find.text('طبيب: Dr. Fatima'), findsOneWidget);
    });
  });

  group('DoctorShell Clinic Context & Switching Tests', () {
    late InMemoryTokenStorage tokenStorage;

    const doctorUser = User(
      id: 'doc-1',
      name: 'Dr. Amine',
      email: 'amine@example.dz',
      roles: [UserRole.doctor],
    );

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

    testWidgets('displays loading indicator while fetching clinics', (tester) async {
      final mockClient = MockClient((request) async {
        await Future<void>.delayed(const Duration(milliseconds: 500));
        return http.Response(
          jsonEncode({'status': 'success', 'data': <Map<String, dynamic>>[]}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final mockApiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockClient,
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: mockApiClient,
      );

      await sessionManager.setAuthenticatedUser(
        token: 'doc_token',
        user: doctorUser,
      );

      await tester.pumpWidget(
        createTestApp(
          child: DoctorShell(
            user: doctorUser,
            sessionManager: sessionManager,
            apiClient: mockApiClient,
            onSignOut: () {},
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('جاري تحميل العيادات...'), findsOneWidget);

      await tester.pumpAndSettle();
    });

    testWidgets('displays error view on fetch failure and retries successfully', (tester) async {
      int attempts = 0;
      final mockClient = MockClient((request) async {
        attempts++;
        if (attempts == 1) {
          return http.Response(
            jsonEncode({'message': 'Network connection error'}),
            500,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'cli-01',
                'name': 'Clinique El Chifa',
                'wilaya': 'الجزائر',
                'position': 'doctor',
                'is_director': false,
                'is_active': true,
                'is_primary': true,
              },
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final mockApiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockClient,
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: mockApiClient,
      );

      await sessionManager.setAuthenticatedUser(
        token: 'doc_token',
        user: doctorUser,
      );

      await tester.pumpWidget(
        createTestApp(
          child: DoctorShell(
            user: doctorUser,
            sessionManager: sessionManager,
            apiClient: mockApiClient,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Error view shown
      expect(find.byType(AafiyaErrorView), findsOneWidget);
      expect(find.text('إعادة المحاولة'), findsOneWidget);

      // Tap retry
      await tester.tap(find.text('إعادة المحاولة'));
      await tester.pumpAndSettle();

      // Successfully loaded clinic
      expect(find.text('Clinique El Chifa'), findsWidgets);
      expect(sessionManager.activeClinic?.name, equals('Clinique El Chifa'));
      expect(mockApiClient.activeClinicId, equals('cli-01'));
    });

    testWidgets('displays empty state when doctor has no clinics assigned', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'status': 'success', 'data': <Map<String, dynamic>>[]}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final mockApiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockClient,
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: mockApiClient,
      );

      await sessionManager.setAuthenticatedUser(
        token: 'doc_token',
        user: doctorUser,
      );

      await tester.pumpWidget(
        createTestApp(
          child: DoctorShell(
            user: doctorUser,
            sessionManager: sessionManager,
            apiClient: mockApiClient,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('لا توجد عيادة مرتبطة بحسابك حالياً. يرجى التواصل مع الإدارة.'), findsOneWidget);
      expect(find.text('تسجيل الخروج'), findsOneWidget);
    });

    testWidgets('single clinic auto-binds active context without change button', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'cli-alone',
                'name': 'Clinique Solitaire',
                'wilaya': 'وهران',
                'address': 'حي السلام',
                'position': 'medical_director',
                'is_director': true,
                'is_active': true,
                'is_primary': true,
              },
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final mockApiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockClient,
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: mockApiClient,
      );

      await sessionManager.setAuthenticatedUser(
        token: 'doc_token',
        user: doctorUser,
      );

      await tester.pumpWidget(
        createTestApp(
          child: DoctorShell(
            user: doctorUser,
            sessionManager: sessionManager,
            apiClient: mockApiClient,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Context auto-bound
      expect(sessionManager.activeClinicId, equals('cli-alone'));
      expect(sessionManager.activeClinic?.isMedicalDirector, isTrue);
      expect(mockApiClient.activeClinicId, equals('cli-alone'));

      // Active clinic details visible
      expect(find.text('Clinique Solitaire'), findsOneWidget);
      expect(find.text('العيادة النشطة'), findsOneWidget);
      expect(find.text('مدير طبي'), findsOneWidget);
      expect(find.text('رئيسية'), findsOneWidget);

      // Single clinic -> No Change button
      expect(find.text('تغيير'), findsNothing);
    });

    testWidgets('multi-clinic supports switching active clinic context via bottom sheet', (tester) async {
      final multiClinicsData = [
        {
          'id': 'cli-01',
          'name': 'Clinique El Chifa',
          'wilaya': 'الجزائر',
          'address': 'شارع ديدوش مراد',
          'position': 'medical_director',
          'is_director': true,
          'is_active': true,
          'is_primary': true,
        },
        {
          'id': 'cli-02',
          'name': 'Clinique Al Azhar',
          'wilaya': 'البليدة',
          'address': 'وسط المدينة',
          'position': 'doctor',
          'is_director': false,
          'is_active': true,
          'is_primary': false,
        },
      ];

      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'status': 'success', 'data': multiClinicsData}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final mockApiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockClient,
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: mockApiClient,
      );

      await sessionManager.setAuthenticatedUser(
        token: 'doc_token',
        user: doctorUser,
      );

      await tester.pumpWidget(
        createTestApp(
          child: DoctorShell(
            user: doctorUser,
            sessionManager: sessionManager,
            apiClient: mockApiClient,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Primary clinic auto-selected initially
      expect(sessionManager.activeClinicId, equals('cli-01'));
      expect(mockApiClient.activeClinicId, equals('cli-01'));
      expect(find.text('تغيير'), findsOneWidget);

      // Open clinic switcher modal
      await tester.tap(find.text('تغيير'));
      await tester.pumpAndSettle();

      // Bottom sheet contents
      expect(find.text('تبديل العيادة'), findsOneWidget);
      expect(find.text('العيادات المتاحة'), findsOneWidget);
      expect(find.text('Clinique El Chifa'), findsWidgets);
      expect(find.text('Clinique Al Azhar'), findsWidgets);

      // Tap second clinic to switch context
      await tester.tap(find.text('Clinique Al Azhar'));
      await tester.pumpAndSettle();

      // Context successfully switched
      expect(sessionManager.activeClinicId, equals('cli-02'));
      expect(sessionManager.activeClinic?.name, equals('Clinique Al Azhar'));
      expect(mockApiClient.activeClinicId, equals('cli-02'));
    });

    testWidgets('trilingual localization renders correctly across AR, FR, EN', (tester) async {
      final clinicData = [
        {
          'id': 'cli-01',
          'name': 'Clinique El Chifa',
          'wilaya': 'Alger',
          'position': 'medical_director',
          'is_director': true,
          'is_active': true,
          'is_primary': true,
        },
        {
          'id': 'cli-02',
          'name': 'Clinique Al Azhar',
          'wilaya': 'Blida',
          'position': 'doctor',
          'is_director': false,
          'is_active': true,
          'is_primary': false,
        },
      ];

      for (final locale in [const Locale('ar'), const Locale('fr'), const Locale('en')]) {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({'status': 'success', 'data': clinicData}),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final mockApiClient = ApiClient(
          tokenStorage: tokenStorage,
          httpClient: mockClient,
        );
        final sessionManager = AuthSessionManager(
          tokenStorage: tokenStorage,
          apiClient: mockApiClient,
        );

        await sessionManager.setAuthenticatedUser(
          token: 'doc_token',
          user: doctorUser,
        );

        await tester.pumpWidget(
          createTestApp(
            locale: locale,
            child: DoctorShell(
              key: ValueKey(locale.languageCode),
              user: doctorUser,
              sessionManager: sessionManager,
              apiClient: mockApiClient,
              onSignOut: () {},
            ),
          ),
        );

        await tester.pumpAndSettle();

        if (locale.languageCode == 'ar') {
          expect(find.text('العيادة النشطة'), findsOneWidget);
          expect(find.text('تغيير'), findsOneWidget);
          expect(find.text('مدير طبي'), findsOneWidget);
        } else if (locale.languageCode == 'fr') {
          expect(find.text('Clinique active'), findsOneWidget);
          expect(find.text('Changer'), findsOneWidget);
          expect(find.text('Directeur médical'), findsOneWidget);
        } else if (locale.languageCode == 'en') {
          expect(find.text('Active Clinic'), findsOneWidget);
          expect(find.text('Change'), findsOneWidget);
          expect(find.text('Medical Director'), findsOneWidget);
        }
      }
    });

    testWidgets('DoctorShell renders corrected navigation labels across AR, EN, FR (DEF-03)', (tester) async {
      final clinicData = [
        {
          'id': 'cln-1',
          'name': 'Clinique El Chifa',
          'wilaya': 'Alger',
          'address': 'Didouche Mourad',
          'is_medical_director': false,
          'is_active': true,
          'is_primary': true,
        },
      ];

      for (final locale in [const Locale('ar'), const Locale('en'), const Locale('fr')]) {
        final mockClient = MockClient((request) async {
          if (request.url.path.endsWith('/doctor/clinics')) {
            return http.Response(
              jsonEncode({'status': 'success', 'data': clinicData}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (request.url.path.endsWith('/doctor/stats')) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': {
                  'today_total': 0,
                  'pending_check_in': 0,
                  'in_waiting_room': 0,
                  'completed_today': 0,
                  'no_show_today': 0,
                  'active_clinic_id': 'cln-1',
                  'active_clinic_name': 'Clinique El Chifa',
                  'date': '2026-10-02',
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (request.url.path.endsWith('/appointments')) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': [],
                'meta': {'current_page': 1, 'per_page': 15, 'total': 0, 'total_pages': 0},
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(jsonEncode({'status': 'success', 'data': []}), 200);
        });

        final mockApiClient = ApiClient(
          tokenStorage: tokenStorage,
          httpClient: mockClient,
        );
        final sessionManager = AuthSessionManager(
          tokenStorage: tokenStorage,
          apiClient: mockApiClient,
        );

        await sessionManager.setAuthenticatedUser(
          token: 'doc_token',
          user: doctorUser,
        );

        await tester.pumpWidget(
          createTestApp(
            locale: locale,
            child: DoctorShell(
              key: ValueKey('nav_${locale.languageCode}'),
              user: doctorUser,
              sessionManager: sessionManager,
              apiClient: mockApiClient,
              onSignOut: () {},
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Verify Tab 1 (Waiting Room) and Tab 2 (My Clinics) labels
        final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
        final labels = navBar.destinations.map((d) => (d as NavigationDestination).label).toList();

        if (locale.languageCode == 'ar') {
          expect(labels.contains('قاعة الانتظار'), isTrue);
          expect(labels.contains('عياداتي'), isTrue);
          expect(labels.contains('مواعيد المرضى'), isFalse);
        } else if (locale.languageCode == 'en') {
          expect(labels.contains('Waiting Room'), isTrue);
          expect(labels.contains('My Clinics'), isTrue);
          expect(labels.contains('Patient Appointments'), isFalse);
        } else if (locale.languageCode == 'fr') {
          expect(labels.contains("Salle d'attente"), isTrue);
          expect(labels.contains('Mes Cabinets'), isTrue);
          expect(labels.contains('Rendez-vous patients'), isFalse);
        }

        // Tap Tab 1 to switch to waiting room / queue view
        await tester.tap(find.byIcon(Icons.people_alt_outlined));
        await tester.pumpAndSettle();
        expect(find.byType(DoctorQueueScreen), findsOneWidget);

        // Tap Tab 2 to switch to my clinics view
        await tester.tap(find.byIcon(Icons.local_hospital_outlined));
        await tester.pumpAndSettle();
        expect(find.text('Clinique El Chifa'), findsWidgets);
      }
    });
  });
}

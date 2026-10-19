// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/screens/booking_center_directory_screen.dart';
import 'package:aafiya_patient/screens/clinic_directory_screen.dart';
import 'package:aafiya_patient/screens/doctor_directory_screen.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';
import 'package:aafiya_patient/shells/auth_shell.dart';

void main() {
  group('Section 5.1: Booking Center Directory & Brand Mark Acceptance Tests', () {
    late InMemoryTokenStorage tokenStorage;

    const testPatient = User(
      id: 'patient-1',
      name: 'فاطمة بن علي',
      email: 'fatima@aafiya.dz',
      phone: '0555123456',
      roles: [UserRole.patient],
    );

    final mockCenter1 = {
      'id': 'bc-1',
      'name': 'مركز حجز العاصمة المعتمد',
      'slug': 'algiers-booking-center',
      'phone': '021998877',
      'email': 'booking@algiers.dz',
      'address': '05 شارع حسيبة بن بوعلي',
      'wilaya_code': '16',
      'wilaya': 'الجزائر',
      'commune_code': '1601',
      'commune': 'سيدي امحمد',
      'verification_status': 'verified',
      'is_active': true,
      'quota_balance': 250,
      'total_appointments_count': 120,
    };

    final mockCenter2 = {
      'id': 'bc-2',
      'name': 'مركز حجز وهران النور',
      'slug': 'oran-booking-center',
      'phone': '041554433',
      'email': 'oran@booking.dz',
      'address': 'حي السلام',
      'wilaya_code': '31',
      'wilaya': 'وهران',
      'commune_code': '3101',
      'commune': 'وهران',
      'verification_status': 'verified',
      'is_active': true,
      'quota_balance': 180,
      'total_appointments_count': 85,
    };

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

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
        home: Scaffold(body: child),
      );
    }

    testWidgets('BookingCenterDirectoryScreen loads, renders centers, and shows AafiyaBrandMark', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/booking-centers')) {
          return http.Response(
            jsonEncode({
              'data': [mockCenter1, mockCenter2],
              'links': {'next': null},
              'meta': {'current_page': 1, 'last_page': 1, 'total': 2},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response(jsonEncode({'data': []}), 200);
      });

      final apiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockClient,
      );

      await tester.pumpWidget(
        createTestableWidget(
          child: BookingCenterDirectoryScreen(apiClient: apiClient),
        ),
      );
      await tester.pumpAndSettle();

      // Verify AafiyaBrandMark is present in the AppBar
      expect(find.byType(AafiyaBrandMark), findsOneWidget);

      // Verify Screen title
      expect(find.text('دليل مراكز الحجز المعتمدة'), findsOneWidget);

      // Verify Centers data rendered
      expect(find.text('مركز حجز العاصمة المعتمد'), findsOneWidget);
      expect(find.textContaining('021998877'), findsOneWidget);
      expect(find.text('مركز حجز وهران النور'), findsOneWidget);
      expect(find.textContaining('041554433'), findsOneWidget);

      // Verify DISC-01 informational badge
      expect(find.text('دليل استعلامي فقط — الحجز المباشر عبر مراكز الحجز المعتمدة'), findsAtLeastNWidgets(1));
    });

    testWidgets('Empty state findBookingCenterAction button routes to BookingCenterDirectoryScreen', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({'data': []}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/booking-centers')) {
          return http.Response(
            jsonEncode({
              'data': [mockCenter1],
              'links': {'next': null},
              'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'data': []}), 200);
      });

      final apiClient = ApiClient(
        tokenStorage: tokenStorage,
        httpClient: mockClient,
      );

      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: tokenStorage,
      );
      await sessionManager.setAuthenticatedUser(token: 'valid_test_token', user: testPatient);

      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('ar'),
          supportedLocales: AafiyaSupportedLocale.supportedLocales,
          localizationsDelegates: const [
            AafiyaLocalizationsDelegate(),
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: AafiyaTheme.lightTheme,
          home: PatientHomeShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            onSignOut: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Find the "ابحث عن مركز حجز" action button in the empty appointments card
      final findBookingCenterBtn = find.text('ابحث عن مركز حجز');
      expect(findBookingCenterBtn, findsOneWidget);

      // Tap it
      await tester.tap(findBookingCenterBtn);
      await tester.pumpAndSettle();

      // Verify that BookingCenterDirectoryScreen was pushed
      expect(find.byType(BookingCenterDirectoryScreen), findsOneWidget);
      expect(find.byType(ClinicDirectoryScreen), findsNothing);
    });

    testWidgets('AuthShell renders AafiyaBrandMark hero header', (tester) async {
      final mockClient = MockClient((request) async => http.Response(jsonEncode({}), 200));
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(apiClient: apiClient, tokenStorage: tokenStorage);

      await tester.pumpWidget(
        createTestableWidget(
          child: PatientAuthShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            onLoginSuccess: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify AafiyaBrandMark is rendered in the auth shell
      expect(find.byType(AafiyaBrandMark), findsOneWidget);
      expect(find.text('عافية للمرضى'), findsWidgets);
    });

    testWidgets('DoctorDirectoryScreen & ClinicDirectoryScreen render AafiyaBrandMark', (tester) async {
      final mockClient = MockClient((request) async => http.Response(jsonEncode({'data': []}), 200));
      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

      // Check DoctorDirectoryScreen
      await tester.pumpWidget(
        createTestableWidget(
          child: DoctorDirectoryScreen(apiClient: apiClient),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AafiyaBrandMark), findsOneWidget);

      // Check ClinicDirectoryScreen
      await tester.pumpWidget(
        createTestableWidget(
          child: ClinicDirectoryScreen(apiClient: apiClient),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AafiyaBrandMark), findsOneWidget);
    });
  });
}

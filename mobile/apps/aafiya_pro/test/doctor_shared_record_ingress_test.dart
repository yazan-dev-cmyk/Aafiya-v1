// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/shells/doctor_shell.dart';

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
  const doctorUser = User(
    id: 'doc-001',
    name: 'د. كريم بن علي',
    email: 'doctor@aafiya.test',
    roles: [UserRole.doctor],
  );

  final mockClinicsResponse = {
    'status': 'success',
    'data': [
      {
        'id': 'cli-01',
        'name': 'Clinique El Chifa',
        'address': 'Rue Didouche Mourad 12',
        'wilaya': 'Alger',
        'is_active': true,
        'is_primary': true,
      }
    ],
  };

  group('DoctorShell Encrypted Shared Medical Record Ingress Tests', () {
    testWidgets(
        'renders PopupMenuButton with viewSharedRecordHubTitle and opens SharedRecordViewerSheet',
        (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/clinics')) {
          return http.Response(
            jsonEncode(mockClinicsResponse),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/dashboard/today')) {
          return http.Response(
            jsonEncode({
              'data': {
                'today_appointments_count': 0,
                'completed_count': 0,
                'waiting_count': 0,
                'appointments': [],
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{"data": {}}', 200,
            headers: {'content-type': 'application/json'});
      });

      final tokenStorage = InMemoryTokenStorage();
      final apiClient =
          ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      final sessionManager =
          AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);
      await sessionManager.setAuthenticatedUser(
          token: 'doc_token', user: doctorUser);

      await tester.pumpWidget(
        createTestApp(
          child: DoctorShell(
            user: doctorUser,
            sessionManager: sessionManager,
            apiClient: apiClient,
            onSignOut: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Find PopupMenuButton
      final popupMenuFinder = find.byType(PopupMenuButton<String>);
      expect(popupMenuFinder, findsOneWidget);

      // Tap PopupMenuButton
      await tester.tap(popupMenuFinder);
      await tester.pumpAndSettle();

      // Verify the menu item for shared record is displayed
      expect(find.text('استعراض سجل مشارك'), findsOneWidget);

      // Tap the menu item
      await tester.tap(find.text('استعراض سجل مشارك'));
      await tester.pumpAndSettle();

      // Verify SharedRecordViewerSheet is opened
      expect(find.byType(SharedRecordViewerSheet), findsOneWidget);
      expect(find.text('عرض السجل الطبي المشفر'), findsOneWidget);
      expect(find.text('أدخل رمز الحماية PIN لفك تشفير السجل الطبي المشترك'),
          findsOneWidget);
    });
  });
}

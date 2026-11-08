// ignore_for_file: depend_on_referenced_packages
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

Widget createTestApp(Widget child) {
  return MaterialApp(
    locale: const Locale('ar'),
    supportedLocales: const [
      Locale('ar'),
      Locale('fr'),
      Locale('en'),
    ],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(body: SingleChildScrollView(child: child)),
  );
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('AafiyaChangePasswordCard', () {
    testWidgets('renders all three password fields, toggles, and submit button',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response('{}', 200);
      });
      final apiClient = ApiClient(httpClient: mockClient);

      await tester.pumpWidget(
        createTestApp(AafiyaChangePasswordCard(apiClient: apiClient)),
      );
      await tester.pumpAndSettle();

      expect(find.text('تغيير كلمة المرور'), findsOneWidget);
      expect(find.text('كلمة المرور الحالية'), findsOneWidget);
      expect(find.text('كلمة المرور الجديدة'), findsOneWidget);
      expect(find.text('تأكيد كلمة المرور الجديدة'), findsOneWidget);
      expect(find.text('حفظ كلمة المرور الجديدة'), findsOneWidget);
    });

    testWidgets('validates required fields on empty submit', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response('{}', 200);
      });
      final apiClient = ApiClient(httpClient: mockClient);

      await tester.pumpWidget(
        createTestApp(AafiyaChangePasswordCard(apiClient: apiClient)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('حفظ كلمة المرور الجديدة'));
      await tester.pumpAndSettle();

      expect(find.text('يرجى إدخال كلمة المرور الحالية'), findsOneWidget);
      expect(find.text('يرجى إدخال كلمة المرور الجديدة'), findsOneWidget);
    });

    testWidgets('validates minimum password length', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response('{}', 200);
      });
      final apiClient = ApiClient(httpClient: mockClient);

      await tester.pumpWidget(
        createTestApp(AafiyaChangePasswordCard(apiClient: apiClient)),
      );
      await tester.pumpAndSettle();

      final textFields = find.byType(TextFormField);
      await tester.enterText(textFields.at(0), 'CurrentPass123!');
      await tester.enterText(textFields.at(1), 'short');
      await tester.enterText(textFields.at(2), 'short');

      await tester.tap(find.text('حفظ كلمة المرور الجديدة'));
      await tester.pumpAndSettle();

      expect(find.text('كلمة المرور يجب ألا تقل عن 8 أحرف'), findsOneWidget);
    });

    testWidgets('validates password confirmation match', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response('{}', 200);
      });
      final apiClient = ApiClient(httpClient: mockClient);

      await tester.pumpWidget(
        createTestApp(AafiyaChangePasswordCard(apiClient: apiClient)),
      );
      await tester.pumpAndSettle();

      final textFields = find.byType(TextFormField);
      await tester.enterText(textFields.at(0), 'CurrentPass123!');
      await tester.enterText(textFields.at(1), 'ValidNewPassword123!');
      await tester.enterText(textFields.at(2), 'DifferentPassword999!');

      await tester.tap(find.text('حفظ كلمة المرور الجديدة'));
      await tester.pumpAndSettle();

      expect(find.text('كلمتا المرور غير متطابقتين'), findsOneWidget);
    });

    testWidgets('successful submit sends correct request and calls onSuccess',
        (tester) async {
      bool requestSent = false;
      bool onSuccessCalled = false;

      final mockClient = MockClient((request) async {
        expect(request.url.path, endsWith('/auth/change-password'));
        expect(request.method, equals('POST'));

        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['current_password'], equals('OldPass123!'));
        expect(body['new_password'], equals('NewSecretPass123!'));
        expect(body['new_password_confirmation'], equals('NewSecretPass123!'));

        requestSent = true;
        return http.Response(
          jsonEncode({
            'status': 'success',
            'message': 'Password updated successfully.',
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);

      await tester.pumpWidget(
        createTestApp(
          AafiyaChangePasswordCard(
            apiClient: apiClient,
            onSuccess: () {
              onSuccessCalled = true;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      final textFields = find.byType(TextFormField);
      await tester.enterText(textFields.at(0), 'OldPass123!');
      await tester.enterText(textFields.at(1), 'NewSecretPass123!');
      await tester.enterText(textFields.at(2), 'NewSecretPass123!');

      await tester.tap(find.text('حفظ كلمة المرور الجديدة'));
      await tester.pumpAndSettle();

      expect(requestSent, isTrue);
      expect(onSuccessCalled, isTrue);
      expect(find.text('تم تغيير كلمة المرور بنجاح'), findsOneWidget);
    });
  });
}

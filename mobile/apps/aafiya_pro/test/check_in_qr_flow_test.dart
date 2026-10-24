import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/utils/qr_token_sanitizer.dart';
import 'package:aafiya_pro/widgets/check_in_sheet.dart';

void main() {
  const validToken =
      'G7k9Z1w3Y5v8Q2x4M6n0P1r3T5u7A9b0C2d4E6f8H0j2L4o6R8s0U2i4X6y8Z0W2';
  assert(validToken.length == 64);

  Widget createTestApp({
    required AssistantQueueService queueService,
    Future<String?> Function(BuildContext context)? scannerOpener,
    VoidCallback? onCheckInSuccess,
  }) {
    return MaterialApp(
      locale: const Locale('ar'),
      supportedLocales: const [
        Locale('ar'),
        Locale('en'),
        Locale('fr'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: Scaffold(
        body: Builder(
          builder: (context) => Center(
            child: ElevatedButton(
              key: const Key('open_check_in_modal_btn'),
              onPressed: () => CheckInSheet.show(
                context,
                queueService: queueService,
                scannerOpener: scannerOpener,
                onCheckInSuccess: onCheckInSuccess,
              ),
              child: const Text('Open Modal'),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> openSheet(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('open_check_in_modal_btn')));
    await tester.pumpAndSettle();
  }

  group('CheckInSheet QR Scanner & Automatic Check-In Flow', () {
    testWidgets(
        '1. Scanner button and header QR icon exist and trigger scanner opener',
        (tester) async {
      var scannerOpenedCount = 0;

      final mockClient =
          MockClient((request) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
        scannerOpener: (context) async {
          scannerOpenedCount++;
          return null; // simulated cancel
        },
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      final scanButton = find.byKey(const Key('check_in_scan_button'));
      expect(scanButton, findsOneWidget);

      final headerQrIcon =
          find.byKey(const Key('check_in_header_qr_icon_button'));
      expect(headerQrIcon, findsOneWidget);

      await tester.tap(scanButton);
      await tester.pumpAndSettle();
      expect(scannerOpenedCount, equals(1));

      await tester.tap(headerQrIcon);
      await tester.pumpAndSettle();
      expect(scannerOpenedCount, equals(2));
    });

    testWidgets(
        '2. Valid scan AUTOMATICALLY initiates check-in without requiring extra confirmation tap',
        (tester) async {
      var apiCallCount = 0;
      String? sentToken;
      var successCallbackCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/appointments/check-in')) {
          apiCallCount++;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          sentToken = body['token'] as String?;
          return http.Response(
            jsonEncode({
              'message': 'تم تأكيد حضور الموعد بنجاح.',
              'check_in_result': 'checked_in',
              'data': {
                'id': 'appt-01',
                'booking_reference': 'MS-2026-0001',
                'status': 'attended',
                'checked_in_at': '2026-10-24T10:00:00.000000Z',
                'patient': {'id': 'pat-01', 'name': 'أحمد بن علي'},
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 404);
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
        onCheckInSuccess: () {
          successCallbackCalled = true;
        },
        scannerOpener: (context) async {
          // Scanner decodes localized web pass URL
          const rawUrl =
              'https://aafiya.site/ar/appointment/pass/$validToken?source=mobile_scanner#view';
          return rawUrl;
        },
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      // Tap Scan button to initiate scanning
      await tester.tap(find.byKey(const Key('check_in_scan_button')));
      await tester.pumpAndSettle();

      // AUTOMATIC VERIFICATION:
      // 1. API request fired exactly once without user pressing 'تأكيد الحضور الآن'
      expect(apiCallCount, equals(1),
          reason: 'Valid scan must trigger check-in automatically');
      expect(sentToken, equals(validToken));

      // 2. Success callback was triggered and modal popped
      expect(successCallbackCalled, isTrue);

      // 3. Success SnackBar was presented on the host Scaffold
      expect(find.textContaining('MS-2026-0001'), findsOneWidget);
    });

    testWidgets(
        '3. Invalid or malformed scan does NOT trigger check-in request and presents error',
        (tester) async {
      var apiCallCount = 0;

      final mockClient = MockClient((request) async {
        apiCallCount++;
        return http.Response('{}', 200);
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
        scannerOpener: (context) async {
          // Unsupported URL path
          return 'https://malicious.site/unsupported/pass/12345';
        },
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      await tester.tap(find.byKey(const Key('check_in_scan_button')));
      await tester.pumpAndSettle();

      // Verify NO API request was dispatched
      expect(apiCallCount, equals(0));

      // Error banner is displayed
      expect(find.byKey(const Key('check_in_error_message_banner')),
          findsOneWidget);
      expect(find.text('رمز QR غير صالح لموعد في عافية.'), findsOneWidget);
    });

    testWidgets(
        '4. Backend validation failure (422) is handled gracefully with recovery path',
        (tester) async {
      var apiCallCount = 0;

      final mockClient = MockClient((request) async {
        apiCallCount++;
        return http.Response(
          jsonEncode({
            'message':
                'لا يمكن تسجيل حضور موعد قيد الانتظار. يجب تأكيد الموعد أولاً.',
            'errors': {
              'status': [
                'لا يمكن تسجيل حضور موعد قيد الانتظار. يجب تأكيد الموعد أولاً.'
              ]
            }
          }),
          422,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
        scannerOpener: (context) async => validToken,
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      await tester.tap(find.byKey(const Key('check_in_scan_button')));
      await tester.pumpAndSettle();

      expect(apiCallCount, equals(1));

      // Error banner displays backend error message
      expect(
        find.textContaining('لا يمكن تسجيل حضور موعد قيد الانتظار'),
        findsOneWidget,
      );

      // Token remains in field for recovery / manual review
      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.controller?.text, equals(validToken));
    });

    testWidgets('5. Backend authorization failure (403) is handled gracefully',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message':
                'غير مصرح: تم سحب صلاحية تأكيد الحضور وتسجيل المرضى من حسابك.',
          }),
          403,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
        scannerOpener: (context) async => validToken,
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      await tester.tap(find.byKey(const Key('check_in_scan_button')));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('تم سحب صلاحية تأكيد الحضور'),
        findsOneWidget,
      );
    });

    testWidgets(
        '6. Network failure does not crash and preserves safe manual recovery',
        (tester) async {
      final mockClient = MockClient((request) async {
        throw http.ClientException(
            'فشل الاتصال بالخادم. يرجى التحقق من الشبكة.');
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
        scannerOpener: (context) async => validToken,
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      await tester.tap(find.byKey(const Key('check_in_scan_button')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('check_in_error_message_banner')),
          findsOneWidget);
    });

    testWidgets(
        '7. Manual entry remains functional and retains explicit confirmation behavior',
        (tester) async {
      var apiCallCount = 0;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/appointments/check-in')) {
          apiCallCount++;
          return http.Response(
            jsonEncode({
              'message': 'تم تأكيد حضور الموعد بنجاح.',
              'check_in_result': 'checked_in',
              'data': {
                'id': 'appt-02',
                'booking_reference': 'MS-2026-0002',
                'status': 'attended',
                'checked_in_at': '2026-10-24T10:15:00.000000Z',
                'patient': {'id': 'pat-02', 'name': 'سعاد فغولي'},
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 404);
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      // 1. Entering text manually does NOT auto-submit
      await tester.enterText(find.byType(TextField), validToken);
      await tester.pumpAndSettle();
      expect(apiCallCount, equals(0),
          reason: 'Manual typing must NOT automatically submit');

      // 2. Explicitly tap confirm button
      await tester.tap(find.widgetWithText(AafiyaButton, 'تأكيد الحضور الآن'));
      await tester.pumpAndSettle();

      expect(apiCallCount, equals(1));
    });

    test(
        '8. QrTokenSanitizer rejects overlong URLs and prevents raw URL dispatch',
        () {
      const fullUrl =
          'https://aafiya.site/ar/appointment/pass/$validToken?tracking=123';
      expect(fullUrl.length, greaterThan(64));

      final sanitized = QrTokenSanitizer.sanitize(fullUrl);
      expect(sanitized, isNotNull);
      expect(sanitized?.length, equals(64));
      expect(sanitized, equals(validToken));

      const invalidUrl =
          'https://aafiya.site/ar/appointment/pass/${validToken}EXTRA';
      expect(QrTokenSanitizer.sanitize(invalidUrl), isNull);
    });

    testWidgets(
        '9. Explicit already_checked_in response displays alreadyCheckedInNotice without claiming new check-in',
        (tester) async {
      var callbackCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/appointments/check-in')) {
          return http.Response(
            jsonEncode({
              'message': 'تم تأكيد حضور الموعد بنجاح.',
              'check_in_result': 'already_checked_in',
              'data': {
                'id': 'appt-09',
                'booking_reference': 'MS-2026-ALREADY',
                'status': 'attended',
                'checked_in_at': '2026-10-24T08:00:00.000000Z',
                'patient': {'id': 'pat-09', 'name': 'ياسمين بلحاج'},
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
        onCheckInSuccess: () => callbackCalled = true,
        scannerOpener: (context) async => validToken,
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      await tester.tap(find.byKey(const Key('check_in_scan_button')));
      await tester.pumpAndSettle();

      // Modal closed and callback triggered
      expect(callbackCalled, isTrue);
      expect(find.byType(CheckInSheet), findsNothing);

      // Host screen shows alreadyCheckedInNotice (not checkInSuccess)
      expect(find.textContaining('تم تسجيل حضور هذا الموعد مسبقاً'),
          findsOneWidget);
      expect(find.textContaining('MS-2026-ALREADY'), findsOneWidget);
    });

    testWidgets(
        '10. HTTP 200 with missing or unknown discriminator keeps modal open and reports contract mismatch',
        (tester) async {
      var callbackCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/appointments/check-in')) {
          return http.Response(
            jsonEncode({
              'message': 'تم تأكيد حضور الموعد بنجاح.',
              // Missing check_in_result discriminator
              'data': {
                'id': 'appt-10',
                'booking_reference': 'MS-2026-UNKNOWN',
                'status': 'attended',
                'patient': {'id': 'pat-10', 'name': 'مجهول'},
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        queueService: queueService,
        onCheckInSuccess: () => callbackCalled = true,
        scannerOpener: (context) async => validToken,
      ));
      await tester.pumpAndSettle();
      await openSheet(tester);

      await tester.tap(find.byKey(const Key('check_in_scan_button')));
      await tester.pumpAndSettle();

      // Modal remains open, callback was NOT triggered
      expect(callbackCalled, isFalse);
      expect(find.byType(CheckInSheet), findsOneWidget);

      // Contract mismatch error is displayed in the error banner
      expect(
          find.textContaining('استجابة غير متوقعة من الخادم'), findsOneWidget);
    });
  });
}

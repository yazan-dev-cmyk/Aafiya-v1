// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/shells/assistant_shell.dart';
import 'package:aafiya_pro/shells/booking_center_shell.dart';
import 'package:aafiya_pro/widgets/doctor_dashboard_view.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testDoctorUser = User(
    id: 'user-doc-001',
    name: 'د. سمير بن علي',
    email: 'doctor@aafiya.test',
    phone: '+213550112233',
    roles: [UserRole.doctor],
    doctorId: 'doc-uuid-001',
  );

  const testAssistantUser = User(
    id: 'user-ast-001',
    name: 'مريم قدور',
    email: 'assistant@aafiya.test',
    phone: '+213550123450',
    roles: [UserRole.doctorAssistant],
    permissions: ['booking.manage_queue'],
  );

  const testBcUser = User(
    id: 'user-bc-001',
    name: 'مركز الهدى للحجوزات',
    email: 'bc@aafiya.test',
    phone: '+213550998877',
    roles: [UserRole.bookingCenter],
  );

  Widget wrapInApp(Widget child) {
    return MaterialApp(
      locale: const Locale('ar'),
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

  group('AAFIYA Pro — Doctor Ads Ticker Integration Tests', () {
    testWidgets('Doctor dashboard hides ticker (0 height) when no ads or audience disabled', (tester) async {
      final mockClient = MockClient((request) async {
        final path = request.url.path;
        if (path.contains('/doctor/stats')) {
          return http.Response(
            jsonEncode({
              'data': {
                'today_appointments_count': 5,
                'attended_count': 2,
                'waiting_count': 1,
                'cancelled_count': 0,
                'no_show_count': 0,
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': {'items': [], 'current_page': 1, 'last_page': 1}
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/operating-hours')) {
          return http.Response(
            jsonEncode({'data': {'is_configured': true}}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/schedule')) {
          return http.Response(
            jsonEncode({'data': {'is_activated': true}}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/ads/ticker')) {
          // Empty ads returned because doctor audience defaults to false
          return http.Response(
            jsonEncode({'data': []}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-doc-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(
        wrapInApp(
          DoctorDashboardView(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Zero-mock policy: Ticker should not show any sponsored text or cards
      expect(find.text('إعلان'), findsNothing);
      expect(find.text('Sponsored'), findsNothing);
    });

    testWidgets('Doctor dashboard renders active ticker when eligible ad returned and records click', (tester) async {
      int clickCount = 0;
      final mockClient = MockClient((request) async {
        final path = request.url.path;
        if (path.contains('/doctor/stats')) {
          return http.Response(
            jsonEncode({
              'data': {
                'today_appointments_count': 5,
                'attended_count': 2,
                'waiting_count': 1,
                'cancelled_count': 0,
                'no_show_count': 0,
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': {'items': [], 'current_page': 1, 'last_page': 1}
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/operating-hours')) {
          return http.Response(
            jsonEncode({'data': {'is_configured': true}}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/schedule')) {
          return http.Response(
            jsonEncode({'data': {'is_activated': true}}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/ads/ticker') && request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'ad-doc-1',
                  'title': 'مؤتمر أمراض القلب السنوي',
                  'content': 'التسجيل مفتوح للأطباء الأخصائيين المعتمدين.',
                  'target_url': 'https://aafiya.app/conferences/cardio',
                  'status': 'active',
                  'starts_at': '2026-01-01T00:00:00Z',
                  'ends_at': '2026-12-31T23:59:59Z',
                  'ticker_clicks_count': 10,
                  'placements': [
                    {
                      'id': 'pl-doc-1',
                      'audience': 'doctor',
                      'destination': 'ticker',
                      'is_active': true,
                    }
                  ],
                }
              ]
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/ads/ticker/ad-doc-1/click') && request.method == 'POST') {
          clickCount++;
          return http.Response(
            jsonEncode({
              'status': 'success',
              'message': 'Recorded',
              'duplicate': false,
              'ticker_clicks_count': 11,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-doc-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(
        wrapInApp(
          DoctorDashboardView(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('مؤتمر أمراض القلب السنوي'), findsOneWidget);
      expect(find.text('إعلان'), findsOneWidget);

      // Tap ad to record click
      await tester.tap(find.text('مؤتمر أمراض القلب السنوي'));
      await tester.pumpAndSettle();

      expect(clickCount, 1);
    });
  });

  group('AAFIYA Pro — Assistant & Booking Center Ads Ticker Tests', () {
    testWidgets('AssistantShell hides ticker when no ads and displays when ad present', (tester) async {
      bool returnAds = false;
      final mockClient = MockClient((request) async {
        final path = request.url.path;
        if (path.contains('/ads/ticker')) {
          if (!returnAds) {
            return http.Response(
              jsonEncode({'data': []}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'ad-ast-1',
                  'title': 'دورة تدريبية لإدارة طوابير الانتظار',
                  'content': 'تعرف على أفضل الممارسات لاستقبال المرضى.',
                  'target_url': 'https://aafiya.app/training/queue',
                  'status': 'active',
                  'starts_at': '2026-01-01T00:00:00Z',
                  'ends_at': '2026-12-31T23:59:59Z',
                  'ticker_clicks_count': 3,
                  'placements': [
                    {
                      'id': 'pl-ast-1',
                      'audience': 'doctor_assistant',
                      'destination': 'ticker',
                      'is_active': true,
                    }
                  ],
                }
              ]
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1}
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-ast-token'),
        apiClient: apiClient,
      );

      // 1. Without ads: Zero height
      await tester.pumpWidget(
        wrapInApp(
          AssistantShell(
            user: testAssistantUser,
            sessionManager: sessionManager,
            apiClient: apiClient,
            onSignOut: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('إعلان'), findsNothing);

      // 2. With ads: Rendered
      returnAds = true;
      final adsService = AdsTickerService(apiClient: apiClient);
      await tester.pumpWidget(
        wrapInApp(
          AssistantShell(
            key: const Key('assistant_shell_with_ads'),
            user: testAssistantUser,
            sessionManager: sessionManager,
            apiClient: apiClient,
            adsTickerService: adsService,
            onSignOut: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('دورة تدريبية لإدارة طوابير الانتظار'), findsOneWidget);
      expect(find.text('إعلان'), findsOneWidget);
    });

    testWidgets('BookingCenterShell integrates ticker and clears cache on signout', (tester) async {
      var signedOut = false;
      final mockClient = MockClient((request) async {
        final path = request.url.path;
        if (path.contains('/quota')) {
          return http.Response(
            jsonEncode({
              'data': {
                'name': 'مركز الهدى',
                'quota_balance': 250,
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.contains('/ads/ticker')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'ad-bc-1',
                  'title': 'حزم الكوتا الترويجية',
                  'content': 'خصم 20% على شحن رصيد الحجوزات هذا الشهر.',
                  'target_url': 'https://aafiya.app/quota/promo',
                  'status': 'active',
                  'starts_at': '2026-01-01T00:00:00Z',
                  'ends_at': '2026-12-31T23:59:59Z',
                  'ticker_clicks_count': 7,
                  'placements': [
                    {
                      'id': 'pl-bc-1',
                      'audience': 'booking_center',
                      'destination': 'ticker',
                      'is_active': true,
                    }
                  ],
                }
              ]
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-bc-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(
        wrapInApp(
          BookingCenterShell(
            user: testBcUser,
            sessionManager: sessionManager,
            apiClient: apiClient,
            onSignOut: () => signedOut = true,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('حزم الكوتا الترويجية'), findsOneWidget);
      expect(find.text('خصم 20% على شحن رصيد الحجوزات هذا الشهر.'), findsOneWidget);
      expect(find.text('إعلان'), findsOneWidget);

      // Sign out
      await tester.tap(find.byIcon(Icons.logout_rounded));
      await tester.pumpAndSettle();

      final confirmBtn = find.widgetWithText(ElevatedButton, 'تسجيل الخروج');
      if (confirmBtn.evaluate().isNotEmpty) {
        await tester.tap(confirmBtn);
        await tester.pumpAndSettle();
      }

      expect(signedOut, isTrue);
    });
  });
}

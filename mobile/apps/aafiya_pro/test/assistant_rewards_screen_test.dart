import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/shells/assistant_shell.dart';
import 'package:aafiya_pro/screens/assistant_rewards_screen.dart';

void main() {
  const testAssistantUser = User(
    id: 'user-ast-001',
    name: 'مريم قدور',
    email: 'assistant@aafiya.test',
    phone: '+213550123450',
    roles: [UserRole.doctorAssistant],
    permissions: [
      'booking.manage_queue',
      'booking.confirm_attendance',
      'booking.create',
    ],
  );

  final sampleSummary = {
    'current_balance': 15000.0,
    'total_earned': 25000.0,
    'total_reversed': 500.0,
    'total_deducted': 1000.0,
    'total_paid': 8500.0,
    'total_relieved': 0.0,
    'pending_payout': 15000.0,
    'payout_threshold': 10000.0,
    'is_eligible_for_payout': true,
    'active_profile': {
      'id': 'prof-001',
      'rip_number': '00799999000123456789',
      'version': 1,
      'status': 'active',
    },
  };

  final sampleTransactions = [
    {
      'id': 'tx-1',
      'assistant_id': 'user-ast-001',
      'transaction_type': 'reward_earned',
      'direction': 'credit',
      'amount': 50.0,
      'balance_after': 15000.0,
      'source_type': 'appointment',
      'source_id': 'appt-001',
      'created_at': '2026-11-02 10:00:00',
    }
  ];

  final samplePayouts = [
    {
      'id': 'payout-1',
      'batch_id': 'batch-001',
      'amount': 8500.0,
      'status': 'paid',
      'transfer_reference': 'CCP-REF-2026-99',
      'transferred_at': '2026-11-01',
      'batch': {
        'batch_number': 'BATCH-2026-10',
        'period_start': '2026-10-01',
        'period_end': '2026-10-31',
      }
    }
  ];

  final sampleProfiles = [
    {
      'id': 'prof-001',
      'assistant_id': 'user-ast-001',
      'rip_number': '00799999000123456789',
      'status': 'active',
      'version': 1,
      'created_at': '2026-10-01',
    }
  ];

  Widget createTestWidget({
    required AuthSessionManager sessionManager,
    required ApiClient apiClient,
    Locale locale = const Locale('ar'),
    Future<({Uint8List bytes, String name})?> Function()? filePickerCallback,
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
      home: AssistantRewardsScreen(
        user: testAssistantUser,
        sessionManager: sessionManager,
        apiClient: apiClient,
        filePickerCallback: filePickerCallback,
      ),
    );
  }

  group('AssistantRewardsScreen Widget Tests', () {
    testWidgets('1. Loads rewards summary and renders KPI balances & eligibility badge', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/assistant/rewards/summary')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleSummary}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/assistant/rewards/transactions')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleTransactions}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'data': []}), 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        apiClient: apiClient,
      ));
      await tester.pumpAndSettle();

      // Check title & eligibility badge
      expect(find.text('المكافآت المالية لمساعد الطبيب'), findsOneWidget);
      expect(find.text('مؤهل للصرف المالي'), findsOneWidget);

      // Check balances
      expect(find.textContaining('15000.00'), findsWidgets);
      expect(find.textContaining('25000.00'), findsOneWidget);
      expect(find.textContaining('8500.00'), findsOneWidget);

      // Check transaction list
      expect(find.text('reward_earned'), findsOneWidget);
      expect(find.textContaining('+50.00'), findsOneWidget);
    });

    testWidgets('2. Switches to Payouts and Profile tabs and displays records', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/assistant/rewards/summary')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleSummary}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/assistant/rewards/transactions')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleTransactions}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/assistant/rewards/payouts')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': samplePayouts}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/assistant/rewards/profiles')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleProfiles}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'data': []}), 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        apiClient: apiClient,
      ));
      await tester.pumpAndSettle();

      // Switch to Payouts tab
      await tester.tap(find.text('سجل التحويلات'));
      await tester.pumpAndSettle();

      expect(find.textContaining('BATCH-2026-10'), findsOneWidget);
      expect(find.textContaining('CCP-REF-2026-99'), findsOneWidget);

      // Switch to Profile tab
      await tester.tap(find.text('حساب الصرف (RIP)'));
      await tester.pumpAndSettle();

      expect(find.text('00799999000123456789'), findsNWidgets(2));
      expect(find.text('Algérie Poste (CCP)'), findsOneWidget);
      expect(find.text('إرسال للاعتماد'), findsOneWidget);
      expect(find.text('سجل إصدارات الحساب (RIP)'), findsOneWidget);
      expect(find.text('v1'), findsOneWidget);
    });

    testWidgets('3. AssistantShell top app bar includes Rewards button', (tester) async {
      final mockClient = MockClient((request) async {
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
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(MaterialApp(
        locale: const Locale('ar'),
        supportedLocales: AafiyaSupportedLocale.supportedLocales,
        localizationsDelegates: const [
          AafiyaLocalizationsDelegate(),
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        theme: AafiyaTheme.lightTheme,
        home: AssistantShell(
          user: testAssistantUser,
          sessionManager: sessionManager,
          queueService: queueService,
          onSignOut: () {},
        ),
      ));
      await tester.pumpAndSettle();

      final walletButton = find.byIcon(Icons.account_balance_wallet_outlined);
      expect(walletButton, findsOneWidget);
    });

    testWidgets('4. Profile tab displays rejection card with reason and guidance when latest profile is rejected', (tester) async {
      final rejectedSummary = {
        'current_balance': 15000.0,
        'total_earned': 25000.0,
        'total_reversed': 0.0,
        'total_deducted': 0.0,
        'total_paid': 0.0,
        'total_relieved': 0.0,
        'pending_payout': 15000.0,
        'payout_threshold': 10000.0,
        'is_eligible_for_payout': false,
        'ineligibility_reason': 'profile_rejected',
        'active_profile': null,
      };

      final multipleProfiles = [
        {
          'id': 'prof-002',
          'assistant_id': 'user-ast-001',
          'rip_number': '00799999000987654321',
          'status': 'rejected',
          'version': 2,
          'rejection_reason': 'الصك المشطوب غير واضح تماماً أو الاسم لا يتطابق',
          'rejected_at': '2026-11-03 14:00:00',
          'created_at': '2026-11-03 12:00:00',
        },
        {
          'id': 'prof-001',
          'assistant_id': 'user-ast-001',
          'rip_number': '00799999000123456789',
          'status': 'superseded',
          'version': 1,
          'created_at': '2026-10-01',
        },
      ];

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/assistant/rewards/summary')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': rejectedSummary}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/assistant/rewards/profiles')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': multipleProfiles}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'data': []}), 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        apiClient: apiClient,
      ));
      await tester.pumpAndSettle();

      // Verify KPI eligibility reflects profile rejection
      expect(find.text('أهلية الصرف معلقة: تم رفض بيانات الدفع الأخيرة.'), findsOneWidget);

      // Switch to Profile tab
      await tester.tap(find.text('حساب الصرف (RIP)'));
      await tester.pumpAndSettle();

      // Verify rejection banner and reason
      expect(find.textContaining('تنبيه: تم رفض بيانات الدفع'), findsOneWidget);
      expect(find.textContaining('الصك المشطوب غير واضح تماماً'), findsWidgets);
      expect(find.text('يرجى تصحيح البيانات أدناه وإرفاق صك بريدي واضح لإعادة المراجعة.'), findsOneWidget);

      // Verify version history shows both versions with respective statuses
      expect(find.text('v2'), findsOneWidget);
      expect(find.text('v1'), findsOneWidget);
      expect(find.text('مرفوض'), findsOneWidget);
      expect(find.text('مستبدل'), findsOneWidget);
    });

    testWidgets('5. Profile tab displays review pending banner and reflects ineligibility when pending verification', (tester) async {
      final pendingSummary = {
        'current_balance': 15000.0,
        'total_earned': 15000.0,
        'total_reversed': 0.0,
        'total_deducted': 0.0,
        'total_paid': 0.0,
        'total_relieved': 0.0,
        'pending_payout': 15000.0,
        'payout_threshold': 10000.0,
        'is_eligible_for_payout': false,
        'ineligibility_reason': 'pending_profile_verification',
        'active_profile': null,
      };

      final pendingProfiles = [
        {
          'id': 'prof-003',
          'assistant_id': 'user-ast-001',
          'rip_number': '00799999000555555555',
          'status': 'pending_verification',
          'version': 2,
          'created_at': '2026-11-04 09:00:00',
        },
        {
          'id': 'prof-001',
          'assistant_id': 'user-ast-001',
          'rip_number': '00799999000123456789',
          'status': 'superseded',
          'version': 1,
          'created_at': '2026-10-01',
        },
      ];

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/assistant/rewards/summary')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': pendingSummary}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/assistant/rewards/profiles')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': pendingProfiles}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'data': []}), 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        apiClient: apiClient,
      ));
      await tester.pumpAndSettle();

      // Verify KPI badge says pending
      expect(find.text('أهلية الصرف معلقة: يوجد إصدار قيد المراجعة الإدارية.'), findsOneWidget);

      // Switch to Profile tab
      await tester.tap(find.text('حساب الصرف (RIP)'));
      await tester.pumpAndSettle();

      // Verify review pending banner in Profile tab
      expect(find.text('أهلية الصرف معلقة: يوجد إصدار قيد المراجعة الإدارية.'), findsNWidgets(2));
      expect(find.text('قيد المراجعة'), findsOneWidget);
      expect(find.text('مستبدل'), findsOneWidget);
    });

    testWidgets('6. File picker attaches document via callback and displays file info', (tester) async {
      tester.view.physicalSize = const Size(1200, 1800);
      addTearDown(tester.view.resetPhysicalSize);
      tester.view.devicePixelRatio = 1.0;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/assistant/rewards/summary')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleSummary}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/assistant/rewards/profiles')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleProfiles}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'data': []}), 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        apiClient: apiClient,
        filePickerCallback: () async => (
          bytes: Uint8List.fromList([1, 2, 3, 4, 5, 6]),
          name: 'cheque_barre_official.jpg',
        ),
      ));
      await tester.pumpAndSettle();

      // Switch to Profile tab
      await tester.tap(find.text('حساب الصرف (RIP)'));
      await tester.pumpAndSettle();

      // Tap file picker button
      await tester.tap(find.text('نسخة الصك المشطوب'));
      await tester.pumpAndSettle();

      // Verify document name is displayed and replace button appears
      expect(find.textContaining('cheque_barre_official.jpg'), findsOneWidget);
      expect(find.text('تغيير الملف'), findsOneWidget);
    });

    testWidgets('7. File picker rejects files larger than 5MB', (tester) async {
      tester.view.physicalSize = const Size(1200, 1800);
      addTearDown(tester.view.resetPhysicalSize);
      tester.view.devicePixelRatio = 1.0;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/assistant/rewards/summary')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleSummary}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/assistant/rewards/profiles')) {
          return http.Response(
            jsonEncode({'status': 'success', 'data': sampleProfiles}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'data': []}), 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );

      // 6MB dummy bytes
      final oversizedBytes = Uint8List(6 * 1024 * 1024);

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        apiClient: apiClient,
        filePickerCallback: () async => (
          bytes: oversizedBytes,
          name: 'large_cheque.jpg',
        ),
      ));
      await tester.pumpAndSettle();

      // Switch to Profile tab
      await tester.tap(find.text('حساب الصرف (RIP)'));
      await tester.pumpAndSettle();

      // Tap file picker button
      await tester.tap(find.text('نسخة الصك المشطوب'));
      await tester.pumpAndSettle();

      // Verify error snackbar appears
      expect(find.text('حجم الملف يتجاوز الحد الأقصى المسموح (5 ميغابايت).'), findsOneWidget);
      expect(find.text('تغيير الملف'), findsNothing);
    });
  });
}

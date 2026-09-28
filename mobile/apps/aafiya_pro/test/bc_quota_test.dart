// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/bc_quota_screen.dart';
import 'package:aafiya_pro/shells/booking_center_shell.dart';
import 'package:aafiya_pro/widgets/quota_balance_card.dart';

Widget createTestWidget({
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

http.Response jsonResponse(dynamic body, [int statusCode = 200]) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    statusCode,
    headers: const {'content-type': 'application/json; charset=utf-8'},
  );
}

void main() {
  const bcUser = User(
    id: 'bc-user-001',
    name: 'مركز الجزائر للحجوزات',
    email: 'booking@algiers.dz',
    roles: [UserRole.bookingCenter],
  );

  const doctorUser = User(
    id: 'doc-user-001',
    name: 'Dr. Fatima',
    email: 'fatima@algiers.dz',
    roles: [UserRole.doctor],
  );

  const assistantUser = User(
    id: 'asst-user-001',
    name: 'Sami Assistant',
    email: 'sami@algiers.dz',
    roles: [UserRole.doctorAssistant],
  );

  const patientUser = User(
    id: 'pat-user-001',
    name: 'Amine Patient',
    email: 'amine@algiers.dz',
    roles: [UserRole.patientRegistered],
  );

  final mockQuotaPayload = {
    'data': {
      'booking_center_id': 'bc-001',
      'name': 'مركز الجزائر للحجوزات',
      'quota_balance': 75,
    }
  };

  final mockZeroQuotaPayload = {
    'data': {
      'booking_center_id': 'bc-001',
      'name': 'مركز الجزائر للحجوزات',
      'quota_balance': 0,
    }
  };

  final mockPackagesPayload = {
    'data': [
      {
        'id': 'pkg-100',
        'package_code': 'PKG_100',
        'name': 'باقة 100 حجز',
        'quota_units': 100,
        'price_dzd': 15000.0,
        'description': 'باقة أولية لمراكز الحجز.',
        'is_active': true,
      },
      {
        'id': 'pkg-500',
        'package_code': 'PKG_500',
        'name': 'باقة 500 حجز',
        'quota_units': 500,
        'price_dzd': 60000.0,
        'description': 'باقة نمو متوسطة.',
        'is_active': true,
      },
    ]
  };

  final mockRequestsPayload = {
    'data': [
      {
        'id': 'req-001',
        'request_reference': 'PR-2026-0001',
        'booking_center_id': 'bc-001',
        'booking_package_id': 'pkg-100',
        'package_name': 'باقة 100 حجز',
        'package_code': 'PKG_100',
        'quota_units': 100,
        'price_dzd': 15000.0,
        'payment_method': 'baridimob',
        'transaction_reference': 'TXN-BARIDI-01',
        'status': 'pending',
        'created_at': '2026-09-21T10:00:00.000000Z',
      },
      {
        'id': 'req-002',
        'request_reference': 'PR-2026-0002',
        'booking_center_id': 'bc-001',
        'booking_package_id': 'pkg-500',
        'package_name': 'باقة 500 حجز',
        'package_code': 'PKG_500',
        'quota_units': 500,
        'price_dzd': 60000.0,
        'payment_method': 'bank_transfer',
        'transaction_reference': 'TXN-BANK-02',
        'status': 'approved',
        'reviewed_by': {'id': 'adm-1', 'name': 'Admin'},
        'reviewed_at': '2026-09-20T12:00:00.000000Z',
        'created_at': '2026-09-20T11:00:00.000000Z',
      },
      {
        'id': 'req-003',
        'request_reference': 'PR-2026-0003',
        'booking_center_id': 'bc-001',
        'booking_package_id': 'pkg-100',
        'package_name': 'باقة 100 حجز',
        'package_code': 'PKG_100',
        'quota_units': 100,
        'price_dzd': 15000.0,
        'status': 'rejected',
        'rejection_reason': 'وصل التحويل غير واضح',
        'created_at': '2026-09-19T09:00:00.000000Z',
      },
    ]
  };

  final mockTransactionsPayload = {
    'data': [
      {
        'id': 'tx-001',
        'booking_center_id': 'bc-001',
        'transaction_type': 'purchase',
        'units': 500,
        'balance_after': 575,
        'reference_note': 'اعتماد طلب شراء الباقة PR-2026-0002',
        'package': {'name': 'باقة 500 حجز', 'package_code': 'PKG_500'},
        'created_at': '2026-09-20T12:00:00.000000Z',
      },
      {
        'id': 'tx-002',
        'booking_center_id': 'bc-001',
        'transaction_type': 'confirmation',
        'units': -1,
        'balance_after': 574,
        'reference_note': 'خصم حصة تأكيد الموعد BK-9988',
        'appointment': {'booking_reference': 'BK-9988', 'patient_name': 'Amine'},
        'created_at': '2026-09-20T14:00:00.000000Z',
      },
      {
        'id': 'tx-003',
        'booking_center_id': 'bc-001',
        'transaction_type': 'refund',
        'units': 1,
        'balance_after': 575,
        'reference_note': 'استرداد حصة الموعد BK-9988 - السبب: إلغاء العيادة',
        'appointment': {'booking_reference': 'BK-9988', 'patient_name': 'Amine'},
        'created_at': '2026-09-20T16:00:00.000000Z',
      },
    ]
  };

  late InMemoryTokenStorage tokenStorage;
  late AuthSessionManager sessionManager;

  setUp(() {
    tokenStorage = InMemoryTokenStorage();
  });

  group('A. Role Resolution & Access Tests', () {
    test('resolves booking_center role to bookingCenter destination', () {
      const resolver = RoleResolver();
      final destination = resolver.resolveProDestination(bcUser);
      expect(destination, RoleResolutionResult.bookingCenter);
    });

    test('doctor role does NOT resolve to bookingCenter destination', () {
      const resolver = RoleResolver();
      final destination = resolver.resolveProDestination(doctorUser);
      expect(destination, isNot(RoleResolutionResult.bookingCenter));
      expect(destination, RoleResolutionResult.doctor);
    });

    test('assistant role does NOT resolve to bookingCenter destination', () {
      const resolver = RoleResolver();
      final destination = resolver.resolveProDestination(assistantUser);
      expect(destination, isNot(RoleResolutionResult.bookingCenter));
      expect(destination, RoleResolutionResult.assistant);
    });

    test('patient role does NOT resolve to bookingCenter destination', () {
      const resolver = RoleResolver();
      final destination = resolver.resolveProDestination(patientUser);
      expect(destination, isNot(RoleResolutionResult.bookingCenter));
      expect(destination, RoleResolutionResult.patient);
    });
  });

  group('B. QuotaBalanceCard Unit & Widget Tests', () {
    testWidgets('renders center name and authoritative numeric quota balance', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          child: const QuotaBalanceCard(
            centerName: 'مركز الجزائر للحجوزات',
            quotaBalance: 75,
            isLoading: false,
          ),
        ),
      );

      expect(find.text('مركز الجزائر للحجوزات'), findsOneWidget);
      expect(find.text('75 الحصص'), findsOneWidget);
      expect(find.byKey(const Key('quota_balance_value')), findsOneWidget);
    });

    testWidgets('zero quota state renders zero balance and warning banner without error', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          child: const QuotaBalanceCard(
            centerName: 'مركز الجزائر للحجوزات',
            quotaBalance: 0,
            isLoading: false,
          ),
        ),
      );

      expect(find.text('0 الحصص'), findsOneWidget);
      expect(find.text('الرصيد الحالي 0 — لا يمكن تأكيد حجوزات جديدة دون شحن باقة.'), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
    });

    testWidgets('triggers refresh and recharge callbacks when tapped', (tester) async {
      bool refreshed = false;
      bool recharged = false;

      await tester.pumpWidget(
        createTestWidget(
          child: QuotaBalanceCard(
            centerName: 'مركز الجزائر للحجوزات',
            quotaBalance: 50,
            isLoading: false,
            onRefresh: () => refreshed = true,
            onRecharge: () => recharged = true,
          ),
        ),
      );

      await tester.tap(find.byKey(const Key('quota_refresh_button')));
      await tester.pump();
      expect(refreshed, isTrue);

      await tester.tap(find.byKey(const Key('recharge_quota_button')));
      await tester.pump();
      expect(recharged, isTrue);
    });
  });

  group('C. BcQuotaScreen Contract & API Integration Tests', () {
    testWidgets('loads and renders authoritative quota, packages, requests, and transactions', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/api/v1/booking-centers/quota-balance')) {
          return jsonResponse(mockQuotaPayload);
        }
        if (request.url.path.contains('/api/v1/booking-packages')) {
          return jsonResponse(mockPackagesPayload);
        }
        if (request.url.path.contains('/api/v1/booking-centers/purchase-requests')) {
          return jsonResponse(mockRequestsPayload);
        }
        if (request.url.path.contains('/api/v1/booking-centers/transactions')) {
          return jsonResponse(mockTransactionsPayload);
        }
        return jsonResponse({'message': 'Not Found'}, 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        createTestWidget(
          child: BcQuotaScreen(
            sessionManager: sessionManager,
            user: bcUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // 1. Quota Balance Verified
      expect(find.text('75 الحصص'), findsOneWidget);
      expect(find.text('مركز الجزائر للحجوزات'), findsOneWidget);

      // 2. Packages Tab Verified
      expect(find.text('باقة 100 حجز'), findsOneWidget);
      expect(find.text('15000 د.ج'), findsOneWidget);
      expect(find.text('باقة 500 حجز'), findsOneWidget);
      expect(find.text('60000 د.ج'), findsOneWidget);

      // 3. Navigate to Purchase Requests Tab
      await tester.tap(find.text('سجل طلبات الشراء'));
      await tester.pumpAndSettle();

      expect(find.text('PR-2026-0001'), findsOneWidget);
      expect(find.text('قيد المراجعة'), findsOneWidget);
      expect(find.text('PR-2026-0002'), findsOneWidget);
      expect(find.text('معتمد'), findsOneWidget);
      expect(find.text('PR-2026-0003'), findsOneWidget);
      expect(find.text('مرفوض'), findsOneWidget);
      expect(find.text('مرفوض: وصل التحويل غير واضح'), findsOneWidget);

      // 4. Navigate to Transactions Tab
      await tester.tap(find.text('سجل العمليات والحصص'));
      await tester.pumpAndSettle();

      expect(find.text('شراء باقة (+)'), findsOneWidget);
      expect(find.text('+500 الحصص'), findsOneWidget);
      expect(find.text('تأكيد موعد (-)'), findsOneWidget);
      expect(find.text('-1 الحصص'), findsOneWidget);
      expect(find.text('استرداد حصة (+)'), findsOneWidget);
      expect(find.text('+1 الحصص'), findsOneWidget);
      expect(find.text('الرصيد بعد العملية: 574'), findsOneWidget);
    });

    testWidgets('zero quota balance displays cleanly without treating as API failure', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/api/v1/booking-centers/quota-balance')) {
          return jsonResponse(mockZeroQuotaPayload);
        }
        if (request.url.path.contains('/api/v1/booking-packages')) {
          return jsonResponse(mockPackagesPayload);
        }
        if (request.url.path.contains('/api/v1/booking-centers/purchase-requests')) {
          return jsonResponse({'data': []});
        }
        if (request.url.path.contains('/api/v1/booking-centers/transactions')) {
          return jsonResponse({'data': []});
        }
        return jsonResponse({'message': 'Not Found'}, 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        createTestWidget(
          child: BcQuotaScreen(
            sessionManager: sessionManager,
            user: bcUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('0 الحصص'), findsOneWidget);
      expect(find.text('الرصيد الحالي 0 — لا يمكن تأكيد حجوزات جديدة دون شحن باقة.'), findsOneWidget);
      expect(find.text('تعذر تحميل'), findsNothing);
    });

    testWidgets('purchase request submission sends POST and refreshes without local quota mutation', (tester) async {
      int quotaFetchCount = 0;
      int requestsFetchCount = 0;
      bool purchasePosted = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/api/v1/booking-centers/quota-balance')) {
          quotaFetchCount++;
          return jsonResponse(mockQuotaPayload);
        }
        if (request.url.path.contains('/api/v1/booking-packages')) {
          return jsonResponse(mockPackagesPayload);
        }
        if (request.url.path.contains('/api/v1/booking-centers/purchase-requests')) {
          if (request.method == 'POST') {
            purchasePosted = true;
            final body = jsonDecode(request.body) as Map<String, dynamic>;
            expect(body['package_id'], 'pkg-100');
            expect(body['payment_method'], 'baridimob');
            expect(body['transaction_reference'], 'TXN-TEST-999');

            return jsonResponse({
              'message': 'تم تقديم طلب شراء الباقة بنجاح وهو قيد المراجعة.',
              'data': {
                'id': 'req-999',
                'request_reference': 'PR-2026-0999',
                'booking_center_id': 'bc-001',
                'booking_package_id': 'pkg-100',
                'package_name': 'باقة 100 حجز',
                'package_code': 'PKG_100',
                'quota_units': 100,
                'price_dzd': 15000.0,
                'payment_method': 'baridimob',
                'status': 'pending',
                'created_at': '2026-09-21T12:00:00.000000Z',
              },
            }, 201);
          } else {
            requestsFetchCount++;
            return jsonResponse(mockRequestsPayload);
          }
        }
        if (request.url.path.contains('/api/v1/booking-centers/transactions')) {
          return jsonResponse(mockTransactionsPayload);
        }
        return jsonResponse({'message': 'Not Found'}, 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        createTestWidget(
          child: BcQuotaScreen(
            sessionManager: sessionManager,
            user: bcUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Open purchase request modal for PKG_100
      await tester.tap(find.byKey(const Key('buy_package_button_PKG_100')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('submit_purchase_request_button')), findsOneWidget);
      expect(find.text('طلب شراء باقة'), findsWidgets);
      expect(find.text('بريدي موب'), findsOneWidget);

      // Enter transaction reference
      await tester.enterText(
        find.byKey(const Key('input_transaction_reference')),
        'TXN-TEST-999',
      );
      await tester.pump();

      // Submit purchase request
      await tester.tap(find.byKey(const Key('submit_purchase_request_button')));
      await tester.pump();
      await tester.pumpAndSettle();

      // Verified: POST was sent with correct payload
      expect(purchasePosted, isTrue);

      // Verified: Success SnackBar shown
      expect(find.text('تم تقديم طلب شراء الباقة بنجاح وهو قيد المراجعة.'), findsOneWidget);

      // Verified: Quota & requests re-fetched from server
      expect(quotaFetchCount, greaterThan(1));
      expect(requestsFetchCount, greaterThan(1));

      // Verified: Quota is NOT optimistically increased to 175, still matches server balance 75
      expect(find.text('75 الحصص'), findsOneWidget);
      expect(find.text('175 الحصص'), findsNothing);
    });

    testWidgets('error state renders retry button and reloads on retry', (tester) async {
      int attempt = 0;
      final mockClient = MockClient((request) async {
        attempt++;
        if (attempt == 1) {
          return jsonResponse({'message': 'Server Unreachable'}, 500);
        }
        return jsonResponse(mockQuotaPayload);
      });

      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        createTestWidget(
          child: BcQuotaScreen(
            sessionManager: sessionManager,
            user: bcUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // First attempt failed
      expect(find.text('إعادة المحاولة'), findsWidgets);

      // Tap retry
      await tester.tap(find.text('إعادة المحاولة').first);
      await tester.pumpAndSettle();

      // Succeeded after retry
      expect(find.text('75 الحصص'), findsOneWidget);
    });
  });

  group('D. BookingCenterShell & DISC-04 Scope Enforcement Tests', () {
    testWidgets('renders shell with quota card, packages navigation tile, and zero staff management UI', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/api/v1/booking-centers/quota-balance')) {
          return jsonResponse(mockQuotaPayload);
        }
        return jsonResponse({'data': []});
      });

      final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
      sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await tester.pumpWidget(
        createTestWidget(
          child: BookingCenterShell(
            user: bcUser,
            sessionManager: sessionManager,
            apiClient: apiClient,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('مركز حجز: مركز الجزائر للحجوزات'), findsOneWidget);
      expect(find.text('75 الحصص'), findsOneWidget);
      expect(find.byKey(const Key('open_quota_dashboard_tile')), findsOneWidget);

      // DISC-04 STRICT NEGATIVE ASSERTIONS
      expect(find.text('إدارة الموظفين'), findsNothing);
      expect(find.text('Staff Management'), findsNothing);
      expect(find.text('Employee Management'), findsNothing);
      expect(find.text('Employees'), findsNothing);
      expect(find.text('إضافة موظف'), findsNothing);
      expect(find.text('Add Staff'), findsNothing);
      expect(find.text('Invite Employee'), findsNothing);
      expect(find.text('صلاحيات الموظفين'), findsNothing);
      expect(find.text('Staff Permissions'), findsNothing);
      expect(find.byKey(const Key('staff_management_button')), findsNothing);
    });
  });

  group('E. Trilingual Localization Tests (AR, EN, FR)', () {
    testWidgets('renders Arabic strings with RTL directionality', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          locale: const Locale('ar'),
          child: QuotaBalanceCard(
            centerName: 'مركز الحجز',
            quotaBalance: 10,
            isLoading: false,
            onRecharge: () {},
          ),
        ),
      );

      expect(find.text('رصيد الحصص'), findsOneWidget);
      expect(find.text('10 الحصص'), findsOneWidget);
      expect(find.text('طلب شراء باقة'), findsOneWidget);
    });

    testWidgets('renders English strings correctly', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          locale: const Locale('en'),
          child: QuotaBalanceCard(
            centerName: 'Central Booking',
            quotaBalance: 10,
            isLoading: false,
            onRecharge: () {},
          ),
        ),
      );

      expect(find.text('Quota Balance'), findsOneWidget);
      expect(find.text('10 Units'), findsOneWidget);
      expect(find.text('Purchase Request'), findsOneWidget);
    });

    testWidgets('renders French strings correctly', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          locale: const Locale('fr'),
          child: QuotaBalanceCard(
            centerName: 'Centre de Réservation',
            quotaBalance: 10,
            isLoading: false,
            onRecharge: () {},
          ),
        ),
      );

      expect(find.text('Solde de quota'), findsOneWidget);
      expect(find.text('10 Unités'), findsOneWidget);
      expect(find.text("Demande d'achat"), findsOneWidget);
    });
  });
}

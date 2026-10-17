import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_core/models/patient_share_token.dart';
import 'package:aafiya_patient/screens/patient_shared_records_screen.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';
import 'package:aafiya_patient/widgets/patient_share_record_dialog.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const jsonHeaders = {'content-type': 'application/json; charset=utf-8'};

  final mockCreateResponse = {
    'message': 'تم إنشاء رابط المشاركة الآمن والمشفر بنجاح.',
    'data': {
      'id': 'share-uuid-001',
      'token': 'pst_mockSecretToken1234567890abcdef',
      'scope': 'all_emr',
      'duration': '24h',
      'expires_at': '2026-10-17T10:00:00.000Z',
      'share_url': 'http://localhost:3000/records/view#token=pst_mockSecretToken1234567890abcdef',
      'has_pin': true,
      'status': 'active',
    }
  };

  final mockListResponse = {
    'data': [
      {
        'id': 'share-uuid-001',
        'scope': 'all_emr',
        'status': 'active',
        'failed_attempts': 0,
        'access_count': 3,
        'last_accessed_at': '2026-10-16T12:00:00.000Z',
        'expires_at': '2026-10-17T10:00:00.000Z',
        'revoked_at': null,
        'created_at': '2026-10-16T10:00:00.000Z',
      },
      {
        'id': 'share-uuid-002',
        'scope': 'all_emr',
        'status': 'revoked',
        'failed_attempts': 0,
        'access_count': 0,
        'last_accessed_at': null,
        'expires_at': '2026-10-17T10:00:00.000Z',
        'revoked_at': '2026-10-16T11:00:00.000Z',
        'created_at': '2026-10-16T09:00:00.000Z',
      },
    ]
  };

  final mockRevokeResponse = {
    'message': 'تم إلغاء رابط المشاركة بنجاح وإيقاف صلاحية الوصول فورياً.',
    'data': {
      'id': 'share-uuid-001',
      'scope': 'all_emr',
      'status': 'revoked',
      'revoked_at': '2026-10-16T13:00:00.000Z',
      'expires_at': '2026-10-17T10:00:00.000Z',
    }
  };

  Widget buildTestApp({
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

  group('PatientShareRecordDialog Widget Tests', () {
    testWidgets('renders creation dialog in Arabic with RTL layout', (tester) async {
      final mockClient = MockClient((_) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: PatientShareRecordDialog(apiClient: apiClient),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('مشاركة السجل الطبي المشفر'), findsOneWidget);
      expect(find.text('مدة صلاحية الرابط'), findsOneWidget);
      expect(find.text('24 ساعة (يوم واحد)'), findsOneWidget);
      expect(find.text('7 أيام (أسبوع)'), findsOneWidget);
      expect(find.text('30 يوماً (شهر)'), findsOneWidget);
      expect(find.text('إنشاء رابط المشاركة المشفر'), findsOneWidget);

      final directionality = Directionality.of(tester.element(find.text('مشاركة السجل الطبي المشفر')));
      expect(directionality, equals(TextDirection.rtl));
    });

    testWidgets('validates PIN length locally before network call', (tester) async {
      bool networkCalled = false;
      final mockClient = MockClient((_) async {
        networkCalled = true;
        return http.Response('{}', 200);
      });
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      await tester.pumpWidget(
        buildTestApp(
          child: PatientShareRecordDialog(apiClient: apiClient),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      // Enter short PIN (2 digits)
      final pinField = find.byType(TextFormField);
      await tester.enterText(pinField, '12');

      // Tap generate button
      await tester.tap(find.text('إنشاء رابط المشاركة المشفر'));
      await tester.pumpAndSettle();

      // Expect validation error
      expect(find.text('يجب أن يتكون رمز الحماية من 4 إلى 8 أرقام'), findsOneWidget);
      expect(networkCalled, isFalse);
    });

    testWidgets('successfully creates share and displays one-time credentials with copy buttons', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode(mockCreateResponse), 201, headers: jsonHeaders);
      });
      final tokenStorage = InMemoryTokenStorage('sanctum-test-token');
      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
        config: AppConfig.devLocal,
      );

      PatientShareToken? createdShare;

      await tester.pumpWidget(
        buildTestApp(
          child: PatientShareRecordDialog(
            apiClient: apiClient,
            onShareCreated: (share) => createdShare = share,
          ),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      // Enter valid 4-digit PIN
      final pinField = find.byType(TextFormField);
      await tester.enterText(pinField, '4821');

      // Tap generate button
      await tester.tap(find.text('إنشاء رابط المشاركة المشفر'));
      await tester.pumpAndSettle();

      // Verify success screen
      expect(find.text('تم إنشاء رابط المشاركة الآمن بنجاح'), findsOneWidget);
      expect(find.textContaining('تنبيه أمني هام'), findsOneWidget);
      expect(find.textContaining('/records/view#token=pst_'), findsOneWidget);
      expect(find.text('4821'), findsOneWidget);
      expect(createdShare, isNotNull);
      expect(createdShare!.id, equals('share-uuid-001'));
    });
  });

  group('PatientSharedRecordsScreen Widget Tests', () {
    testWidgets('renders empty state when no shares exist', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'data': []}), 200, headers: jsonHeaders);
      });
      final tokenStorage = InMemoryTokenStorage('sanctum-test-token');
      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
        config: AppConfig.devLocal,
      );

      await tester.pumpWidget(
        buildTestApp(
          child: PatientSharedRecordsScreen(apiClient: apiClient),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('المشاركات النشطة والسابقة'), findsOneWidget);
      expect(find.textContaining('لا توجد مشاركات نشطة حالياً'), findsOneWidget);
      expect(find.text('مشاركة جديدة'), findsWidgets);
    });

    testWidgets('renders list of shares with status badges and access count', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode(mockListResponse), 200, headers: jsonHeaders);
      });
      final tokenStorage = InMemoryTokenStorage('sanctum-test-token');
      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
        config: AppConfig.devLocal,
      );

      await tester.pumpWidget(
        buildTestApp(
          child: PatientSharedRecordsScreen(apiClient: apiClient),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('نشطة'), findsOneWidget);
      expect(find.text('ملغي'), findsOneWidget);
      expect(find.text('3'), findsOneWidget); // Access count
      expect(find.text('إلغاء المشاركة'), findsOneWidget);
    });

    testWidgets('confirms and revokes an active share immediately', (tester) async {
      bool deleteCalled = false;
      final mockClient = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(jsonEncode(mockListResponse), 200, headers: jsonHeaders);
        }
        if (request.method == 'DELETE') {
          deleteCalled = true;
          return http.Response(jsonEncode(mockRevokeResponse), 200, headers: jsonHeaders);
        }
        return http.Response('{}', 404);
      });
      final tokenStorage = InMemoryTokenStorage('sanctum-test-token');
      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
        config: AppConfig.devLocal,
      );

      await tester.pumpWidget(
        buildTestApp(
          child: PatientSharedRecordsScreen(apiClient: apiClient),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      // Tap revoke on the active share
      await tester.tap(find.text('إلغاء المشاركة'));
      await tester.pumpAndSettle();

      // Verify confirmation dialog
      expect(find.text('تأكيد إلغاء المشاركة'), findsOneWidget);
      expect(find.textContaining('هل أنت متأكد من رغبتك في إبطال رابط المشاركة هذا؟'), findsOneWidget);

      // Confirm revocation
      await tester.tap(find.widgetWithText(ElevatedButton, 'إلغاء المشاركة'));
      await tester.pumpAndSettle();

      expect(deleteCalled, isTrue);
      expect(find.text('تم إلغاء رابط المشاركة بنجاح'), findsOneWidget);
      // Status badge updated to revoked
      expect(find.text('ملغي'), findsNWidgets(2));
    });
  });

  group('PatientHomeShell Medical Records Tab Hub Integration', () {
    testWidgets('renders Sender and Recipient cards in Medical Records tab', (tester) async {
      final mockClient = MockClient((_) async => http.Response('{"data":[]}', 200, headers: jsonHeaders));
      final apiClient = ApiClient(httpClient: mockClient, config: AppConfig.devLocal);

      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage(),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        user: const User(
          id: 'user-pat-01',
          name: 'فاطمة بن علي',
          email: 'fatima@test.dz',
          phone: '+213555123456',
          roles: [UserRole.patient],
        ),
        token: 'mock-session-token',
      );

      await tester.pumpWidget(
        buildTestApp(
          child: PatientHomeShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            onSignOut: () {},
          ),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      // Navigate to Tab 2: Medical Records Hub via bottom navigation bar
      await tester.tap(find.byIcon(Icons.folder_shared_outlined));
      await tester.pumpAndSettle();

      // Verify Sender card is present
      expect(find.text('مشاركة السجل الطبي المشفر'), findsOneWidget);
      expect(find.text('إنشاء روابط آمنة وإدارة الروابط النشطة'), findsOneWidget);

      // Verify Recipient card is present
      expect(find.text('استعراض سجل مشارك'), findsOneWidget);
      expect(find.text('فك تشفير واستعراض سجل طبي عبر رمز الحماية'), findsOneWidget);

      // Tap Recipient card: opens SharedRecordViewerSheet with empty initialToken
      await tester.ensureVisible(find.text('استعراض سجل مشارك'));
      await tester.tap(find.text('استعراض سجل مشارك'));
      await tester.pumpAndSettle();

      expect(find.byType(SharedRecordViewerSheet), findsOneWidget);
      expect(find.text('رمز أو رابط المشاركة'), findsOneWidget);
      expect(find.text('رمز الحماية PIN'), findsOneWidget);
    });
  });
}

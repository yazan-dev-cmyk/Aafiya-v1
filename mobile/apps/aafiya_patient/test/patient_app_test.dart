import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_patient/app.dart';
import 'package:aafiya_patient/main.dart';

void main() {
  group('AafiyaPatientApp Tests', () {
    late InMemoryTokenStorage tokenStorage;
    late ApiClient apiClient;
    late AuthSessionManager sessionManager;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
      apiClient = ApiClient(tokenStorage: tokenStorage);
      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
    });

    testWidgets('initializes in splash state and displays brand title', (tester) async {
      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.splash,
        ),
      );

      expect(find.text('عافية'), findsOneWidget);
      expect(find.text('بوابتك إلى العافية'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 700));
    });

    testWidgets('displays auth shell with email, password fields and sign in button', (tester) async {
      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.auth,
        ),
      );

      expect(find.text('تسجيل الدخول'), findsWidgets);
      expect(find.text('البريد الإلكتروني'), findsOneWidget);
      expect(find.text('كلمة المرور'), findsOneWidget);
    });

    testWidgets('renders patient home shell with DISC-01 notice and NO direct booking button', (tester) async {
      const patientUser = User(
        id: 'patient-42',
        name: 'Ahmed Benali',
        email: 'ahmed@example.dz',
        roles: [UserRole.patient],
      );

      await sessionManager.setAuthenticatedUser(
        token: 'valid_mock_token',
        user: patientUser,
      );

      await tester.pumpWidget(
        AafiyaPatientApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: PatientNavState.home,
        ),
      );

      // Verify user identity is displayed
      expect(find.text('Ahmed Benali'), findsOneWidget);
      expect(find.text('ahmed@example.dz'), findsOneWidget);

      // Verify DISC-01 Notice is present
      expect(find.text('يتم حجز المواعيد حصرياً عبر مراكز الحجز المعتمدة.'), findsOneWidget);

      // Verify NO direct booking button exists
      expect(find.text('احجز موعد'), findsNothing);
      expect(find.text('حجز جديد'), findsNothing);
      expect(find.text('Book Appointment'), findsNothing);
      expect(find.byKey(const Key('book_appointment_button')), findsNothing);
    });

    group('Session Expiration & Stack Teardown (TASK-06-02)', () {
      testWidgets('runtime session expiration tears down pushed screens, routes to auth shell, and shows localized modal', (tester) async {
        const patientUser = User(
          id: 'patient-42',
          name: 'Ahmed Benali',
          email: 'ahmed@example.dz',
          roles: [UserRole.patient],
        );

        await sessionManager.setAuthenticatedUser(
          token: 'valid_mock_token',
          user: patientUser,
        );

        final navKey = GlobalKey<NavigatorState>();

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: sessionManager,
            apiClient: apiClient,
            navigatorKey: navKey,
            initialNavState: PatientNavState.home,
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Ahmed Benali'), findsOneWidget);

        // Push a sub-screen onto the navigator stack
        navKey.currentState!.push(
          MaterialPageRoute<void>(
            builder: (_) => const Scaffold(
              body: Text('Sensitive Patient Sub-Route'),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Sensitive Patient Sub-Route'), findsOneWidget);

        // Trigger runtime 401 session expiration
        sessionManager.handleUnauthorized();
        await tester.pump(); // Start invalidation
        await tester.pumpAndSettle(); // Run teardown, postFrameCallback dialog

        // Verify pushed route is completely evicted from active tree
        expect(find.text('Sensitive Patient Sub-Route'), findsNothing);

        // Verify session expired modal is displayed with localized strings
        expect(find.text('انتهت الجلسة'), findsOneWidget);
        expect(find.text('انتهت جلستك. يرجى تسجيل الدخول مجدداً للمتابعة.'), findsOneWidget);
        expect(find.text('تسجيل الدخول مجدداً'), findsOneWidget);

        // Dismiss the modal
        await tester.tap(find.text('تسجيل الدخول مجدداً'));
        await tester.pumpAndSettle();

        // Verify user is now on PatientAuthShell
        expect(find.text('تسجيل الدخول'), findsWidgets);
        expect(find.text('البريد الإلكتروني'), findsOneWidget);
        expect(find.text('Sensitive Patient Sub-Route'), findsNothing);
      });

      testWidgets('session expiration disposes in-flight form state (PHI isolation)', (tester) async {
        const patientUser = User(
          id: 'patient-99',
          name: 'Samir Patient',
          email: 'samir@example.dz',
          roles: [UserRole.patient],
        );

        await sessionManager.setAuthenticatedUser(
          token: 'valid_mock_token',
          user: patientUser,
        );

        final navKey = GlobalKey<NavigatorState>();

        await tester.pumpWidget(
          AafiyaPatientApp(
            sessionManager: sessionManager,
            apiClient: apiClient,
            navigatorKey: navKey,
            initialNavState: PatientNavState.home,
          ),
        );
        await tester.pumpAndSettle();

        // Push a form with sensitive text input
        final testController = TextEditingController(text: 'Confidential Diagnosis Note');
        navKey.currentState!.push(
          MaterialPageRoute<void>(
            builder: (_) => Scaffold(
              body: TextField(controller: testController),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Confidential Diagnosis Note'), findsOneWidget);

        // Trigger session expiration
        sessionManager.handleUnauthorized();
        await tester.pumpAndSettle();

        // Confidential note must no longer be in widget tree
        expect(find.text('Confidential Diagnosis Note'), findsNothing);
        expect(find.text('انتهت الجلسة'), findsOneWidget);
      });
    });

    group('resolveAppConfig', () {
      test('resolves devAndroidEmulator on Android non-web', () {
        final config = resolveAppConfig(platform: TargetPlatform.android, isWeb: false);
        expect(config, equals(AppConfig.devAndroidEmulator));
        expect(config.apiBaseUrl, equals('http://10.0.2.2:8000/api/v1'));
      });

      test('resolves devLocal on non-Android platforms', () {
        final iosConfig = resolveAppConfig(platform: TargetPlatform.iOS, isWeb: false);
        expect(iosConfig, equals(AppConfig.devLocal));
        expect(iosConfig.apiBaseUrl, equals('http://localhost:8000/api/v1'));

        final linuxConfig = resolveAppConfig(platform: TargetPlatform.linux, isWeb: false);
        expect(linuxConfig, equals(AppConfig.devLocal));
        expect(linuxConfig.apiBaseUrl, equals('http://localhost:8000/api/v1'));
      });

      test('resolves devLocal on web even if target platform is Android', () {
        final webConfig = resolveAppConfig(platform: TargetPlatform.android, isWeb: true);
        expect(webConfig, equals(AppConfig.devLocal));
        expect(webConfig.apiBaseUrl, equals('http://localhost:8000/api/v1'));
      });
    });
  });
}


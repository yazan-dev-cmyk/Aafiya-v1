import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_pro/app.dart';

void main() {
  group('AafiyaProApp Tests', () {
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

    testWidgets('initializes in splash state and displays Pro brand title', (tester) async {
      await tester.pumpWidget(
        AafiyaProApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: ProNavState.splash,
        ),
      );

      expect(find.text('عافية للمهنيين'), findsOneWidget);
      expect(find.text('بوابتك إلى العافية'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 700));
    });

    testWidgets('resolves Doctor role to DoctorShell', (tester) async {
      const doctorUser = User(
        id: 'doc-1',
        name: 'Dr. Fatima',
        email: 'fatima@example.dz',
        roles: [UserRole.doctor],
      );

      await sessionManager.setAuthenticatedUser(
        token: 'doctor_mock_token',
        user: doctorUser,
      );

      await tester.pumpWidget(
        AafiyaProApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: ProNavState.roleResolution,
        ),
      );

      expect(find.text('طبيب: Dr. Fatima'), findsOneWidget);
      expect(find.text('لوحة تحكم الطبيب'), findsWidgets);
    });

    testWidgets('resolves Assistant role to AssistantShell', (tester) async {
      const assistantUser = User(
        id: 'asst-1',
        name: 'Sami Assistant',
        email: 'sami@example.dz',
        roles: [UserRole.assistant],
      );

      await sessionManager.setAuthenticatedUser(
        token: 'asst_mock_token',
        user: assistantUser,
      );

      await tester.pumpWidget(
        AafiyaProApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: ProNavState.roleResolution,
        ),
      );

      expect(find.text('مساعد عيادة: Sami Assistant'), findsOneWidget);
      expect(find.text('لوحة تحكم المساعد'), findsOneWidget);
    });

    testWidgets('resolves Booking Center role and enforces NO staff management UI', (tester) async {
      const bookingCenterUser = User(
        id: 'bc-1',
        name: 'Central Booking Algiers',
        email: 'booking@example.dz',
        roles: [UserRole.bookingCenter],
      );

      await sessionManager.setAuthenticatedUser(
        token: 'bc_mock_token',
        user: bookingCenterUser,
      );

      await tester.pumpWidget(
        AafiyaProApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: ProNavState.roleResolution,
        ),
      );

      expect(find.text('مركز حجز: Central Booking Algiers'), findsOneWidget);
      expect(find.text('رصيد الحصص: --'), findsOneWidget);

      // Verify NO Employee / Staff Management UI exists
      expect(find.text('إدارة الموظفين'), findsNothing);
      expect(find.text('Staff Management'), findsNothing);
      expect(find.text('Employee Management'), findsNothing);
      expect(find.text('إضافة موظف'), findsNothing);
      expect(find.text('Add Staff'), findsNothing);
      expect(find.byKey(const Key('staff_management_button')), findsNothing);
    });

    testWidgets('rejects Patient role in Pro app with unauthorized feedback', (tester) async {
      const patientUser = User(
        id: 'pat-99',
        name: 'Patient Unauthorized',
        email: 'patient@example.dz',
        roles: [UserRole.patient],
      );

      await sessionManager.setAuthenticatedUser(
        token: 'pat_mock_token',
        user: patientUser,
      );

      await tester.pumpWidget(
        AafiyaProApp(
          sessionManager: sessionManager,
          apiClient: apiClient,
          initialNavState: ProNavState.roleResolution,
        ),
      );

      expect(find.text('الحساب الحالي غير مصرح له بالدخول إلى هذا التطبيق.'), findsOneWidget);
    });

    group('Session Expiration & Stack Teardown (TASK-06-02)', () {
      testWidgets('runtime session expiration in Doctor shell tears down stack, routes to ProAuthShell, and shows modal', (tester) async {
        const doctorUser = User(
          id: 'doc-1',
          name: 'Dr. Fatima',
          email: 'fatima@example.dz',
          roles: [UserRole.doctor],
        );

        await sessionManager.setAuthenticatedUser(
          token: 'doctor_mock_token',
          user: doctorUser,
        );

        final navKey = GlobalKey<NavigatorState>();

        await tester.pumpWidget(
          AafiyaProApp(
            sessionManager: sessionManager,
            apiClient: apiClient,
            navigatorKey: navKey,
            initialNavState: ProNavState.roleResolution,
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('طبيب: Dr. Fatima'), findsOneWidget);

        // Push a sensitive clinical consultation sub-route
        navKey.currentState!.push(
          MaterialPageRoute<void>(
            builder: (_) => const Scaffold(
              body: Text('Sensitive Clinical Consultation Route'),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Sensitive Clinical Consultation Route'), findsOneWidget);

        // Trigger runtime 401 session expiration
        sessionManager.handleUnauthorized();
        await tester.pump();
        await tester.pumpAndSettle();

        // Stack teardown: sensitive sub-route evicted
        expect(find.text('Sensitive Clinical Consultation Route'), findsNothing);

        // Session expired modal is displayed with localized Arabic strings
        expect(find.text('انتهت الجلسة'), findsOneWidget);
        expect(find.text('انتهت جلستك. يرجى تسجيل الدخول مجدداً للمتابعة.'), findsOneWidget);
        expect(find.text('تسجيل الدخول مجدداً'), findsOneWidget);

        // Dismiss modal
        await tester.tap(find.text('تسجيل الدخول مجدداً'));
        await tester.pumpAndSettle();

        // Now on ProAuthShell
        expect(find.text('تسجيل الدخول'), findsWidgets);
        expect(find.text('البريد الإلكتروني'), findsOneWidget);
        expect(find.text('Sensitive Clinical Consultation Route'), findsNothing);
      });

      testWidgets('runtime session expiration in Assistant shell tears down stack, routes to ProAuthShell, and shows modal', (tester) async {
        const assistantUser = User(
          id: 'asst-1',
          name: 'Sami Assistant',
          email: 'sami@example.dz',
          roles: [UserRole.assistant],
        );

        await sessionManager.setAuthenticatedUser(
          token: 'asst_mock_token',
          user: assistantUser,
        );

        final navKey = GlobalKey<NavigatorState>();

        await tester.pumpWidget(
          AafiyaProApp(
            sessionManager: sessionManager,
            apiClient: apiClient,
            navigatorKey: navKey,
            initialNavState: ProNavState.roleResolution,
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('مساعد عيادة: Sami Assistant'), findsOneWidget);

        // Push an assistant triage sub-route
        navKey.currentState!.push(
          MaterialPageRoute<void>(
            builder: (_) => const Scaffold(
              body: Text('Assistant Patient Triage Sub-Route'),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Assistant Patient Triage Sub-Route'), findsOneWidget);

        // Trigger runtime 401 session expiration
        sessionManager.handleUnauthorized();
        await tester.pump();
        await tester.pumpAndSettle();

        // Sub-route evicted
        expect(find.text('Assistant Patient Triage Sub-Route'), findsNothing);
        expect(find.text('انتهت الجلسة'), findsOneWidget);

        // Dismiss modal
        await tester.tap(find.text('تسجيل الدخول مجدداً'));
        await tester.pumpAndSettle();

        // On ProAuthShell
        expect(find.text('تسجيل الدخول'), findsWidgets);
        expect(find.text('Assistant Patient Triage Sub-Route'), findsNothing);
      });

      testWidgets('runtime session expiration in Booking Center shell tears down stack, routes to ProAuthShell, and shows modal', (tester) async {
        const bookingCenterUser = User(
          id: 'bc-1',
          name: 'Central Booking Algiers',
          email: 'booking@example.dz',
          roles: [UserRole.bookingCenter],
        );

        await sessionManager.setAuthenticatedUser(
          token: 'bc_mock_token',
          user: bookingCenterUser,
        );

        final navKey = GlobalKey<NavigatorState>();

        await tester.pumpWidget(
          AafiyaProApp(
            sessionManager: sessionManager,
            apiClient: apiClient,
            navigatorKey: navKey,
            initialNavState: ProNavState.roleResolution,
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('مركز حجز: Central Booking Algiers'), findsOneWidget);

        // Push a booking management sub-route
        navKey.currentState!.push(
          MaterialPageRoute<void>(
            builder: (_) => const Scaffold(
              body: Text('Booking Quota Allocation Sub-Route'),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Booking Quota Allocation Sub-Route'), findsOneWidget);

        // Trigger runtime 401 session expiration
        sessionManager.handleUnauthorized();
        await tester.pump();
        await tester.pumpAndSettle();

        // Sub-route evicted
        expect(find.text('Booking Quota Allocation Sub-Route'), findsNothing);
        expect(find.text('انتهت الجلسة'), findsOneWidget);

        // Dismiss modal
        await tester.tap(find.text('تسجيل الدخول مجدداً'));
        await tester.pumpAndSettle();

        // On ProAuthShell
        expect(find.text('تسجيل الدخول'), findsWidgets);
        expect(find.text('Booking Quota Allocation Sub-Route'), findsNothing);
      });

      testWidgets('session expiration disposes in-flight Pro form state (PHI isolation)', (tester) async {
        const doctorUser = User(
          id: 'doc-1',
          name: 'Dr. Fatima',
          email: 'fatima@example.dz',
          roles: [UserRole.doctor],
        );

        await sessionManager.setAuthenticatedUser(
          token: 'doctor_mock_token',
          user: doctorUser,
        );

        final navKey = GlobalKey<NavigatorState>();

        await tester.pumpWidget(
          AafiyaProApp(
            sessionManager: sessionManager,
            apiClient: apiClient,
            navigatorKey: navKey,
            initialNavState: ProNavState.roleResolution,
          ),
        );
        await tester.pumpAndSettle();

        // Push a clinical notes form with sensitive text input
        final testController = TextEditingController(text: 'Confidential Patient Diagnostic Findings');
        navKey.currentState!.push(
          MaterialPageRoute<void>(
            builder: (_) => Scaffold(
              body: TextField(controller: testController),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Confidential Patient Diagnostic Findings'), findsOneWidget);

        // Trigger session expiration
        sessionManager.handleUnauthorized();
        await tester.pumpAndSettle();

        // Confidential text must be completely evicted from widget tree
        expect(find.text('Confidential Patient Diagnostic Findings'), findsNothing);
        expect(find.text('انتهت الجلسة'), findsOneWidget);
      });
    });
  });
}

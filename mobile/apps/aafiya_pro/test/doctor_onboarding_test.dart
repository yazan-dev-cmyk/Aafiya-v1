// ignore_for_file: depend_on_referenced_packages

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/widgets/doctor_onboarding_dialog.dart';
import 'package:aafiya_pro/widgets/doctor_onboarding_session.dart';
import 'package:aafiya_pro/widgets/doctor_setup_reminder_banner.dart';

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
    home: Scaffold(body: child),
  );
}

void main() {
  group('DoctorOnboardingSession — Scoped In-Memory Deferral Tests', () {
    setUp(() {
      DoctorOnboardingSession.instance.clear();
    });

    test('isDeferred is false initially', () {
      expect(
        DoctorOnboardingSession.instance.isDeferred(
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
        ),
        isFalse,
      );
    });

    test('defer scopes exclusively by clinicId AND doctorId', () {
      DoctorOnboardingSession.instance.defer(
        clinicId: 'clinic-1',
        doctorId: 'doc-1',
      );

      // Same clinic and doctor -> true
      expect(
        DoctorOnboardingSession.instance.isDeferred(
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
        ),
        isTrue,
      );

      // Different clinic -> false
      expect(
        DoctorOnboardingSession.instance.isDeferred(
          clinicId: 'clinic-2',
          doctorId: 'doc-1',
        ),
        isFalse,
      );

      // Different doctor -> false
      expect(
        DoctorOnboardingSession.instance.isDeferred(
          clinicId: 'clinic-1',
          doctorId: 'doc-2',
        ),
        isFalse,
      );
    });

    test('clear resets all deferred records', () {
      DoctorOnboardingSession.instance.defer(
        clinicId: 'clinic-1',
        doctorId: 'doc-1',
      );
      DoctorOnboardingSession.instance.clear();

      expect(
        DoctorOnboardingSession.instance.isDeferred(
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
        ),
        isFalse,
      );
    });
  });

  group('DoctorSetupReminderBanner — Widget Tests', () {
    testWidgets('1. Director: Renders amber warning when clinic hours unconfigured', (tester) async {
      bool configureClinicTapped = false;
      bool refreshTapped = false;

      await tester.pumpWidget(
        createTestApp(
          child: DoctorSetupReminderBanner(
            isDirector: true,
            isClinicConfigured: false,
            isScheduleActivated: false,
            onConfigureClinic: () => configureClinicTapped = true,
            onConfigureDoctorSchedule: () {},
            onRefresh: () => refreshTapped = true,
          ),
        ),
      );

      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
      expect(find.text('الخطوة 1: ساعات تشغيل العيادة العامة'), findsOneWidget);

      await tester.tap(find.text('تهيئة ساعات العيادة'));
      expect(configureClinicTapped, isTrue);

      await tester.tap(find.byIcon(Icons.refresh_rounded));
      expect(refreshTapped, isTrue);
    });

    testWidgets('2. Employed Doctor: Renders waiting notice without editing controls when clinic hours unconfigured', (tester) async {
      await tester.pumpWidget(
        createTestApp(
          child: DoctorSetupReminderBanner(
            isDirector: false,
            isClinicConfigured: false,
            isScheduleActivated: false,
            onConfigureClinic: () {},
            onConfigureDoctorSchedule: () {},
            onRefresh: () {},
          ),
        ),
      );

      expect(find.byIcon(Icons.hourglass_empty_rounded), findsOneWidget);
      expect(find.text('بانتظار تهيئة ساعات العيادة العامة'), findsOneWidget);
      // Ensure clinic editing button is NOT displayed to unauthorized doctor
      expect(find.text('تهيئة ساعات العيادة'), findsNothing);
    });

    testWidgets('3. Doctor Schedule Incomplete: Renders primary blue activation banner', (tester) async {
      bool configureScheduleTapped = false;

      await tester.pumpWidget(
        createTestApp(
          child: DoctorSetupReminderBanner(
            isDirector: false,
            isClinicConfigured: true,
            isScheduleActivated: false,
            onConfigureClinic: () {},
            onConfigureDoctorSchedule: () => configureScheduleTapped = true,
            onRefresh: () {},
          ),
        ),
      );

      expect(find.byIcon(Icons.schedule_rounded), findsOneWidget);
      expect(find.text('إعداد وتفعيل الجدول'), findsOneWidget);

      await tester.tap(find.text('إعداد وتفعيل الجدول'));
      expect(configureScheduleTapped, isTrue);
    });

    testWidgets('4. Setup Complete: Hides completely when both configured and activated', (tester) async {
      await tester.pumpWidget(
        createTestApp(
          child: DoctorSetupReminderBanner(
            isDirector: true,
            isClinicConfigured: true,
            isScheduleActivated: true,
            onConfigureClinic: () {},
            onConfigureDoctorSchedule: () {},
            onRefresh: () {},
          ),
        ),
      );

      expect(find.byType(Container), findsNothing);
    });

    testWidgets('5. Error: Displays error banner with retry button', (tester) async {
      bool refreshTapped = false;

      await tester.pumpWidget(
        createTestApp(
          child: DoctorSetupReminderBanner(
            isDirector: true,
            isClinicConfigured: null,
            isScheduleActivated: null,
            errorMessage: 'Network timeout',
            onConfigureClinic: () {},
            onConfigureDoctorSchedule: () {},
            onRefresh: () => refreshTapped = true,
          ),
        ),
      );

      expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
      expect(find.text('تعذر التحقق من حالة ساعات العمل. انقر لإعادة المحاولة.'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.refresh_rounded));
      expect(refreshTapped, isTrue);
    });
  });

  group('DoctorOnboardingDialog — Widget Tests', () {
    testWidgets('1. Director: Renders 2-step stepper and calls onConfigureClinic', (tester) async {
      bool configureClinicCalled = false;
      bool laterCalled = false;

      await tester.pumpWidget(
        createTestApp(
          child: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                DoctorOnboardingDialog.show(
                  context,
                  isDirector: true,
                  clinicName: 'عيادة النور',
                  isClinicConfigured: false,
                  isScheduleActivated: false,
                  onConfigureClinic: () => configureClinicCalled = true,
                  onConfigureDoctorSchedule: () {},
                  onLater: () => laterCalled = true,
                );
              },
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('الإعداد والتهيئة التشغيلية'), findsOneWidget);
      expect(find.text('تهيئة المنشأة وتفعيل جدول العمل'), findsOneWidget);
      expect(find.text('• عيادة النور'), findsOneWidget);
      expect(find.text('الخطوة 1: ساعات تشغيل العيادة العامة'), findsNWidgets(2)); // Stepper & Context card
      expect(find.text('الخطوة 2: جدول عمل الطبيب الأسبوعي'), findsOneWidget);

      await tester.tap(find.text('تهيئة ساعات العيادة'));
      await tester.pumpAndSettle();

      expect(configureClinicCalled, isTrue);
      expect(laterCalled, isFalse);
    });

    testWidgets('2. Later button invokes onLater and closes dialog', (tester) async {
      bool laterCalled = false;

      await tester.pumpWidget(
        createTestApp(
          child: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                DoctorOnboardingDialog.show(
                  context,
                  isDirector: true,
                  clinicName: 'عيادة النور',
                  isClinicConfigured: false,
                  isScheduleActivated: false,
                  onConfigureClinic: () {},
                  onConfigureDoctorSchedule: () {},
                  onLater: () => laterCalled = true,
                );
              },
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('لاحقاً'));
      await tester.pumpAndSettle();

      expect(laterCalled, isTrue);
      expect(find.byType(DoctorOnboardingDialog), findsNothing);
    });

    testWidgets('3. Employed Doctor: Displays waiting explanation when clinic unconfigured', (tester) async {
      bool laterCalled = false;

      await tester.pumpWidget(
        createTestApp(
          child: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                DoctorOnboardingDialog.show(
                  context,
                  isDirector: false,
                  clinicName: 'عيادة النور',
                  isClinicConfigured: false,
                  isScheduleActivated: false,
                  onConfigureClinic: () {},
                  onConfigureDoctorSchedule: () {},
                  onLater: () => laterCalled = true,
                );
              },
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('بانتظار تهيئة ساعات العيادة العامة'), findsOneWidget);
      expect(find.text('حسناً، فهمت'), findsOneWidget);

      await tester.tap(find.text('حسناً، فهمت'));
      await tester.pumpAndSettle();

      expect(laterCalled, isTrue);
      expect(find.byType(DoctorOnboardingDialog), findsNothing);
    });
  });
}

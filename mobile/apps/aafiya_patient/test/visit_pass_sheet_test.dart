import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/screens/appointment_detail_screen.dart';
import 'package:aafiya_patient/widgets/visit_pass_sheet.dart';
import 'package:qr_flutter/qr_flutter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Appointment createTestAppointment({
    String id = 'appt-101',
    String bookingReference = 'BK-998877',
    String? secureToken = 'sec_tok_alpha_numeric_64_character_hash_value_1234567890abcdef',
    AppointmentStatus status = AppointmentStatus.confirmed,
    String doctorName = 'د. كمال عماري',
    String clinicName = 'عيادة النور المركزية',
    String appointmentDate = '2026-10-25',
    String timeSlot = '09:00',
  }) {
    return Appointment(
      id: id,
      bookingReference: bookingReference,
      secureToken: secureToken,
      status: status,
      doctor: AppointmentDoctor(id: 'doc-1', name: doctorName, specialty: 'Cardiology'),
      clinic: AppointmentClinic(id: 'cl-1', name: clinicName, wilaya: '16'),
      patient: const AppointmentPatient(id: 'pat-1', name: 'أحمد بن علي'),
      appointmentDate: appointmentDate,
      timeSlot: timeSlot,
    );
  }

  Widget createTestWidget(Widget child, {Locale locale = const Locale('ar')}) {
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

  group('P-02 VisitPassSheet Unit & Widget Tests', () {
    testWidgets('renders QR code with exact secureToken for confirmed appointment',
        (tester) async {
      const token = 'sec_tok_verified_token_1234567890abcdef';
      final appt = createTestAppointment(
        secureToken: token,
        status: AppointmentStatus.confirmed,
      );

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      // Check header and titles
      expect(find.text('تصريح الزيارة الرقمي'), findsOneWidget);
      expect(find.text('#BK-998877'), findsOneWidget);
      expect(find.text('د. كمال عماري'), findsOneWidget);
      expect(find.text('عيادة النور المركزية'), findsOneWidget);

      // Verify QrImageView exists
      final qrFinder = find.byType(QrImageView);
      expect(qrFinder, findsOneWidget);
      expect(find.byKey(const Key('visit_pass_qr_image')), findsOneWidget);

      expect(find.byKey(const Key('visit_pass_qr_container')), findsOneWidget);
      expect(find.byKey(const Key('visit_pass_missing_token_card')), findsNothing);
      expect(find.byKey(const Key('visit_pass_ineligible_card')), findsNothing);
    });

    testWidgets('renders QR code for pending appointment', (tester) async {
      final appt = createTestAppointment(
        status: AppointmentStatus.pending,
      );

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.byKey(const Key('visit_pass_qr_container')), findsOneWidget);
    });

    testWidgets('displays missing token card and NO QR code when secureToken is null',
        (tester) async {
      final appt = createTestAppointment(secureToken: null);

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('visit_pass_missing_token_card')), findsOneWidget);
      expect(find.text('رمز المرور غير متوفر لهذا الموعد'), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);
      expect(find.byKey(const Key('visit_pass_qr_container')), findsNothing);
    });

    testWidgets('displays missing token card when secureToken is empty string',
        (tester) async {
      final appt = createTestAppointment(secureToken: '   ');

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('visit_pass_missing_token_card')), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);
    });

    testWidgets('displays ineligible card and suppresses QR when appointment is cancelled',
        (tester) async {
      final appt = createTestAppointment(status: AppointmentStatus.cancelled);

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('visit_pass_ineligible_card')), findsOneWidget);
      expect(find.text('هذا الموعد غير مؤهل لتسجيل الحضور'), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);
      expect(find.byKey(const Key('visit_pass_qr_container')), findsNothing);
    });

    testWidgets('displays ineligible card when appointment is expired', (tester) async {
      final appt = createTestAppointment(status: AppointmentStatus.expired);

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('visit_pass_ineligible_card')), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);
    });

    testWidgets('displays ineligible card when appointment is rejected or noShow',
        (tester) async {
      final apptRejected = createTestAppointment(status: AppointmentStatus.rejected);
      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: apptRejected)));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('visit_pass_ineligible_card')), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);

      final apptNoShow = createTestAppointment(status: AppointmentStatus.noShow);
      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: apptNoShow)));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('visit_pass_ineligible_card')), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);
    });

    testWidgets('displays attended status badge when appointment is attended',
        (tester) async {
      final appt = createTestAppointment(status: AppointmentStatus.attended);

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.text('تم تسجيل الحضور مسبقاً'), findsOneWidget);
      expect(find.byType(QrImageView), findsOneWidget);
    });

    testWidgets('copies booking reference to clipboard on tap', (tester) async {
      final appt = createTestAppointment(bookingReference: 'REF-123456');

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      // Tap on booking reference
      await tester.tap(find.text('#REF-123456'));
      await tester.pumpAndSettle();

      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.text('تم نسخ رقم الحجز #REF-123456'), findsOneWidget);
    });

    testWidgets('displays missing token card when secureToken is exact empty string ""',
        (tester) async {
      final appt = createTestAppointment(secureToken: '');

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('visit_pass_missing_token_card')), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);
    });

    testWidgets('renders QR code for rescheduled appointment', (tester) async {
      final appt = createTestAppointment(status: AppointmentStatus.rescheduled);

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.byKey(const Key('visit_pass_qr_container')), findsOneWidget);
      expect(find.byKey(const Key('visit_pass_ineligible_card')), findsNothing);
    });

    testWidgets(
        'renders gracefully when doctor and clinic details are null without crash',
        (tester) async {
      final appt = Appointment(
        id: 'appt-null-fields',
        bookingReference: 'BK-EMPTY',
        secureToken: 'sec_valid_token_test',
        status: AppointmentStatus.confirmed,
        doctor: const AppointmentDoctor(id: 'doc-null', name: null),
        clinic: const AppointmentClinic(id: 'cl-null', name: null),
        patient: const AppointmentPatient(id: 'pat-null', name: null),
        appointmentDate: null,
        timeSlot: null,
      );

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.text('#BK-EMPTY'), findsOneWidget);
      expect(find.text('-'), findsOneWidget);
    });

    testWidgets('dismisses modal sheet when close icon button is tapped', (tester) async {
      final appt = createTestAppointment();

      await tester.pumpWidget(
        createTestWidget(
          Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => VisitPassSheet.show(context, appointment: appt),
              child: const Text('Open Pass'),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Open Pass'));
      await tester.pumpAndSettle();
      expect(find.byType(VisitPassSheet), findsOneWidget);

      await tester.tap(find.byIcon(Icons.close_rounded));
      await tester.pumpAndSettle();
      expect(find.byType(VisitPassSheet), findsNothing);
    });

    testWidgets('dismisses modal sheet when outline close button is tapped',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final appt = createTestAppointment();

      await tester.pumpWidget(
        createTestWidget(
          Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => VisitPassSheet.show(context, appointment: appt),
              child: const Text('Open Pass'),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Open Pass'));
      await tester.pumpAndSettle();
      expect(find.byType(VisitPassSheet), findsOneWidget);

      final closeButtonFinder = find.widgetWithText(AafiyaButton, 'إغلاق');
      expect(closeButtonFinder, findsOneWidget);
      await tester.tap(closeButtonFinder);
      await tester.pumpAndSettle();
      expect(find.byType(VisitPassSheet), findsNothing);
    });

    testWidgets('verifies zero clinical PHI is displayed on the pass sheet',
        (tester) async {
      final appt = createTestAppointment();

      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pumpAndSettle();

      expect(find.textContaining('تشخيص'), findsNothing);
      expect(find.textContaining('مرض'), findsNothing);
      expect(find.textContaining('علاج'), findsNothing);
      expect(find.textContaining('وصفة'), findsNothing);
      expect(find.textContaining('diagnosis'), findsNothing);
    });
  });

  group('P-02 Integration with AppointmentDetailScreen', () {
    testWidgets('renders view_visit_pass_button on AppointmentDetailScreen',
        (tester) async {
      final appt = createTestAppointment();

      await tester.pumpWidget(
        createTestWidget(AppointmentDetailScreen(appointment: appt)),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('view_visit_pass_button')), findsOneWidget);
      expect(find.text('تصريح الزيارة الرقمي (QR)'), findsOneWidget);
    });

    testWidgets('tapping view_visit_pass_button displays VisitPassSheet modal',
        (tester) async {
      final appt = createTestAppointment(
        secureToken: 'sec_integration_token_test_abc',
      );

      await tester.pumpWidget(
        createTestWidget(AppointmentDetailScreen(appointment: appt)),
      );
      await tester.pumpAndSettle();

      // Tap the Visit Pass button
      await tester.tap(find.byKey(const Key('view_visit_pass_button')));
      await tester.pumpAndSettle();

      // Verify sheet opened
      expect(find.byType(VisitPassSheet), findsOneWidget);
      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.byKey(const Key('visit_pass_qr_image')), findsOneWidget);
    });

    testWidgets('renders localized button and sheet in English', (tester) async {
      final appt = createTestAppointment();

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(appointment: appt),
          locale: const Locale('en'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Digital Visit Pass (QR)'), findsOneWidget);

      await tester.tap(find.byKey(const Key('view_visit_pass_button')));
      await tester.pumpAndSettle();

      expect(find.text('Digital Visit Pass'), findsOneWidget);
      expect(find.text('Clinic check-in access code'), findsOneWidget);
      expect(find.text('Single-use validated pass'), findsOneWidget);
      expect(find.widgetWithText(AafiyaButton, 'Close'), findsOneWidget);
    });

    testWidgets('renders localized button and sheet in French', (tester) async {
      final appt = createTestAppointment();

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(appointment: appt),
          locale: const Locale('fr'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Pass de visite digital (QR)'), findsOneWidget);

      await tester.tap(find.byKey(const Key('view_visit_pass_button')));
      await tester.pumpAndSettle();

      expect(find.text('Pass de visite digital'), findsOneWidget);
      expect(find.text('Code d’accès clinique'), findsOneWidget);
      expect(find.widgetWithText(AafiyaButton, 'Fermer'), findsOneWidget);
    });
  });
}

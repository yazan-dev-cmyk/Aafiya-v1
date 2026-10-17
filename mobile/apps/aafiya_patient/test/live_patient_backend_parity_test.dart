import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_core/services/patient_share_service.dart';
import 'package:aafiya_core/models/patient_share_token.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/widgets/visit_pass_sheet.dart';
import 'package:qr_flutter/qr_flutter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Allow real HTTP sockets to localhost:8000 during live integration tests
  setUpAll(() {
    HttpOverrides.global = null;
  });

  const baseUrl = 'http://localhost:8000/api/v1';
  const manageScriptPath = '/home/yazan/.gemini/antigravity/brain/f68d43bb-272b-4354-9f48-63a2872a6b3f/scratch/manage_test_data.php';

  String? authToken;
  late ApiClient apiClient;
  late TokenStorage tokenStorage;
  String? appt1Id;
  String? appt2Id;
  String? appt2Ref;
  String? appt2SecureToken;
  String? runTag;

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

  group('AAFIYA Patient Role Live Backend Parity E2E Tests', () {
    setUpAll(() async {
      // 1. Authenticate live patient001
      final loginRes = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'email': 'patient001@aafiya.test',
          'password': 'MediTest!2026-PAT-001',
        }),
      );

      expect(loginRes.statusCode, 200, reason: 'Live login for patient001 must succeed: ${loginRes.body}');
      final loginData = jsonDecode(loginRes.body) as Map<String, dynamic>;
      final dataField = loginData['data'] as Map<String, dynamic>;
      authToken = dataField['token'] as String;
      expect(authToken, isNotEmpty);

      tokenStorage = InMemoryTokenStorage();
      await tokenStorage.saveToken(authToken!);

      apiClient = ApiClient(
        tokenStorage: tokenStorage,
        config: AppConfig.devLocal,
      );

      // 2. Safety Gate: Verify baseline count before touching any test records
      final baselineRes = await http.get(
        Uri.parse('$baseUrl/appointments'),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      );
      expect(baselineRes.statusCode, 200);
      final baselineData = jsonDecode(baselineRes.body) as Map<String, dynamic>;
      final baselineItems = baselineData['data'] as List<dynamic>;
      expect(baselineItems.length, 4, reason: 'Baseline appointments count must be exactly 4');

      // 3. Create isolated test appointments
      runTag = '[E2E-FLUTTER-LIVE-${DateTime.now().millisecondsSinceEpoch}]';
      final proc = Process.runSync('php', [manageScriptPath, 'create', runTag!]);
      expect(proc.exitCode, 0, reason: 'Test appointment creation script must succeed: ${proc.stderr}');
      final createdJson = jsonDecode(proc.stdout as String) as Map<String, dynamic>;
      appt1Id = createdJson['appt1']['id'] as String;
      appt2Id = createdJson['appt2']['id'] as String;
      appt2Ref = createdJson['appt2']['booking_reference'] as String;
      appt2SecureToken = createdJson['appt2']['secure_token'] as String;

      expect(appt1Id, isNotNull);
      expect(appt2Id, isNotNull);
      expect(appt2SecureToken, isNotNull);
    });

    tearDownAll(() async {
      // Cleanup all test appointments and reconcile slots
      final cleanProc = Process.runSync('php', [manageScriptPath, 'cleanup', appt1Id ?? '', appt2Id ?? '']);
      expect(cleanProc.exitCode, 0, reason: 'Cleanup script must succeed: ${cleanProc.stderr}');

      // Verify appointments returned to baseline count (4)
      if (authToken != null) {
        final verifyRes = await http.get(
          Uri.parse('$baseUrl/appointments'),
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer $authToken',
          },
        );
        final verifyData = jsonDecode(verifyRes.body) as Map<String, dynamic>;
        final verifyItems = verifyData['data'] as List<dynamic>;
        expect(verifyItems.length, 4, reason: 'Final appointments count must return exactly to 4');
      }
    });

    // -------------------------------------------------------------------------
    // TEST 1: FIX-PAT-01 Appointment Cancellation
    // -------------------------------------------------------------------------
    test('1. FIX-PAT-01: Live Appointment Cancellation against Backend API', () async {
      // Verify appointment 1 starts as pending/confirmed
      final apptRes = await http.get(
        Uri.parse('$baseUrl/appointments/$appt1Id'),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      );
      expect(apptRes.statusCode, 200);
      final apptData = (jsonDecode(apptRes.body) as Map<String, dynamic>)['data'] as Map<String, dynamic>;
      expect(apptData['status'], isNot('cancelled'));

      // Perform cancellation via ApiClient
      final cancelResult = await apiClient.post(
        ApiEndpoints.appointmentCancel(appt1Id!),
        body: {'reason': 'ظرف عائلي طارئ - اختبار Flutter الحي'},
        requiresAuth: true,
      );

      expect(cancelResult, isA<ApiSuccess<Map<String, dynamic>>>());

      // Verify in DB that status is cancelled and history is present
      final verifyApptRes = await http.get(
        Uri.parse('$baseUrl/appointments/$appt1Id'),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      );
      expect(verifyApptRes.statusCode, 200);
      final verifyApptData = (jsonDecode(verifyApptRes.body) as Map<String, dynamic>)['data'] as Map<String, dynamic>;
      expect(verifyApptData['status'], 'cancelled');

      final history = verifyApptData['status_history'] as List<dynamic>?;
      expect(history, isNotNull);
      final hasCancelHistory = history!.any((h) =>
          (h as Map<String, dynamic>)['to_status'] == 'cancelled' &&
          (h['reason'] as String? ?? '').contains('ظرف عائلي'));
      expect(hasCancelHistory, isTrue, reason: 'Status history must record cancellation reason');
    });

    // -------------------------------------------------------------------------
    // TEST 2: TASK-PAR-PAT-02 Digital Visit Pass QR Display
    // -------------------------------------------------------------------------
    testWidgets('2. TASK-PAR-PAT-02: Live Digital Visit Pass QR Sheet Rendering', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      // Fetch live appointment 2 data within runAsync
      final apptRes = await tester.runAsync(() => http.get(
        Uri.parse('$baseUrl/appointments/$appt2Id'),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      ));
      expect(apptRes, isNotNull);
      expect(apptRes!.statusCode, 200);
      final apptData = (jsonDecode(apptRes.body) as Map<String, dynamic>)['data'] as Map<String, dynamic>;

      final appt = Appointment(
        id: apptData['id'] as String,
        bookingReference: apptData['booking_reference'] as String,
        secureToken: apptData['secure_token'] as String?,
        status: AppointmentStatus.fromString(apptData['status'] as String),
        doctor: AppointmentDoctor(
          id: (apptData['doctor'] as Map<String, dynamic>?)?['id'] as String? ?? '',
          name: (apptData['doctor'] as Map<String, dynamic>?)?['name'] as String? ?? 'د. كمال عماري',
          specialty: 'Cardiology',
        ),
        clinic: AppointmentClinic(
          id: (apptData['clinic'] as Map<String, dynamic>?)?['id'] as String? ?? '',
          name: (apptData['clinic'] as Map<String, dynamic>?)?['name'] as String? ?? 'عيادة النور',
          wilaya: '16',
        ),
        patient: AppointmentPatient(
          id: (apptData['patient'] as Map<String, dynamic>?)?['id'] as String? ?? '',
          name: apptData['patient_name'] as String? ?? 'مريض اختباري 001',
        ),
        appointmentDate: apptData['appointment_date'] as String?,
        timeSlot: apptData['time_slot'] as String?,
      );

      expect(appt.secureToken, isNotNull);
      expect(appt.secureToken!.length, 64);

      // Render VisitPassSheet
      await tester.pumpWidget(createTestWidget(VisitPassSheet(appointment: appt)));
      await tester.pump(const Duration(milliseconds: 300));

      // Verify QR widget is rendered
      final qrFinder = find.byType(QrImageView);
      expect(qrFinder, findsOneWidget);
      expect(find.byKey(const Key('visit_pass_qr_image')), findsOneWidget);
      expect(find.byKey(const Key('visit_pass_qr_container')), findsOneWidget);

      // Verify text elements
      expect(find.text('#${appt.bookingReference}'), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // TEST 3: FIX-PAT-02 Appointment Rescheduling
    // -------------------------------------------------------------------------
    test('3. FIX-PAT-02: Live Appointment Rescheduling & No-Op Prevention', () async {
      // 1. Fetch available capacity slots
      const clinicId = '01a084d2-021f-71eb-b09c-39d9ddce3458';
      const doctorId = '01a084d2-021e-7014-a462-b9e8efa68225';
      const date = '2026-10-28';

      final slotsResult = await apiClient.get(
        ApiEndpoints.appointmentSlots,
        queryParameters: {
          'clinic_id': clinicId,
          'doctor_id': doctorId,
          'date': date,
        },
        requiresAuth: true,
      );

      expect(slotsResult, isA<ApiSuccess<Map<String, dynamic>>>());
      final slotsData = (slotsResult as ApiSuccess<Map<String, dynamic>>).data;
      final rawData = slotsData['data'];
      final container = rawData is Map<String, dynamic> ? rawData : slotsData;
      final slotsList = (container['slots'] as List<dynamic>?) ?? [];
      expect(slotsList, isNotEmpty);
      final hasSlot14 = slotsList.any((s) => (s as Map<String, dynamic>)['time_slot'] == '14:00');
      expect(hasSlot14, isTrue, reason: 'Slot 14:00 must be available in capacity slots');

      // 2. Test No-Op rejection (same date 2026-10-28 and slot 10:00)
      final noopResult = await apiClient.post(
        ApiEndpoints.appointmentReschedule(appt2Id!),
        body: {
          'appointment_date': '2026-10-28',
          'time_slot': '10:00',
        },
        requiresAuth: true,
      );

      expect(noopResult, isA<ApiFailure<Map<String, dynamic>>>());
      final failure = noopResult as ApiFailure<Map<String, dynamic>>;
      expect(failure.exception, isA<ValidationException>());

      // 3. Reschedule to new slot 14:00
      final reschedResult = await apiClient.post(
        ApiEndpoints.appointmentReschedule(appt2Id!),
        body: {
          'appointment_date': '2026-10-28',
          'time_slot': '14:00',
          'notes': '${runTag!} تم تغيير الموعد عبر اختبار Flutter الحي',
        },
        requiresAuth: true,
      );

      expect(reschedResult, isA<ApiSuccess<Map<String, dynamic>>>());

      // 4. Verify in DB
      final verifyRes = await http.get(
        Uri.parse('$baseUrl/appointments/$appt2Id'),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      );
      expect(verifyRes.statusCode, 200);
      final updatedData = (jsonDecode(verifyRes.body) as Map<String, dynamic>)['data'] as Map<String, dynamic>;

      expect(updatedData['time_slot'], '14:00');
      expect(updatedData['id'], appt2Id);
      expect(updatedData['booking_reference'], appt2Ref);
      expect(updatedData['secure_token'], appt2SecureToken);

      final history = updatedData['status_history'] as List<dynamic>?;
      expect(history, isNotNull);
      final hasReschedHistory = history!.any((h) =>
          (h['reason'] as String? ?? '').contains('إعادة جدولة'));
      expect(hasReschedHistory, isTrue);
    });

    // -------------------------------------------------------------------------
    // TEST 4: TASK-PAR-PAT-05 & TASK-FIX-WEB-P05-PIN Medical Record Share & PIN
    // -------------------------------------------------------------------------
    test('4. TASK-PAR-PAT-05: Live Encrypted Record Share Creation & PIN Resolution', () async {
      final shareService = PatientShareService(apiClient, config: AppConfig.devLocal);
      final recordService = SharedRecordService(apiClient, config: AppConfig.devLocal);

      const testPin = '849201';

      // 1. Create Share Token with PIN
      final createResult = await shareService.createShare(
        pin: testPin,
        duration: '24h',
      );

      expect(createResult, isA<ApiSuccess<PatientShareToken>>());
      final shareTokenObj = (createResult as ApiSuccess<PatientShareToken>).data;
      final rawToken = shareTokenObj.token;

      expect(rawToken, isNotNull);
      expect(rawToken, startsWith('pst_'));

      // 2. Attempt resolution with incorrect PIN
      final wrongPinResult = await recordService.resolveSharedRecord(
        token: rawToken!,
        pin: '111111',
      );

      expect(wrongPinResult, isA<SharedRecordWrongPinFailure>());
      final wrongPinFailure = wrongPinResult as SharedRecordWrongPinFailure;
      expect(wrongPinFailure.remainingAttempts, isNotNull);

      // 3. Resolve with correct PIN
      final validPinResult = await recordService.resolveSharedRecord(
        token: rawToken,
        pin: testPin,
      );

      expect(validPinResult, isA<SharedRecordSuccess>());
      final success = validPinResult as SharedRecordSuccess;
      final record = success.record;

      // Verify demographics
      expect(record.patient.fullName, contains('مريض اختباري'));
      expect(record.patient.gender, isNotEmpty);

      // Verify Data Minimization (phone and email must NOT be present in raw response)
      final rawResolveRes = await http.post(
        Uri.parse('$baseUrl/shared-records/resolve'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'token': rawToken,
          'pin': testPin,
        }),
      );
      expect(rawResolveRes.statusCode, 200);
      final rawBody = rawResolveRes.body;
      expect(rawBody.contains('patient001@aafiya.test'), isFalse, reason: 'Email must be omitted under data minimization');
      expect(rawBody.contains('+213550000001'), isFalse, reason: 'Phone must be omitted under data minimization');
    });
  });
}

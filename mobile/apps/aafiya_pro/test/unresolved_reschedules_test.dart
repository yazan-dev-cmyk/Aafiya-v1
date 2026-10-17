// ignore_for_file: depend_on_referenced_packages

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/unresolved_reschedules_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testClinic1 = DoctorClinic(
    id: 'clinic-val-01',
    name: 'عيادة الأمل التخصصية',
    position: 'doctor',
    isActive: true,
    isPrimary: true,
  );

  const testClinic2 = DoctorClinic(
    id: 'clinic-val-02',
    name: 'عيادة النور الطبية',
    position: 'doctor',
    isActive: true,
    isPrimary: false,
  );

  const testDoctorUser = User(
    id: 'doc-user-1',
    name: 'د. يوسف المنصوري',
    email: 'doctor@aafiya.test',
    phone: '+213555112233',
    roles: [UserRole.doctor],
    permissions: ['booking.view_all'],
    clinics: [testClinic1, testClinic2],
  );

  const testAssistantUser = User(
    id: 'ast-user-1',
    name: 'مساعد العيادة سمير',
    email: 'assistant@aafiya.test',
    phone: '+213555998877',
    roles: [UserRole.doctorAssistant],
    permissions: ['booking.manage_queue'],
    clinic: testClinic1,
    clinics: [testClinic1],
  );

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
      home: child,
    );
  }

  group('UnresolvedRescheduleItem DTO & JSON Parsing', () {
    test('Correctly parses full JSON response with permitted phone', () {
      final json = {
        'id': 'reschedule-1',
        'doctor_vacation_id': 'vac-1',
        'clinic_id': 'clinic-val-01',
        'status': 'urgent_unresolved',
        'failure_reason': 'لا توجد خانات شاغرة خلال أفق الـ 7 أيام',
        'resolved_at': null,
        'resolved_by_id': null,
        'created_at': '2026-10-15T09:00:00Z',
        'updated_at': '2026-10-15T09:00:00Z',
        'original_appointment': {
          'id': 'app-1',
          'booking_reference': 'AAF-2026-0001',
          'appointment_date': '2026-10-18',
          'time_slot': '10:00',
          'status': 'rescheduled',
          'patient_name': 'أحمد بلحاج',
          'patient_phone': '+213661223344',
          'patient_mrn': 'MRN-10023',
          'doctor': {
            'id': 'doc-1',
            'name': 'د. سليم قدور',
            'specialty': 'أمراض القلب',
          },
        },
        'replacement_appointment': null,
        'vacation': {
          'id': 'vac-1',
          'vacation_start': '2026-10-17',
          'vacation_end': '2026-10-24',
          'status': 'effective',
          'reason': 'مؤتمر طبي بالخارج',
        },
      };

      final item = UnresolvedRescheduleItem.fromJson(json);

      expect(item.id, 'reschedule-1');
      expect(item.status, 'urgent_unresolved');
      expect(item.isUrgentUnresolved, isTrue);
      expect(item.failureReason, 'لا توجد خانات شاغرة خلال أفق الـ 7 أيام');
      expect(item.originalAppointment?.patientName, 'أحمد بلحاج');
      expect(item.originalAppointment?.patientPhone, '+213661223344');
      expect(item.originalAppointment?.hasPhone, isTrue);
      expect(item.originalAppointment?.doctorName, 'د. سليم قدور');
      expect(item.vacation?.status, 'effective');
    });

    test('Correctly handles privacy phone masking when patient_phone is null', () {
      final json = {
        'id': 'reschedule-2',
        'doctor_vacation_id': 'vac-2',
        'clinic_id': 'clinic-val-01',
        'status': 'urgent_unresolved',
        'failure_reason': 'العيادة مغلقة',
        'original_appointment': {
          'id': 'app-2',
          'booking_reference': 'AAF-2026-0002',
          'appointment_date': '2026-10-19',
          'time_slot': '11:00',
          'status': 'rescheduled',
          'patient_name': 'فاطمة الزهراء',
          'patient_phone': null,
          'patient_mrn': 'MRN-10088',
        },
      };

      final item = UnresolvedRescheduleItem.fromJson(json);

      expect(item.originalAppointment?.patientPhone, isNull);
      expect(item.originalAppointment?.hasPhone, isFalse);
    });

    test('PaginatedUnresolvedReschedules handles empty data collection safely', () {
      final paginatedJson = {
        'data': [],
        'links': {'first': '...', 'last': '...'},
        'meta': {'current_page': 1, 'last_page': 1, 'per_page': 20, 'total': 0},
      };

      final result = PaginatedUnresolvedReschedules.fromJson(paginatedJson);

      expect(result.items, isEmpty);
      expect(result.isEmpty, isTrue);
      expect(result.total, 0);
      expect(result.hasMore, isFalse);
    });
  });

  group('UnresolvedReschedulesScreen Widget Tests', () {
    testWidgets('Renders top explanation banner, search bar, and empty state when no cases exist',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response('{"data": [], "meta": {"current_page": 1, "last_page": 1, "total": 0}}', 200,
            headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok-test'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        token: 'tok-test',
        user: testDoctorUser,
      );
      sessionManager.setAuthorizedClinics([testClinic1, testClinic2], preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: UnresolvedReschedulesScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            service: _FakeClinicRescheduleDashboardService(
              result: const ApiSuccess(PaginatedUnresolvedReschedules.empty),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('لوحة متابعة المواعيد غير المحسومة (حالات حرجة)'), findsOneWidget);
      expect(find.text('لا توجد حالات غير محسومة حالياً'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('Renders urgent cases with permitted phone and copy button', (tester) async {
      final sampleItem = UnresolvedRescheduleItem(
        id: 'reschedule-1',
        doctorVacationId: 'vac-1',
        clinicId: 'clinic-val-01',
        status: 'urgent_unresolved',
        failureReason: 'لا توجد خانات شاغرة',
        originalAppointment: const OriginalAppointmentInfo(
          id: 'app-1',
          bookingReference: 'AAF-REF-001',
          appointmentDate: '2026-10-20',
          timeSlot: '09:00',
          patientName: 'عمر التلمساني',
          patientPhone: '+213555123456',
          patientMrn: 'MRN-5544',
          doctorName: 'د. يوسف المنصوري',
        ),
      );

      final fakeService = _FakeClinicRescheduleDashboardService(
        result: ApiSuccess(
          PaginatedUnresolvedReschedules(
            items: [sampleItem],
            currentPage: 1,
            lastPage: 1,
            perPage: 20,
            total: 1,
          ),
        ),
      );

      final mockClient = MockClient((request) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok-test'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        token: 'tok-test',
        user: testDoctorUser,
      );
      sessionManager.setAuthorizedClinics([testClinic1], preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: UnresolvedReschedulesScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            service: fakeService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('عمر التلمساني'), findsOneWidget);
      expect(find.text('+213555123456'), findsOneWidget);
      expect(find.text('نسخ الرقم'), findsOneWidget);
      expect(find.text('حالة حرجة غير محسومة'), findsOneWidget);

      await tester.tap(find.text('نسخ الرقم'));
      await tester.pump();
      expect(find.text('تم نسخ رقم الهاتف للحافظة بنجاح'), findsOneWidget);
    });

    testWidgets('Renders masked indicator when patient_phone is null for Assistant',
        (tester) async {
      final maskedItem = UnresolvedRescheduleItem(
        id: 'reschedule-2',
        doctorVacationId: 'vac-2',
        clinicId: 'clinic-val-01',
        status: 'urgent_unresolved',
        failureReason: 'إجازة طارئة',
        originalAppointment: const OriginalAppointmentInfo(
          id: 'app-2',
          bookingReference: 'AAF-REF-002',
          appointmentDate: '2026-10-21',
          timeSlot: '14:00',
          patientName: 'مريم قدري',
          patientPhone: null,
          patientMrn: 'MRN-7788',
        ),
      );

      final fakeService = _FakeClinicRescheduleDashboardService(
        result: ApiSuccess(
          PaginatedUnresolvedReschedules(
            items: [maskedItem],
            currentPage: 1,
            lastPage: 1,
            perPage: 20,
            total: 1,
          ),
        ),
      );

      final mockClient = MockClient((request) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok-test'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        token: 'tok-test',
        user: testAssistantUser,
      );
      sessionManager.setAuthorizedClinics([testClinic1], preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: UnresolvedReschedulesScreen(
            sessionManager: sessionManager,
            user: testAssistantUser,
            service: fakeService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('مريم قدري'), findsOneWidget);
      expect(find.text('رقم الهاتف محجوب (صلاحية محدودة)'), findsOneWidget);
      expect(find.text('نسخ الرقم'), findsNothing);
    });

    testWidgets('Clears and refreshes list when active clinic switches to prevent stale leakage',
        (tester) async {
      final clinic1Item = UnresolvedRescheduleItem(
        id: 'res-clinic-1',
        doctorVacationId: 'vac-1',
        clinicId: 'clinic-val-01',
        status: 'urgent_unresolved',
        originalAppointment: const OriginalAppointmentInfo(
          id: 'app-1',
          patientName: 'مريض عيادة الأمل',
        ),
      );

      final clinic2Item = UnresolvedRescheduleItem(
        id: 'res-clinic-2',
        doctorVacationId: 'vac-2',
        clinicId: 'clinic-val-02',
        status: 'urgent_unresolved',
        originalAppointment: const OriginalAppointmentInfo(
          id: 'app-2',
          patientName: 'مريض عيادة النور',
        ),
      );

      final mockClient = MockClient((request) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok-test'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        token: 'tok-test',
        user: testDoctorUser,
      );
      sessionManager.setAuthorizedClinics([testClinic1, testClinic2], preferredClinicId: 'clinic-val-01');

      final fakeService = _SwitchingClinicRescheduleDashboardService(
        clinicResponses: {
          'clinic-val-01': [clinic1Item],
          'clinic-val-02': [clinic2Item],
        },
        sessionManager: sessionManager,
      );

      await tester.pumpWidget(
        createTestWidget(
          child: UnresolvedReschedulesScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            service: fakeService,
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('مريض عيادة الأمل'), findsOneWidget);
      expect(find.text('مريض عيادة النور'), findsNothing);

      sessionManager.switchActiveClinic('clinic-val-02');
      await tester.pumpAndSettle();

      expect(find.text('مريض عيادة الأمل'), findsNothing);
      expect(find.text('مريض عيادة النور'), findsOneWidget);
    });
  });
}

class _FakeClinicRescheduleDashboardService implements ClinicRescheduleDashboardService {
  _FakeClinicRescheduleDashboardService({required this.result});

  final ApiResult<PaginatedUnresolvedReschedules> result;

  @override
  Future<ApiResult<PaginatedUnresolvedReschedules>> fetchUnresolvedAppointments({
    int page = 1,
    int perPage = 20,
  }) async {
    return result;
  }
}

class _SwitchingClinicRescheduleDashboardService implements ClinicRescheduleDashboardService {
  _SwitchingClinicRescheduleDashboardService({
    required this.clinicResponses,
    required this.sessionManager,
  });

  final Map<String, List<UnresolvedRescheduleItem>> clinicResponses;
  final AuthSessionManager sessionManager;

  @override
  Future<ApiResult<PaginatedUnresolvedReschedules>> fetchUnresolvedAppointments({
    int page = 1,
    int perPage = 20,
  }) async {
    final activeId = sessionManager.activeClinicId ?? '';
    final list = clinicResponses[activeId] ?? [];

    return ApiSuccess(
      PaginatedUnresolvedReschedules(
        items: list,
        currentPage: 1,
        lastPage: 1,
        perPage: 20,
        total: list.length,
      ),
    );
  }
}

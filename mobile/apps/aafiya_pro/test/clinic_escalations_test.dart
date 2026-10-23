// ignore_for_file: depend_on_referenced_packages

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/clinic_escalations_screen.dart';

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
    roles: [UserRole.doctor],
    permissions: ['booking.manage_queue'],
    clinics: [testClinic1, testClinic2],
  );

  const testDoctorUserB = User(
    id: 'doc-user-2',
    name: 'د. كريم بوعلام',
    email: 'karim@aafiya.test',
    roles: [UserRole.doctor],
    permissions: ['booking.manage_queue'],
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

  group('ClinicEscalationsScreen Widget Tests', () {
    testWidgets('renders loaded escalation records with patient details',
        (tester) async {
      final client = MockClient((request) async {
        if (request.url.path.contains('/clinic/notifications/escalations')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'esc-101',
                  'appointment_id': 'app-1',
                  'patient_name': 'خالد بن عيسى',
                  'patient_phone': '0555123456',
                  'doctor_name': 'د. يوسف المنصوري',
                  'clinic_id': 'clinic-val-01',
                  'clinic_name': 'عيادة الأمل التخصصية',
                  'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                  'instruction': 'يرجى التواصل الهاتفي المباشر مع المريض.',
                  'original_date': '2026-10-24',
                  'original_time_slot': '10:00',
                  'replacement_appointment_id': 'app-2',
                  'new_date': '2026-10-27',
                  'new_slot': '11:00',
                  'is_acknowledged': false,
                }
              ],
              'meta': {
                'current_page': 1,
                'last_page': 1,
                'per_page': 20,
                'total': 1,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-test-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'valid-test-token', user: testDoctorUser);
      sessionManager.setAuthorizedClinics([testClinic1, testClinic2],
          preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicEscalationsScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('خالد بن عيسى'), findsOneWidget);
      expect(find.text('0555123456'), findsOneWidget);
      expect(
          find.text('يرجى التواصل الهاتفي المباشر مع المريض.'), findsOneWidget);
      expect(find.text('إقرار المتابعة وإغلاق التنبيه'), findsOneWidget);
    });

    testWidgets(
        'clears protected escalation data on HTTP 403 Forbidden and fails closed',
        (tester) async {
      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'غير مصرح: لا تملك صلاحية إدارة طابور العيادة المحددة.',
          }),
          403,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-test-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'valid-test-token', user: testDoctorUser);
      sessionManager.setAuthorizedClinics([testClinic1],
          preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicEscalationsScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Must NOT display any patient name or phone
      expect(find.text('خالد بن عيسى'), findsNothing);
      expect(find.text('0555123456'), findsNothing);
      // Must display unauthorized error view
      expect(find.byType(AafiyaErrorView), findsOneWidget);
    });

    testWidgets(
        'switching active clinic clears previous clinic records immediately',
        (tester) async {
      String? requestedClinicHeader;

      final client = MockClient((request) async {
        requestedClinicHeader = request.headers['X-Clinic-ID'];
        if (requestedClinicHeader == 'clinic-val-01') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'esc-101',
                  'appointment_id': 'app-1',
                  'patient_name': 'مريض العيادة الأولى',
                  'patient_phone': '0555111111',
                  'doctor_name': 'د. يوسف',
                  'clinic_id': 'clinic-val-01',
                  'clinic_name': 'عيادة الأمل',
                  'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                  'instruction': 'متابعة العيادة 1',
                  'is_acknowledged': false,
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'esc-202',
                  'appointment_id': 'app-2',
                  'patient_name': 'مريض العيادة الثانية',
                  'patient_phone': '0555222222',
                  'doctor_name': 'د. يوسف',
                  'clinic_id': 'clinic-val-02',
                  'clinic_name': 'عيادة النور',
                  'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                  'instruction': 'متابعة العيادة 2',
                  'is_acknowledged': false,
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-test-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'valid-test-token', user: testDoctorUser);
      sessionManager.setAuthorizedClinics([testClinic1, testClinic2],
          preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicEscalationsScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('مريض العيادة الأولى'), findsOneWidget);
      expect(find.text('مريض العيادة الثانية'), findsNothing);

      // Now switch active clinic to Clinic 2
      sessionManager.switchActiveClinic('clinic-val-02');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('مريض العيادة الأولى'), findsNothing);
      expect(find.text('مريض العيادة الثانية'), findsOneWidget);
    });

    testWidgets(
        'acknowledgment flow displays confirmation dialog and reconciles with server',
        (tester) async {
      final client = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'esc-101',
                  'appointment_id': 'app-1',
                  'patient_name': 'خالد بن عيسى',
                  'patient_phone': '0555123456',
                  'doctor_name': 'د. يوسف',
                  'clinic_id': 'clinic-val-01',
                  'clinic_name': 'عيادة الأمل',
                  'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                  'instruction': 'يرجى التواصل الهاتفي المباشر مع المريض.',
                  'is_acknowledged': false,
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.method == 'POST' &&
            request.url.path.contains('/acknowledge')) {
          return http.Response(
            jsonEncode({
              'message': 'تم إقرار التصعيد وإغلاقه من طابور المتابعة بنجاح.',
              'data': {
                'id': 'esc-101',
                'appointment_id': 'app-1',
                'patient_name': 'خالد بن عيسى',
                'patient_phone': '0555123456',
                'doctor_name': 'د. يوسف',
                'clinic_id': 'clinic-val-01',
                'clinic_name': 'عيادة الأمل',
                'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                'instruction': 'يرجى التواصل الهاتفي المباشر مع المريض.',
                'acknowledged_at': '2026-10-23T09:30:00Z',
                'is_acknowledged': true,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-test-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'valid-test-token', user: testDoctorUser);
      sessionManager.setAuthorizedClinics([testClinic1],
          preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicEscalationsScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final ackButton = find.text('إقرار المتابعة وإغلاق التنبيه');
      expect(ackButton, findsOneWidget);

      await tester.tap(ackButton);
      await tester.pumpAndSettle();

      // Verify confirmation dialog
      expect(find.text('تأكيد إقرار المتابعة'), findsOneWidget);
      expect(find.text('تأكيد الإغلاق'), findsOneWidget);

      // Confirm closure
      await tester.tap(find.text('تأكيد الإغلاق'));
      await tester.pump();
      await tester.pumpAndSettle();

      // Card is reconciled to acknowledged
      expect(find.text('إقرار المتابعة وإغلاق التنبيه'), findsNothing);
      expect(find.text('تم الاطلاع'), findsOneWidget);
    });

    testWidgets(
        'same-clinic account switch: stale response from doctor A completing after doctor B login never populates B UI and B triggers fresh load',
        (tester) async {
      final completerA = Completer<http.Response>();
      int requestCount = 0;

      final client = MockClient((request) async {
        if (request.url.path.contains('/clinic/notifications/escalations')) {
          requestCount++;
          if (requestCount == 1) {
            // Doctor A request - kept pending
            return completerA.future;
          } else {
            // Doctor B request
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'id': 'esc-202',
                    'appointment_id': 'app-2',
                    'patient_name': 'مريض الطبيب الثاني كريم',
                    'patient_phone': '0555222222',
                    'doctor_name': 'د. كريم بوعلام',
                    'clinic_id': 'clinic-val-01',
                    'clinic_name': 'عيادة الأمل التخصصية',
                    'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                    'instruction': 'متابعة خاصة بالطبيب كريم',
                    'is_acknowledged': false,
                  }
                ],
                'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-doc-a'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-doc-a', user: testDoctorUser);
      sessionManager.setAuthorizedClinics([testClinic1],
          preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicEscalationsScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      expect(requestCount, equals(1));

      // Doctor A logs out
      await sessionManager.logout();
      await tester.pump();

      // Doctor B logs in with the SAME activeClinicId ('clinic-val-01')
      await sessionManager.setAuthenticatedUser(
          token: 'token-doc-b', user: testDoctorUserB);
      sessionManager.setAuthorizedClinics([testClinic1],
          preferredClinicId: 'clinic-val-01');

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // B triggers fresh load and displays Doctor B's escalations
      expect(find.text('مريض الطبيب الثاني كريم'), findsOneWidget);

      // Now Doctor A's pending request finishes with Doctor A's data
      completerA.complete(
        http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'esc-101',
                'appointment_id': 'app-1',
                'patient_name': 'مريض الطبيب الأول يوسف',
                'patient_phone': '0555111111',
                'doctor_name': 'د. يوسف المنصوري',
                'clinic_id': 'clinic-val-01',
                'clinic_name': 'عيادة الأمل التخصصية',
                'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                'instruction': 'متابعة الطبيب يوسف',
                'is_acknowledged': false,
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Doctor A's data must NEVER populate Doctor B's UI
      expect(find.text('مريض الطبيب الأول يوسف'), findsNothing);
      expect(find.text('مريض الطبيب الثاني كريم'), findsOneWidget);
    });

    testWidgets(
        'same-clinic account switch: stale 403 response from doctor A completing after doctor B login does not clear B data',
        (tester) async {
      final completerA = Completer<http.Response>();
      int requestCount = 0;

      final client = MockClient((request) async {
        if (request.url.path.contains('/clinic/notifications/escalations')) {
          requestCount++;
          if (requestCount == 1) {
            return completerA.future;
          } else {
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'id': 'esc-202',
                    'appointment_id': 'app-2',
                    'patient_name': 'مريض الطبيب الثاني كريم',
                    'patient_phone': '0555222222',
                    'doctor_name': 'د. كريم بوعلام',
                    'clinic_id': 'clinic-val-01',
                    'clinic_name': 'عيادة الأمل التخصصية',
                    'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                    'instruction': 'متابعة خاصة بالطبيب كريم',
                    'is_acknowledged': false,
                  }
                ],
                'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-doc-a'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-doc-a', user: testDoctorUser);
      sessionManager.setAuthorizedClinics([testClinic1],
          preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicEscalationsScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      expect(requestCount, equals(1));

      // Switch to Doctor B with same active clinic
      await sessionManager.logout();
      await tester.pump();

      await sessionManager.setAuthenticatedUser(
          token: 'token-doc-b', user: testDoctorUserB);
      sessionManager.setAuthorizedClinics([testClinic1],
          preferredClinicId: 'clinic-val-01');

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('مريض الطبيب الثاني كريم'), findsOneWidget);

      // Now Doctor A's request returns 403 Forbidden
      completerA.complete(
        http.Response(
          jsonEncode({
            'message':
                'Forbidden: You do not have permission for this clinic queue.',
          }),
          403,
          headers: {'content-type': 'application/json'},
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Doctor B's data must remain visible, not wiped by stale 403
      expect(find.text('مريض الطبيب الثاني كريم'), findsOneWidget);
      expect(find.byType(AafiyaErrorView), findsNothing);
    });

    testWidgets(
        'same-clinic account switch: stale acknowledgment from doctor A completing after doctor B login does not reconcile B list',
        (tester) async {
      final ackCompleterA = Completer<http.Response>();

      final client = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'esc-101',
                  'appointment_id': 'app-1',
                  'patient_name': 'خالد بن عيسى',
                  'patient_phone': '0555123456',
                  'doctor_name': 'د. المشترك',
                  'clinic_id': 'clinic-val-01',
                  'clinic_name': 'عيادة الأمل',
                  'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                  'instruction': 'متابعة هاتفية',
                  'is_acknowledged': false,
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.method == 'POST' &&
            request.url.path.contains('/acknowledge')) {
          return ackCompleterA.future;
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-doc-a'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-doc-a', user: testDoctorUser);
      sessionManager.setAuthorizedClinics([testClinic1],
          preferredClinicId: 'clinic-val-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicEscalationsScreen(
            sessionManager: sessionManager,
            user: testDoctorUser,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final ackButton = find.text('إقرار المتابعة وإغلاق التنبيه');
      expect(ackButton, findsOneWidget);

      await tester.tap(ackButton);
      await tester.pumpAndSettle();
      await tester.tap(find.text('تأكيد الإغلاق'));
      await tester.pump();

      // Doctor A logs out and Doctor B logs in with same clinic while ack is pending
      await sessionManager.logout();
      await tester.pump();

      await sessionManager.setAuthenticatedUser(
          token: 'token-doc-b', user: testDoctorUserB);
      sessionManager.setAuthorizedClinics([testClinic1],
          preferredClinicId: 'clinic-val-01');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Doctor B sees escalation esc-101 unacknowledged
      expect(find.text('إقرار المتابعة وإغلاق التنبيه'), findsOneWidget);

      // Now Doctor A's ack returns success
      ackCompleterA.complete(
        http.Response(
          jsonEncode({
            'message': 'تم الإقرار بنجاح',
            'data': {
              'id': 'esc-101',
              'appointment_id': 'app-1',
              'patient_name': 'خالد بن عيسى',
              'patient_phone': '0555123456',
              'doctor_name': 'د. المشترك',
              'clinic_id': 'clinic-val-01',
              'clinic_name': 'عيادة الأمل',
              'escalation_reason': 'PATIENT_UNREAD_SLA_EXPIRED_24H',
              'instruction': 'متابعة هاتفية',
              'acknowledged_at': '2026-10-23T10:00:00Z',
              'is_acknowledged': true,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Doctor B's item must NOT be reconciled to acknowledged
      expect(find.text('إقرار المتابعة وإغلاق التنبيه'), findsOneWidget);
      expect(find.text('تم الاطلاع'), findsNothing);
    });
  });
}

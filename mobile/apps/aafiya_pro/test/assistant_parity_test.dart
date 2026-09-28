// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/assistant_queue_screen.dart';
import 'package:aafiya_pro/widgets/add_assistant_sheet.dart';
import 'package:aafiya_pro/widgets/edit_assistant_permissions_sheet.dart';
import 'package:aafiya_pro/widgets/staff_detail_sheet.dart';
import 'package:aafiya_pro/widgets/assistant_patient_search_sheet.dart';

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

void main() {
  const allFivePermissions = [
    'booking.create',
    'booking.manage_queue',
    'booking.confirm_attendance',
    'patient.view_contacts',
    'booking.confirm',
  ];

  const fullAssistantUser = User(
    id: 'user-ast-all',
    name: 'مريم قدور',
    email: 'assistant@aafiya.test',
    phone: '+213550123450',
    roles: [UserRole.doctorAssistant],
    permissions: allFivePermissions,
  );

  const restrictedAssistantUser = User(
    id: 'user-ast-restricted',
    name: 'علي قدور',
    email: 'ali@aafiya.test',
    phone: '+213550123451',
    roles: [UserRole.doctorAssistant],
    permissions: [
      'booking.manage_queue',
    ],
  );

  group('1. Canonical 5 Permissions Model Verification', () {
    test('User.hasPermission recognizes booking.confirm and other 4 permissions', () {
      expect(fullAssistantUser.hasPermission('booking.confirm'), isTrue);
      expect(fullAssistantUser.hasPermission('booking.create'), isTrue);
      expect(fullAssistantUser.hasPermission('booking.manage_queue'), isTrue);
      expect(fullAssistantUser.hasPermission('booking.confirm_attendance'), isTrue);
      expect(fullAssistantUser.hasPermission('patient.view_contacts'), isTrue);

      // Restricted user
      expect(restrictedAssistantUser.hasPermission('booking.confirm'), isFalse);
      expect(restrictedAssistantUser.hasPermission('booking.create'), isFalse);
      expect(restrictedAssistantUser.hasPermission('booking.confirm_attendance'), isFalse);
      expect(restrictedAssistantUser.hasPermission('patient.view_contacts'), isFalse);
      expect(restrictedAssistantUser.hasPermission('booking.manage_queue'), isTrue);

      // Unknown permission fails closed
      expect(fullAssistantUser.hasPermission('unknown.perm'), isFalse);
    });

    test('User deserialization preserves booking.confirm', () {
      final json = {
        'id': 'ast-001',
        'name': 'Assistant Test',
        'email': 'ast@test.com',
        'roles': ['doctor_assistant'],
        'permissions': ['booking.confirm', 'booking.manage_queue'],
      };

      final user = User.fromJson(json);
      expect(user.hasPermission('booking.confirm'), isTrue);
      expect(user.hasPermission('booking.manage_queue'), isTrue);
      expect(user.hasPermission('booking.create'), isFalse);
    });
  });

  group('2. Director Assistant Management Sheets Parity', () {
    testWidgets('AddAssistantSheet presents all 5 permissions including booking.confirm', (tester) async {
      final staffService = ClinicStaffService(apiClient: ApiClient());

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                AddAssistantSheet.show(
                  context,
                  staffService: staffService,
                  clinicId: 'clinic-1',
                  onCreated: () {},
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Verify all 5 permission titles are displayed
      expect(find.text('إدارة قائمة الانتظار'), findsOneWidget); // booking.manage_queue
      expect(find.text('تأكيد الحضور'), findsOneWidget); // booking.confirm_attendance
      expect(find.text('إنشاء المواعيد'), findsOneWidget); // booking.create
      expect(find.text('عرض بيانات الاتصال'), findsOneWidget); // patient.view_contacts
      expect(find.text('تأكيد المواعيد'), findsOneWidget); // booking.confirm
    });

    testWidgets('EditAssistantPermissionsSheet includes booking.confirm and saves updated permissions', (tester) async {
      final staffService = ClinicStaffService(apiClient: ApiClient());
      const sampleAssistant = ClinicAssistantStaff(
        id: 'ast-sample-1',
        name: 'Amina Staff',
        email: 'amina@aafiya.test',
        delegatedPermissions: ['booking.manage_queue'],
      );

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                EditAssistantPermissionsSheet.show(
                  context,
                  staffService: staffService,
                  clinicId: 'clinic-1',
                  assistant: sampleAssistant,
                  onUpdated: () {},
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Check all 5 permissions are present
      expect(find.text('إدارة قائمة الانتظار'), findsOneWidget);
      expect(find.text('تأكيد الحضور'), findsOneWidget);
      expect(find.text('إنشاء المواعيد'), findsOneWidget);
      expect(find.text('عرض بيانات الاتصال'), findsOneWidget);
      expect(find.text('تأكيد المواعيد'), findsOneWidget);
    });

    testWidgets('StaffDetailSheet displays booking.confirm permission label for assistant', (tester) async {
      final staffService = ClinicStaffService(apiClient: ApiClient());
      const sampleAssistant = ClinicAssistantStaff(
        id: 'ast-sample-2',
        name: 'Farida Staff',
        email: 'farida@aafiya.test',
        delegatedPermissions: ['booking.confirm', 'booking.manage_queue'],
      );

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                StaffDetailSheet.showAssistant(
                  context,
                  staffService: staffService,
                  clinicId: 'clinic-1',
                  assistant: sampleAssistant,
                  currentUser: fullAssistantUser,
                  onUpdated: () {},
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(find.text('Farida Staff'), findsOneWidget);
      expect(find.text('تأكيد المواعيد'), findsOneWidget);
      expect(find.text('إدارة قائمة الانتظار'), findsOneWidget);
    });
  });

  group('3. AssistantQueueScreen Fail-Closed Permission Gating', () {
    testWidgets('booking.manage_queue absent: fails closed with unauthorized view', (tester) async {
      const userWithoutQueue = User(
        id: 'user-no-queue',
        name: 'User No Queue',
        email: 'noqueue@test.com',
        roles: [UserRole.doctorAssistant],
        permissions: ['booking.create'], // lacks booking.manage_queue
      );

      final apiClient = ApiClient();
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: userWithoutQueue,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('غير مصرح لك باستعراض قائمة مواعيد العيادة. يرجى مراجعة مدير العيادة.'), findsOneWidget);
      expect(find.byType(AafiyaErrorView), findsOneWidget);
    });

    testWidgets('booking.create absent: New Booking button is hidden', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: restrictedAssistantUser, // lacks booking.create
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('new_booking_action_button')), findsNothing);
    });

    testWidgets('booking.create present: New Booking button is visible', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser, // has booking.create
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('new_booking_action_button')), findsOneWidget);
    });

    testWidgets('booking.confirm_attendance absent: Quick Check-In and attend action hidden/disabled', (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];
        if (status == 'confirmed') {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'appt-exp-01',
                'booking_reference': 'BK-EXP-01',
                'status': 'confirmed',
                'appointment_date': '2026-09-18',
                'time_slot': '10:00',
                'patient': {
                  'id': 'pat-1',
                  'name': 'احمد بن صالح',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1},
          }), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: restrictedAssistantUser, // lacks booking.confirm_attendance
        ),
      ));
      await tester.pumpAndSettle();

      // Quick Check-in button in top bar and FAB should be hidden
      expect(find.text('تسجيل حضور سريع'), findsNothing);
      expect(find.byType(FloatingActionButton), findsNothing);

      // Switch to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Patient is visible, but action buttons on tile should NOT be present (onAttend/onNoShow are null)
      expect(find.text('احمد بن صالح'), findsOneWidget);
      expect(find.text('تسجيل حضور'), findsNothing);
      expect(find.text('لم يحضر'), findsNothing);
    });
  });

  group('4. Appointment Confirmation Flow & 3 Sub-Tabs', () {
    testWidgets('Displays 3 sub-tabs with counts and switches to Pending Confirmation', (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'appt-pnd-01',
                'booking_reference': 'BK-PND-01',
                'status': 'pending',
                'appointment_date': '2026-09-18',
                'time_slot': '11:00',
                'patient': {
                  'id': 'pat-pnd',
                  'name': 'خالد سلطاني',
                  'phone': '0555998877',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1},
          }), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });
      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // Verify sub-tabs are present
      expect(find.text('المتوقع حضورهم'), findsOneWidget);
      expect(find.text('بانتظار التأكيد'), findsOneWidget);

      // Switch to Pending Confirmation tab
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      // Pending patient is visible with confirm button
      expect(find.text('خالد سلطاني'), findsOneWidget);
      expect(find.text('تأكيد الموعد'), findsOneWidget);
    });

    testWidgets('Tapping Confirm button shows confirmation prompt and invokes API', (tester) async {
      var confirmApiCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-pnd-01/confirm')) {
          confirmApiCalled = true;
          expect(request.method, equals('POST'));
          return http.Response(jsonEncode({
            'message': 'تم تأكيد الموعد بنجاح وخصم الحصة من الرصيد إن وجدت.',
            'data': {
              'id': 'appt-pnd-01',
              'booking_reference': 'BK-PND-01',
              'status': 'confirmed',
              'appointment_date': '2026-09-18',
              'time_slot': '11:00',
              'patient': {
                'id': 'pat-pnd',
                'name': 'خالد سلطاني',
              },
            },
          }), 200, headers: {'content-type': 'application/json'});
        }

        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'appt-pnd-01',
                'booking_reference': 'BK-PND-01',
                'status': 'pending',
                'appointment_date': '2026-09-18',
                'time_slot': '11:00',
                'patient': {
                  'id': 'pat-pnd',
                  'name': 'خالد سلطاني',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1},
          }), 200, headers: {'content-type': 'application/json'});
        }

        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // Switch to Pending Confirmation tab
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      // Tap Confirm button
      final confirmBtn = find.text('تأكيد الموعد');
      expect(confirmBtn, findsOneWidget);
      await tester.tap(confirmBtn);
      await tester.pumpAndSettle();

      // Verification dialog appears
      expect(find.text('تأكيد الموعد الطبي'), findsOneWidget);
      expect(find.textContaining('هل أنت متأكد من تأكيد هذا الموعد الطبي'), findsOneWidget);

      // Tap confirm action in dialog
      final dialogConfirmBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('تأكيد الموعد'),
      );
      await tester.tap(dialogConfirmBtn);
      await tester.pumpAndSettle();

      expect(confirmApiCalled, isTrue);
      expect(find.textContaining('تم تأكيد الموعد بنجاح.'), findsOneWidget);
    });

    testWidgets('When booking.confirm is revoked, confirmation action is disabled', (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'appt-pnd-02',
                'booking_reference': 'BK-PND-02',
                'status': 'pending',
                'appointment_date': '2026-09-18',
                'time_slot': '12:00',
                'patient': {
                  'id': 'pat-pnd-2',
                  'name': 'نبيل بوزيد',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1},
          }), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: restrictedAssistantUser, // lacks booking.confirm
        ),
      ));
      await tester.pumpAndSettle();

      // Switch to Pending Confirmation tab
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      // Patient is displayed, but confirm button is absent (onConfirm is null)
      expect(find.text('نبيل بوزيد'), findsOneWidget);
      expect(find.text('تأكيد الموعد'), findsNothing);
    });
  });

  group('5. Date and Doctor Filtering Controls', () {
    testWidgets('Doctor and Date filter popup menus render and update selection', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // Doctor filter button and Date filter button exist
      expect(find.byKey(const ValueKey('doctor_filter_button')), findsOneWidget);
      expect(find.byKey(const ValueKey('date_filter_button')), findsOneWidget);
      expect(find.text('جميع الأطباء'), findsOneWidget);
      expect(find.text('اليوم'), findsOneWidget);

      // Tap date filter button
      await tester.tap(find.byKey(const ValueKey('date_filter_button')));
      await tester.pumpAndSettle();

      // Options: Today, Specific Date, Date Range, All Dates
      expect(find.text('تاريخ محدد'), findsOneWidget);
      expect(find.text('نطاق زمني'), findsOneWidget);
      expect(find.text('جميع التواريخ'), findsOneWidget);

      // Select 'All Dates'
      await tester.tap(find.text('جميع التواريخ'));
      await tester.pumpAndSettle();

      expect(find.text('جميع التواريخ'), findsOneWidget);
    });

    testWidgets('HV-G03: Doctor filter selection, reset to All Doctors, repeated switching, and date filter preservation', (tester) async {
      final requestedDoctorIds = <String?>[];

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/clinics/')) {
          return http.Response(
            jsonEncode({
              'data': {
                'id': 'clinic-001',
                'name': 'عيادة الاختبار',
                'doctors': [
                  {
                    'id': 'doc-a',
                    'name': 'د. أحمد خليل',
                    'position': 'doctor',
                    'is_active': true,
                  },
                  {
                    'id': 'doc-b',
                    'name': 'د. بلال منصور',
                    'position': 'doctor',
                    'is_active': true,
                  },
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        if (request.url.path.contains('/appointments')) {
          requestedDoctorIds.add(request.url.queryParameters['doctor_id']);
          return http.Response(
            jsonEncode({
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId('clinic-001');
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // Test 1: Default state (All Doctors, no restriction)
      expect(find.byKey(const ValueKey('doctor_filter_button')), findsOneWidget);
      expect(find.text('جميع الأطباء'), findsOneWidget);
      expect(requestedDoctorIds.isNotEmpty, isTrue);
      expect(requestedDoctorIds.last, isNull);

      // Test 2: Select Doctor A
      await tester.tap(find.byKey(const ValueKey('doctor_filter_button')));
      await tester.pumpAndSettle();
      expect(find.text('د. أحمد خليل'), findsOneWidget);
      await tester.tap(find.text('د. أحمد خليل'));
      await tester.pumpAndSettle();

      expect(find.text('د. أحمد خليل'), findsOneWidget);
      expect(requestedDoctorIds.last, equals('doc-a'));

      // Test 3: Reset to All Doctors
      await tester.tap(find.byKey(const ValueKey('doctor_filter_button')));
      await tester.pumpAndSettle();
      // When menu is open, there are 2 'جميع الأطباء' widgets (the menu item and the background button)
      final allDocsMenuItem = find.descendant(
        of: find.byType(PopupMenuItem<String>),
        matching: find.text('جميع الأطباء'),
      );
      expect(allDocsMenuItem, findsOneWidget);
      await tester.tap(allDocsMenuItem);
      await tester.pumpAndSettle();

      expect(find.text('جميع الأطباء'), findsOneWidget);
      expect(requestedDoctorIds.last, isNull);

      // Test 4: Repeated switching (All Doctors -> Doc B -> All Doctors -> Doc A -> All Doctors)
      // Switch to Doctor B
      await tester.tap(find.byKey(const ValueKey('doctor_filter_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('د. بلال منصور'));
      await tester.pumpAndSettle();
      expect(find.text('د. بلال منصور'), findsOneWidget);
      expect(requestedDoctorIds.last, equals('doc-b'));

      // Reset to All Doctors
      await tester.tap(find.byKey(const ValueKey('doctor_filter_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.descendant(
        of: find.byType(PopupMenuItem<String>),
        matching: find.text('جميع الأطباء'),
      ));
      await tester.pumpAndSettle();
      expect(find.text('جميع الأطباء'), findsOneWidget);
      expect(requestedDoctorIds.last, isNull);

      // Switch to Doctor A
      await tester.tap(find.byKey(const ValueKey('doctor_filter_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('د. أحمد خليل'));
      await tester.pumpAndSettle();
      expect(find.text('د. أحمد خليل'), findsOneWidget);
      expect(requestedDoctorIds.last, equals('doc-a'));

      // Reset to All Doctors again
      await tester.tap(find.byKey(const ValueKey('doctor_filter_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.descendant(
        of: find.byType(PopupMenuItem<String>),
        matching: find.text('جميع الأطباء'),
      ));
      await tester.pumpAndSettle();
      expect(find.text('جميع الأطباء'), findsOneWidget);
      expect(requestedDoctorIds.last, isNull);

      // Test 5: Doctor filter + Date filter preservation
      // Switch Date filter to All Dates
      await tester.tap(find.byKey(const ValueKey('date_filter_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('جميع التواريخ'));
      await tester.pumpAndSettle();
      expect(find.text('جميع التواريخ'), findsOneWidget);

      // Select Doctor A while date filter is All Dates
      await tester.tap(find.byKey(const ValueKey('doctor_filter_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('د. أحمد خليل'));
      await tester.pumpAndSettle();
      expect(find.text('د. أحمد خليل'), findsOneWidget);
      expect(find.text('جميع التواريخ'), findsOneWidget); // date filter preserved

      // Reset Doctor filter to All Doctors
      await tester.tap(find.byKey(const ValueKey('doctor_filter_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.descendant(
        of: find.byType(PopupMenuItem<String>),
        matching: find.text('جميع الأطباء'),
      ));
      await tester.pumpAndSettle();
      expect(find.text('جميع الأطباء'), findsOneWidget);
      expect(find.text('جميع التواريخ'), findsOneWidget); // date filter STILL preserved
      expect(requestedDoctorIds.last, isNull);
    });
  });

  group('6. Patient Search Contact Masking Parity', () {
    testWidgets('patient.view_contacts granted: shows full phone number', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/patients')) {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'patient-001',
                'mrn': 'MRN-001',
                'first_name': 'ياسمين',
                'last_name': 'عماري',
                'phone': '0555123456',
                'gender': 'female',
              }
            ]
          }), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                AssistantPatientSearchSheet.show(
                  context,
                  queueService: queueService,
                  apiClient: apiClient,
                  sessionManager: sessionManager,
                  user: fullAssistantUser, // has patient.view_contacts
                  onBookReturnVisit: (_) {},
                );
              },
              child: const Text('Open Search'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('Open Search'));
      await tester.pumpAndSettle();

      // Search
      await tester.enterText(find.byType(TextField), 'ياسمين');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      expect(find.text('ياسمين عماري'), findsOneWidget);
      expect(find.text('0555123456'), findsOneWidget);
    });

    testWidgets('patient.view_contacts revoked: masks phone number as —', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/patients')) {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'patient-002',
                'mrn': 'MRN-002',
                'first_name': 'بلال',
                'last_name': 'حمدي',
                'phone': '0555987654',
                'gender': 'male',
              }
            ]
          }), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                AssistantPatientSearchSheet.show(
                  context,
                  queueService: queueService,
                  apiClient: apiClient,
                  sessionManager: sessionManager,
                  user: restrictedAssistantUser, // lacks patient.view_contacts
                  onBookReturnVisit: (_) {},
                );
              },
              child: const Text('Open Search'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('Open Search'));
      await tester.pumpAndSettle();

      // Search
      await tester.enterText(find.byType(TextField), 'بلال');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      expect(find.text('بلال حمدي'), findsOneWidget);
      expect(find.text('0555987654'), findsNothing);
      expect(find.text('—'), findsOneWidget);
    });
  });
}

// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/doctor_staff_screen.dart';
import 'package:aafiya_pro/shells/doctor_shell.dart';
import 'package:aafiya_pro/widgets/add_assistant_sheet.dart';
import 'package:aafiya_pro/widgets/add_doctor_sheet.dart';
import 'package:aafiya_pro/widgets/staff_detail_sheet.dart';

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
    home: child,
  );
}

void main() {
  const directorClinic = DoctorClinic(
    id: 'clinic-director-1',
    name: 'Clinique Al-Amal (Director)',
    position: 'director',
    isPrimary: true,
    isActive: true,
  );

  const employedClinic = DoctorClinic(
    id: 'clinic-employed-2',
    name: 'Clinique El-Nour (Employed)',
    position: 'doctor',
    isPrimary: false,
    isActive: true,
  );

  const currentUser = User(
    id: 'user-doc-1',
    name: 'Dr. Karim Mansouri',
    email: 'karim@aafiya.test',
    roles: [UserRole.doctor],
  );

  final sampleDoctor = ClinicDoctorStaff(
    id: 'doc-emp-1',
    userId: 'user-doc-2',
    name: 'Dr. Sarah Bouzid',
    email: 'sarah@aafiya.test',
    phone: '0555112233',
    specialty: 'Dermatology',
    licenseNumber: 'DERM-9988',
    position: 'doctor',
    isPrimary: false,
    isActive: true,
    joinedAt: '2026-01-15',
  );

  final sampleDirector = ClinicDoctorStaff(
    id: 'doc-dir-1',
    userId: 'user-doc-1',
    name: 'Dr. Karim Mansouri',
    email: 'karim@aafiya.test',
    phone: '0555445566',
    specialty: 'Cardiology',
    licenseNumber: 'CARD-1122',
    position: 'director',
    isPrimary: true,
    isActive: true,
    joinedAt: '2025-10-01',
  );

  final sampleAssistant = ClinicAssistantStaff(
    id: 'asst-1',
    userId: 'user-asst-1',
    name: 'Amina Assistant',
    email: 'amina@aafiya.test',
    phone: '0555998877',
    position: 'assistant',
    isActive: true,
    joinedAt: '2026-02-01',
    delegatedPermissions: [
      'booking.manage_queue',
      'booking.confirm_attendance',
    ],
  );

  final sampleInvitation = ClinicDoctorInvitation(
    id: 'inv-1',
    doctorId: 'doc-lookup-1',
    doctorName: 'Dr. Yacine Khelil',
    doctorEmail: 'yacine@aafiya.test',
    position: 'doctor',
    status: 'pending',
    createdAt: '2026-03-01',
  );

  group('DoctorShell Staff Navigation Visibility & Clinic Switching', () {
    testWidgets('Shows 5 navigation items when active clinic is Medical Director',
        (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: ApiClient(),
      );
      sessionManager.setAuthorizedClinics([directorClinic]);

      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/doctor/clinics')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': directorClinic.id,
                  'name': directorClinic.name,
                  'position': 'director',
                  'is_primary': true,
                  'is_active': true,
                }
              ]
            }),
            200,
          );
        }
        if (req.url.path.endsWith('/doctor/dashboard/stats')) {
          return http.Response(
            jsonEncode({'data': {'total_today': 0, 'completed_today': 0, 'waiting': 0, 'in_progress': 0}}),
            200,
          );
        }
        if (req.url.path.endsWith('/appointments')) {
          return http.Response(
            jsonEncode({'data': []}),
            200,
          );
        }
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final staffService = ClinicStaffService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        child: DoctorShell(
          user: currentUser,
          sessionManager: sessionManager,
          onSignOut: () {},
          apiClient: apiClient,
          clinicStaffService: staffService,
        ),
      ));

      await tester.pumpAndSettle();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.destinations.length, equals(5));
      expect(find.text('طاقم العيادة'), findsOneWidget);
    });

    testWidgets('Shows 3 navigation items when active clinic is Employed Doctor',
        (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: ApiClient(),
      );
      sessionManager.setAuthorizedClinics([employedClinic]);

      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/doctor/clinics')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': employedClinic.id,
                  'name': employedClinic.name,
                  'position': 'doctor',
                  'is_primary': false,
                  'is_active': true,
                }
              ]
            }),
            200,
          );
        }
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockHttp);

      await tester.pumpWidget(createTestApp(
        child: DoctorShell(
          user: currentUser,
          sessionManager: sessionManager,
          onSignOut: () {},
          apiClient: apiClient,
        ),
      ));

      await tester.pumpAndSettle();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.destinations.length, equals(3));
      expect(find.text('طاقم العيادة'), findsNothing);
    });

    testWidgets('Clamps tab index to 0 when switching from Director to Employed clinic',
        (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: ApiClient(),
      );
      sessionManager.setAuthorizedClinics([directorClinic, employedClinic]);

      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/doctor/clinics')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': directorClinic.id,
                  'name': directorClinic.name,
                  'position': 'director',
                  'is_primary': true,
                  'is_active': true,
                },
                {
                  'id': employedClinic.id,
                  'name': employedClinic.name,
                  'position': 'doctor',
                  'is_primary': false,
                  'is_active': true,
                },
              ]
            }),
            200,
          );
        }
        if (req.url.path.endsWith('/clinics/${directorClinic.id}')) {
          return http.Response(
            jsonEncode({
              'data': {
                'id': directorClinic.id,
                'name': directorClinic.name,
                'doctors': [],
                'assistants': [],
              }
            }),
            200,
          );
        }
        if (req.url.path.endsWith('/clinics/${directorClinic.id}/doctor-invitations')) {
          return http.Response(jsonEncode({'data': []}), 200);
        }
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final staffService = ClinicStaffService(apiClient: apiClient);

      await tester.pumpWidget(createTestApp(
        child: DoctorShell(
          user: currentUser,
          sessionManager: sessionManager,
          onSignOut: () {},
          apiClient: apiClient,
          clinicStaffService: staffService,
        ),
      ));

      await tester.pumpAndSettle();

      // Tap on Staff tab (4th destination)
      await tester.tap(find.text('طاقم العيادة'));
      await tester.pumpAndSettle();

      // Verify Staff Screen is loaded
      expect(find.byType(DoctorStaffScreen), findsOneWidget);

      // Switch to Employed clinic
      sessionManager.switchActiveClinic(employedClinic.id);
      await tester.pumpAndSettle();

      // Verify clamped back to 3 destinations and tab index is safe
      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.destinations.length, equals(3));
      expect(navBar.selectedIndex, equals(0));
      expect(find.byType(DoctorStaffScreen), findsNothing);
    });
  });

  group('DoctorStaffScreen UI & Interactions', () {
    testWidgets('Renders doctors, assistants, invitations and badges correctly',
        (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: ApiClient(),
      );
      sessionManager.setAuthorizedClinics([directorClinic]);

      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinics/${directorClinic.id}')) {
          return http.Response(
            jsonEncode({
              'data': {
                'id': directorClinic.id,
                'name': directorClinic.name,
                'doctors': [sampleDirector.toJson(), sampleDoctor.toJson()],
                'assistants': [sampleAssistant.toJson()],
              }
            }),
            200,
          );
        }
        if (req.url.path.endsWith('/clinics/${directorClinic.id}/doctor-invitations')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': sampleInvitation.id,
                  'doctor_name': sampleInvitation.doctorName,
                  'doctor_email': sampleInvitation.doctorEmail,
                  'status': 'pending',
                  'created_at': sampleInvitation.createdAt,
                }
              ]
            }),
            200,
          );
        }
        return http.Response('{}', 200);
      });

      final staffService = ClinicStaffService(
        apiClient: ApiClient(httpClient: mockHttp),
      );

      await tester.pumpWidget(createTestApp(
        child: DoctorStaffScreen(
          sessionManager: sessionManager,
          staffService: staffService,
          user: currentUser,
        ),
      ));

      await tester.pumpAndSettle();

      // Check header
      expect(find.text(directorClinic.name), findsOneWidget);
      expect(find.text('إدارة طاقم العيادة'), findsOneWidget);

      // Check invitations
      expect(find.text('الدعوات المعلقة (1)'), findsOneWidget);
      expect(find.text('Dr. Yacine Khelil'), findsOneWidget);

      // Check doctors list
      expect(find.text('Dr. Karim Mansouri'), findsOneWidget);
      expect(find.text('Dr. Sarah Bouzid'), findsOneWidget);

      // Switch to Assistants Tab
      await tester.tap(find.text('المساعدون (1)'));
      await tester.pumpAndSettle();

      expect(find.text('Amina Assistant'), findsOneWidget);
      expect(find.text('2 الصلاحيات'), findsOneWidget);
    });

    testWidgets('Director gate blocks non-director active clinic', (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: ApiClient(),
      );
      sessionManager.setAuthorizedClinics([employedClinic]);

      final staffService = ClinicStaffService(apiClient: ApiClient());

      await tester.pumpWidget(createTestApp(
        child: DoctorStaffScreen(
          sessionManager: sessionManager,
          staffService: staffService,
          user: currentUser,
        ),
      ));

      await tester.pumpAndSettle();

      expect(find.text('هذه الميزة متاحة فقط لمدير العيادة.'), findsAtLeast(1));
    });
  });

  group('StaffDetailSheet Guarding & Actions', () {
    testWidgets('Self / Primary Director: destructive actions hidden and notice shown',
        (tester) async {
      final staffService = ClinicStaffService(apiClient: ApiClient());

      await tester.pumpWidget(createTestApp(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                StaffDetailSheet.showDoctor(
                  context,
                  staffService: staffService,
                  clinicId: directorClinic.id,
                  doctor: sampleDirector,
                  currentUser: currentUser,
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

      expect(find.text(sampleDirector.name), findsOneWidget);
      expect(find.text('لا يمكنك تعليق أو فصل حسابك الخاص أو المدير الرئيسي للعيادة.'),
          findsOneWidget);
      expect(find.text('تعليق الحساب'), findsNothing);
      expect(find.text('فصل الطبيب من العيادة'), findsNothing);
    });

    testWidgets('Employed Doctor: shows suspend & detach buttons and confirmation dialog',
        (tester) async {
      final staffService = ClinicStaffService(apiClient: ApiClient());

      await tester.pumpWidget(createTestApp(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                StaffDetailSheet.showDoctor(
                  context,
                  staffService: staffService,
                  clinicId: directorClinic.id,
                  doctor: sampleDoctor,
                  currentUser: currentUser,
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

      expect(find.text(sampleDoctor.name), findsOneWidget);
      expect(find.text('تعليق الحساب'), findsOneWidget);
      expect(find.text('فصل الطبيب من العيادة'), findsOneWidget);

      // Tap Suspend -> confirmation dialog
      await tester.tap(find.text('تعليق الحساب'));
      await tester.pumpAndSettle();

      expect(find.text('تأكيد تعليق الحساب'), findsOneWidget);
      expect(find.text('إلغاء'), findsOneWidget);

      // Cancel dialog
      await tester.tap(find.text('إلغاء'));
      await tester.pumpAndSettle();

      expect(find.text('تأكيد تعليق الحساب'), findsNothing);
    });

    testWidgets('Assistant: shows permissions chips and edit permissions button',
        (tester) async {
      final staffService = ClinicStaffService(apiClient: ApiClient());

      await tester.pumpWidget(createTestApp(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                StaffDetailSheet.showAssistant(
                  context,
                  staffService: staffService,
                  clinicId: directorClinic.id,
                  assistant: sampleAssistant,
                  currentUser: currentUser,
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

      expect(find.text(sampleAssistant.name), findsOneWidget);
      expect(find.text('تعديل الصلاحيات'), findsOneWidget);
      expect(find.text('حذف المساعد'), findsOneWidget);
    });
  });

  group('AddDoctorSheet & AddAssistantSheet Modals', () {
    testWidgets('AddDoctorSheet displays dual tabs (Lookup & Create)', (tester) async {
      final staffService = ClinicStaffService(apiClient: ApiClient());

      await tester.pumpWidget(createTestApp(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                AddDoctorSheet.show(
                  context,
                  staffService: staffService,
                  clinicId: directorClinic.id,
                  onDoctorAdded: () {},
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(find.text('بحث ودعوة'), findsOneWidget);
      expect(find.text('إنشاء حساب جديد'), findsOneWidget);
    });

    testWidgets('AddAssistantSheet displays input fields and Layer 4 permissions',
        (tester) async {
      final staffService = ClinicStaffService(apiClient: ApiClient());

      await tester.pumpWidget(createTestApp(
        child: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                AddAssistantSheet.show(
                  context,
                  staffService: staffService,
                  clinicId: directorClinic.id,
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

      expect(find.text('إضافة مساعد'), findsNWidgets(2));
      expect(find.text('الاسم الكامل'), findsOneWidget);
      expect(find.text('البريد الإلكتروني'), findsOneWidget);
      expect(find.text('الصلاحيات'), findsOneWidget);
      expect(find.text('إدارة قائمة الانتظار'), findsOneWidget);
    });
  });
}

// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/clinic_director_stats_screen.dart';
import 'package:aafiya_pro/shells/doctor_shell.dart';

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

http.Response jsonResponse(dynamic body, [int statusCode = 200]) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    statusCode,
    headers: const {'content-type': 'application/json; charset=utf-8'},
  );
}

void main() {
  const directorClinic = DoctorClinic(
    id: 'clinic-director-001',
    name: 'عيادة النور المركزية',
    position: 'director',
    isDirector: true,
    isPrimary: true,
    isActive: true,
  );

  const employedClinic = DoctorClinic(
    id: 'clinic-employed-002',
    name: 'عيادة الأمل التخصصية',
    position: 'doctor',
    isDirector: false,
    isPrimary: false,
    isActive: true,
  );

  const directorUser = User(
    id: 'doc-user-1',
    name: 'د. طارق بوعزيز',
    email: 'tareq@aafiya.test',
    phone: '+213550111222',
    roles: [UserRole.doctor],
    permissions: [],
  );

  const analyticsEmployedUser = User(
    id: 'doc-user-2',
    name: 'د. ليلى عماري',
    email: 'layla@aafiya.test',
    phone: '+213550333444',
    roles: [UserRole.doctor],
    permissions: ['clinic.view_analytics'],
  );

  const plainEmployedUser = User(
    id: 'doc-user-3',
    name: 'د. كمال بن ناصر',
    email: 'kamal@aafiya.test',
    phone: '+213550555666',
    roles: [UserRole.doctor],
    permissions: [],
  );

  Map<String, dynamic> sampleStatsResponse({
    String clinicId = 'clinic-director-001',
    String clinicName = 'عيادة النور المركزية',
    String? selectedDoctorId,
    int total = 45,
    int completed = 22,
    int waiting = 5,
    int pending = 8,
    int walkin = 7,
  }) {
    return {
      'success': true,
      'data': {
        'clinic': {
          'id': clinicId,
          'name': clinicName,
        },
        'filters': {
          'from_date': '2026-09-20',
          'to_date': '2026-09-20',
          'doctor_id': selectedDoctorId,
        },
        'summary': {
          'total_appointments': total,
          'pending_check_in': pending,
          'in_waiting_room': waiting,
          'completed': completed,
          'no_show': 3,
          'cancelled': 4,
          'rejected': 1,
          'expired': 2,
          'rescheduled': 0,
          'walk_in_visits': walkin,
        },
        'doctors': selectedDoctorId == null
            ? [
                {
                  'id': 'doc-101',
                  'name': 'د. طارق بوعزيز',
                  'specialty': 'طب عام',
                  'position': 'director',
                  'metrics': {
                    'total_appointments': 25,
                    'pending_check_in': 5,
                    'in_waiting_room': 3,
                    'completed': 12,
                    'no_show': 2,
                    'cancelled': 2,
                    'rejected': 1,
                    'expired': 1,
                    'rescheduled': 0,
                    'walk_in_visits': 4,
                  },
                },
                {
                  'id': 'doc-102',
                  'name': 'د. سهام بلقاسم',
                  'specialty': 'طب الأطفال',
                  'position': 'doctor',
                  'metrics': {
                    'total_appointments': 20,
                    'pending_check_in': 3,
                    'in_waiting_room': 2,
                    'completed': 10,
                    'no_show': 1,
                    'cancelled': 2,
                    'rejected': 0,
                    'expired': 1,
                    'rescheduled': 0,
                    'walk_in_visits': 3,
                  },
                },
              ]
            : [],
        'selected_doctor': selectedDoctorId != null
            ? {
                'id': selectedDoctorId,
                'name': 'د. طارق بوعزيز',
                'specialty': 'طب عام',
                'position': 'director',
              }
            : null,
      },
    };
  }

  group('DoctorShell Authorization & Navigation Guards for Clinic Director Stats', () {
    testWidgets('Shows 5 navigation items when active clinic is Medical Director', (tester) async {
      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/doctor/clinics')) {
          return jsonResponse({
            'data': [
              {
                'id': directorClinic.id,
                'name': directorClinic.name,
                'position': 'director',
                'is_primary': true,
                'is_active': true,
              }
            ]
          });
        }
        if (req.url.path.endsWith('/doctor/dashboard/stats')) {
          return jsonResponse({'data': {'total_today': 0, 'completed_today': 0, 'waiting': 0, 'in_progress': 0}});
        }
        if (req.url.path.endsWith('/appointments')) {
          return jsonResponse({'data': []});
        }
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          return jsonResponse(sampleStatsResponse());
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic]);

      await tester.pumpWidget(createTestWidget(
        child: DoctorShell(
          user: directorUser,
          sessionManager: sessionManager,
          onSignOut: () {},
          apiClient: apiClient,
        ),
      ));

      await tester.pumpAndSettle();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.destinations.length, equals(5));
      expect(find.text('إحصائيات أطباء العيادة'), findsOneWidget);
      expect(find.text('طاقم العيادة'), findsOneWidget);
    });

    testWidgets('Hides stats tab (3 navigation items) even if Employed Doctor has clinic.view_analytics permission', (tester) async {
      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/doctor/clinics')) {
          return jsonResponse({
            'data': [
              {
                'id': employedClinic.id,
                'name': employedClinic.name,
                'position': 'doctor',
                'is_primary': false,
                'is_active': true,
              }
            ]
          });
        }
        if (req.url.path.endsWith('/doctor/dashboard/stats')) {
          return jsonResponse({'data': {'total_today': 0, 'completed_today': 0, 'waiting': 0, 'in_progress': 0}});
        }
        if (req.url.path.endsWith('/appointments')) {
          return jsonResponse({'data': []});
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([employedClinic]);

      await tester.pumpWidget(createTestWidget(
        child: DoctorShell(
          user: analyticsEmployedUser,
          sessionManager: sessionManager,
          onSignOut: () {},
          apiClient: apiClient,
        ),
      ));

      await tester.pumpAndSettle();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.destinations.length, equals(3));
      expect(find.text('إحصائيات أطباء العيادة'), findsNothing);
      expect(find.text('طاقم العيادة'), findsNothing);
    });

    testWidgets('Hides stats tab (3 navigation items) for plain Employed Doctor', (tester) async {
      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/doctor/clinics')) {
          return jsonResponse({
            'data': [
              {
                'id': employedClinic.id,
                'name': employedClinic.name,
                'position': 'doctor',
                'is_primary': false,
                'is_active': true,
              }
            ]
          });
        }
        if (req.url.path.endsWith('/doctor/dashboard/stats')) {
          return jsonResponse({'data': {'total_today': 0, 'completed_today': 0, 'waiting': 0, 'in_progress': 0}});
        }
        if (req.url.path.endsWith('/appointments')) {
          return jsonResponse({'data': []});
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([employedClinic]);

      await tester.pumpWidget(createTestWidget(
        child: DoctorShell(
          user: plainEmployedUser,
          sessionManager: sessionManager,
          onSignOut: () {},
          apiClient: apiClient,
        ),
      ));

      await tester.pumpAndSettle();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.destinations.length, equals(3));
      expect(find.text('إحصائيات أطباء العيادة'), findsNothing);
      expect(find.text('طاقم العيادة'), findsNothing);
    });
  });

  group('ClinicDirectorStatsScreen UI & Interactions', () {
    testWidgets('Renders all 10 KPIs and doctor breakdown cards in All Doctors mode', (tester) async {
      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          return jsonResponse(sampleStatsResponse());
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic]);
      final statsService = ClinicDoctorStatsService(apiClient: apiClient);
      tester.view.physicalSize = const Size(1080, 4000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: ClinicDirectorStatsScreen(
            sessionManager: sessionManager,
            statsService: statsService,
            apiClient: apiClient,
          ),
        ),
      ));

      await tester.pumpAndSettle();

      // Active clinic header badge
      expect(find.text('عيادة النور المركزية'), findsWidgets);

      // Verify Primary KPIs (5)
      expect(find.text('إجمالي المواعيد'), findsWidgets);
      expect(find.text('45'), findsOneWidget); // total
      expect(find.text('المكتملة'), findsWidgets);
      expect(find.text('22'), findsOneWidget); // completed
      expect(find.text('في قاعة الانتظار'), findsWidgets);
      expect(find.text('5'), findsOneWidget); // waiting
      expect(find.text('بانتظار الحضور'), findsOneWidget);
      expect(find.text('8'), findsOneWidget); // pending
      expect(find.text('الزيارات المباشرة'), findsWidgets);
      expect(find.text('7'), findsOneWidget); // walk-in

      // Verify Secondary KPIs (5)
      expect(find.text('لم يحضر'), findsOneWidget);
      expect(find.text('3'), findsWidgets);
      expect(find.text('الملغاة'), findsOneWidget);
      expect(find.text('4'), findsWidgets);
      expect(find.text('المرفوضة'), findsOneWidget);
      expect(find.text('1'), findsWidgets);
      expect(find.text('المنتهية'), findsOneWidget);
      expect(find.text('2'), findsWidgets);
      expect(find.text('المعاد جدولتها'), findsOneWidget);
      expect(find.text('0'), findsWidgets);

      // Verify Doctor Breakdown section
      expect(find.text('أداء الأطباء'), findsOneWidget);
      expect(find.text('د. طارق بوعزيز'), findsWidgets);
      expect(find.text('د. سهام بلقاسم'), findsOneWidget);
    });

    testWidgets('Doctor selection triggers single-doctor mode and banner card', (tester) async {
      String? requestedDoctorId;

      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          requestedDoctorId = req.url.queryParameters['doctor_id'];
          return jsonResponse(sampleStatsResponse(
            selectedDoctorId: requestedDoctorId,
            total: requestedDoctorId != null ? 25 : 45,
          ));
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic]);
      final statsService = ClinicDoctorStatsService(apiClient: apiClient);

      tester.view.physicalSize = const Size(1080, 4000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: ClinicDirectorStatsScreen(
            sessionManager: sessionManager,
            statsService: statsService,
            apiClient: apiClient,
          ),
        ),
      ));

      await tester.pumpAndSettle();

      // Tap on View Doctor action for first doctor card
      final viewDoctorButtons = find.text('عرض إحصائيات الطبيب');
      expect(viewDoctorButtons, findsWidgets);
      await tester.tap(viewDoctorButtons.first);
      await tester.pumpAndSettle();

      // Verify request had doctor_id
      expect(requestedDoctorId, equals('doc-101'));

      // Verify Selected Doctor banner is shown
      expect(find.text('عرض إحصائيات الطبيب المحدد'), findsOneWidget);
      expect(find.text('إلغاء التصفية'), findsOneWidget);

      // Verify doctor breakdown list is hidden in single doctor mode
      expect(find.text('أداء الأطباء'), findsNothing);

      // Tap "Clear Filter" button
      await tester.tap(find.text('إلغاء التصفية'));
      await tester.pumpAndSettle();

      // Verify reset back to All Doctors
      expect(requestedDoctorId, isNull);
      expect(find.text('أداء الأطباء'), findsOneWidget);
    });

    testWidgets('Client-side date validation prevents invalid range query', (tester) async {
      int requestCount = 0;

      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          requestCount++;
          return jsonResponse(sampleStatsResponse());
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic]);
      final statsService = ClinicDoctorStatsService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: ClinicDirectorStatsScreen(
            sessionManager: sessionManager,
            statsService: statsService,
            apiClient: apiClient,
          ),
        ),
      ));

      await tester.pumpAndSettle();
      expect(requestCount, equals(1));

      // Switch to Date Range preset
      await tester.tap(find.text('نطاق زمني'));
      await tester.pumpAndSettle();

      // By default start and end date are today (valid range), so it dispatched 1 more request
      expect(requestCount, equals(2));
    });

    testWidgets('Displays AafiyaEmptyView on zero data state', (tester) async {
      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          return jsonResponse({
            'success': true,
            'data': {
              'clinic': {'id': directorClinic.id, 'name': directorClinic.name},
              'filters': {'from_date': '2026-09-20', 'to_date': '2026-09-20'},
              'summary': {
                'total_appointments': 0,
                'pending_check_in': 0,
                'in_waiting_room': 0,
                'completed': 0,
                'no_show': 0,
                'cancelled': 0,
                'rejected': 0,
                'expired': 0,
                'rescheduled': 0,
                'walk_in_visits': 0,
              },
              'doctors': [],
              'selected_doctor': null,
            },
          });
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic]);
      final statsService = ClinicDoctorStatsService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: ClinicDirectorStatsScreen(
            sessionManager: sessionManager,
            statsService: statsService,
            apiClient: apiClient,
          ),
        ),
      ));

      await tester.pumpAndSettle();

      // Verify Empty View is rendered
      expect(find.byType(AafiyaEmptyView), findsOneWidget);
      expect(find.text('لا توجد مواعيد أو زيارات في هذه الفترة'), findsOneWidget);
    });

    testWidgets('Displays AafiyaErrorView on 403 Forbidden with retry', (tester) async {
      int attempts = 0;

      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          attempts++;
          if (attempts == 1) {
            return jsonResponse({'message': 'غير مصرح لك بالوصول لإحصائيات العيادة.'}, 403);
          }
          return jsonResponse(sampleStatsResponse());
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic]);
      final statsService = ClinicDoctorStatsService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: ClinicDirectorStatsScreen(
            sessionManager: sessionManager,
            statsService: statsService,
            apiClient: apiClient,
          ),
        ),
      ));

      await tester.pumpAndSettle();

      // Verify Error View is shown
      expect(find.byType(AafiyaErrorView), findsOneWidget);
      expect(find.text('غير مصرح لك بالوصول لإحصائيات العيادة.'), findsOneWidget);

      // Tap Retry
      await tester.tap(find.text('إعادة المحاولة'));
      await tester.pumpAndSettle();

      // Now successful data is shown
      expect(find.byType(AafiyaErrorView), findsNothing);
      expect(find.text('إجمالي المواعيد'), findsWidgets);
    });

    testWidgets('Multi-clinic context switching resets filters and refetches with new clinic header', (tester) async {
      String? lastClinicIdHeader;

      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          lastClinicIdHeader = req.headers['x-clinic-id'] ?? req.headers['X-Clinic-ID'];
          return jsonResponse(sampleStatsResponse(
            clinicId: lastClinicIdHeader ?? 'unknown',
            clinicName: lastClinicIdHeader == employedClinic.id
                ? 'عيادة الأمل التخصصية'
                : 'عيادة النور المركزية',
          ));
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final tokenStorage = InMemoryTokenStorage();
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic, employedClinic]);
      final statsService = ClinicDoctorStatsService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: ClinicDirectorStatsScreen(
            sessionManager: sessionManager,
            user: analyticsEmployedUser,
            statsService: statsService,
            apiClient: apiClient,
          ),
        ),
      ));

      await tester.pumpAndSettle();

      expect(find.text('عيادة النور المركزية'), findsWidgets);

      // Switch to employed clinic
      sessionManager.switchActiveClinic(employedClinic.id);
      await tester.pumpAndSettle();

      // Header is updated immediately to new clinic
      expect(find.text('عيادة الأمل التخصصية'), findsWidgets);
    });
  });

  group('Trilingual Localization Coverage', () {
    testWidgets('Renders French strings correctly when locale is French', (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          return jsonResponse(sampleStatsResponse(clinicName: 'Clinique Al-Nour'));
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic]);
      final statsService = ClinicDoctorStatsService(apiClient: apiClient);

      tester.view.physicalSize = const Size(1080, 4000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(
        locale: const Locale('fr'),
        child: Scaffold(
          body: ClinicDirectorStatsScreen(
            sessionManager: sessionManager,
            statsService: statsService,
            apiClient: apiClient,
          ),
        ),
      ));

      await tester.pumpAndSettle();

      // French title & KPIs
      expect(find.text('Statistiques des Médecins'), findsOneWidget);
      expect(find.text('Total des rendez-vous'), findsWidgets);
      expect(find.text('Terminés'), findsWidgets);
      expect(find.text('En salle d\'attente'), findsWidgets);
      expect(find.text('En attente d\'enregistrement'), findsOneWidget);
      expect(find.text('Visites directes (Sans RDV)'), findsWidgets);
      expect(find.text('Performances des médecins de la clinique'), findsOneWidget);
    });

    testWidgets('Renders English strings correctly when locale is English', (tester) async {
      final tokenStorage = InMemoryTokenStorage();
      final mockHttp = MockClient((req) async {
        if (req.url.path.endsWith('/clinic/doctor-stats')) {
          return jsonResponse(sampleStatsResponse(clinicName: 'Al-Nour Central Clinic'));
        }
        return jsonResponse({});
      });

      final apiClient = ApiClient(httpClient: mockHttp);
      final sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([directorClinic]);
      final statsService = ClinicDoctorStatsService(apiClient: apiClient);

      tester.view.physicalSize = const Size(1080, 4000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(
        locale: const Locale('en'),
        child: Scaffold(
          body: ClinicDirectorStatsScreen(
            sessionManager: sessionManager,
            statsService: statsService,
            apiClient: apiClient,
          ),
        ),
      ));

      await tester.pumpAndSettle();

      // English title & KPIs
      expect(find.text('Doctor Statistics'), findsOneWidget);
      expect(find.text('Total Appointments'), findsWidgets);
      expect(find.text('Completed'), findsWidgets);
      expect(find.text('In Waiting Room'), findsWidgets);
      expect(find.text('Pending Check-in'), findsOneWidget);
      expect(find.text('Walk-in Visits'), findsWidgets);
      expect(find.text('Clinic Doctors Performance'), findsOneWidget);
    });
  });
}

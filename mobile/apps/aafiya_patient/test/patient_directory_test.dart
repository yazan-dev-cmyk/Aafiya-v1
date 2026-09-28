// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/screens/clinic_directory_screen.dart';
import 'package:aafiya_patient/screens/doctor_directory_screen.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';
import 'package:aafiya_patient/widgets/clinic_card.dart';
import 'package:aafiya_patient/widgets/doctor_card.dart';

void main() {
  group('TASK-03-03: Doctor & Clinic Directory Tests', () {
    late InMemoryTokenStorage tokenStorage;

    const mockDoctor1 = Doctor(
      id: 'doc-1',
      name: 'د. كريم بلقاسم',
      specialty: 'أمراض القلب',
      bio: 'طبيب اختصاصي في أمراض وجراحة القلب والشرايين خبرة 15 سنة.',
      isVerified: true,
      clinics: [
        DoctorClinicAffiliation(
          id: 'clinic-1',
          name: 'عيادة الشفاء التخصصية',
          wilaya: 'الجزائر',
          address: '12 شارع ديدوش مراد',
          phone: '021445566',
        ),
      ],
    );

    const mockDoctor2 = Doctor(
      id: 'doc-2',
      name: 'د. نادية منصوري',
      specialty: 'طب الأطفال',
      bio: 'أخصائية في طب الأطفال وحديثي الولادة.',
      isVerified: false,
      clinics: [],
    );

    const mockClinic1 = Clinic(
      id: 'clinic-1',
      name: 'عيادة الشفاء التخصصية',
      address: '12 شارع ديدوش مراد',
      wilaya: 'الجزائر',
      phone: '021445566',
      director: ClinicDirector(
        id: 'dir-1',
        name: 'د. أحمد تواتي',
        specialty: 'الطب العام',
      ),
      doctors: [
        ClinicDoctorAffiliation(
          id: 'doc-1',
          name: 'د. كريم بلقاسم',
          specialty: 'أمراض القلب',
        ),
      ],
    );

    const mockClinic3 = Clinic(
      id: 'clinic-3',
      name: 'مصحة النجاح',
      address: 'شارع فلسطين',
      wilaya: 'وهران',
      phone: '041223344',
      director: null,
      doctors: [],
    );

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

    Widget createTestableWidget({
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
        home: Scaffold(body: child),
      );
    }

    // =========================================================================
    // 1. DoctorCard Component Tests
    // =========================================================================
    group('1. DoctorCard Component', () {
      testWidgets('renders doctor name, specialty, bio, and verified badge', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DoctorCard(doctor: mockDoctor1),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('د. كريم بلقاسم'), findsOneWidget);
        expect(find.text('أمراض القلب'), findsOneWidget);
        expect(find.textContaining('طبيب اختصاصي'), findsOneWidget);
        expect(find.text('طبيب معتمد'), findsOneWidget);
        expect(find.byIcon(Icons.verified_rounded), findsOneWidget);
        expect(find.text('عيادة الشفاء التخصصية'), findsOneWidget);
        expect(find.textContaining('الجزائر'), findsOneWidget);
        expect(find.text('021445566'), findsOneWidget);
      });

      testWidgets('renders unverified doctor without verified badge and empty clinics notice', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DoctorCard(doctor: mockDoctor2),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('د. نادية منصوري'), findsOneWidget);
        expect(find.text('طب الأطفال'), findsOneWidget);
        expect(find.text('طبيب معتمد'), findsNothing);
        expect(find.text('لا توجد عيادات تابعة مسجلة.'), findsOneWidget);
      });

      testWidgets('DISC-01: Proves zero booking buttons in DoctorCard', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DoctorCard(doctor: mockDoctor1),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.textContaining('احجز'), findsNothing);
        expect(find.textContaining('حجز'), findsNothing);
        expect(find.textContaining('Book'), findsNothing);
        expect(find.byType(ElevatedButton), findsNothing);
      });
    });

    // =========================================================================
    // 2. ClinicCard Component Tests
    // =========================================================================
    group('2. ClinicCard Component', () {
      testWidgets('renders clinic name, wilaya tag, address, phone, and director', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const ClinicCard(clinic: mockClinic1),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('عيادة الشفاء التخصصية'), findsOneWidget);
        expect(find.text('الجزائر'), findsWidgets);
        expect(find.text('12 شارع ديدوش مراد'), findsOneWidget);
        expect(find.text('021445566'), findsOneWidget);
        expect(find.textContaining('د. أحمد تواتي'), findsOneWidget);
        expect(find.textContaining('د. كريم بلقاسم'), findsOneWidget);
      });

      testWidgets('renders clinic with no doctors and no director gracefully', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const ClinicCard(clinic: mockClinic3),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('مصحة النجاح'), findsOneWidget);
        expect(find.text('وهران'), findsWidgets);
        expect(find.text('شارع فلسطين'), findsOneWidget);
        expect(find.text('041223344'), findsOneWidget);
      });

      testWidgets('DISC-01: Proves zero booking buttons in ClinicCard', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const ClinicCard(clinic: mockClinic1),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.textContaining('احجز'), findsNothing);
        expect(find.textContaining('حجز'), findsNothing);
        expect(find.textContaining('Book'), findsNothing);
        expect(find.byType(ElevatedButton), findsNothing);
      });
    });

    // =========================================================================
    // 3. DoctorDirectoryScreen Pagination & Lifecycle Tests
    // =========================================================================
    group('3. DoctorDirectoryScreen Tests', () {
      testWidgets('renders loading state initially and then shows doctors', (tester) async {
        final mockClient = MockClient((request) async {
          expect(request.url.path, '/api/v1/doctors');
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {
                  'id': 'doc-1',
                  'name': 'د. كريم بلقاسم',
                  'specialty': 'أمراض القلب',
                  'bio': 'طبيب اختصاصي',
                  'is_verified': true,
                  'clinics': [],
                }
              ],
              'meta': {
                'current_page': 1,
                'last_page': 1,
                'per_page': 10,
                'total': 1,
              },
              'links': {'next': null, 'prev': null},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        // Initial frame shows loading
        expect(find.byType(AafiyaLoadingView), findsOneWidget);

        await tester.pumpAndSettle();

        // Loaded list shows doctor
        expect(find.byType(AafiyaLoadingView), findsNothing);
        expect(find.text('د. كريم بلقاسم'), findsOneWidget);
        expect(find.descendant(of: find.byType(DoctorCard), matching: find.text('أمراض القلب')), findsOneWidget);
        expect(find.text('تم عرض جميع النتائج.'), findsOneWidget);
      });

      testWidgets('multi-page pagination: scroll triggers page 2 and appends results', (tester) async {
        int requestedPage = 0;
        final mockClient = MockClient((request) async {
          final pageParam = int.tryParse(request.url.queryParameters['page'] ?? '1') ?? 1;
          requestedPage = pageParam;

          if (pageParam == 1) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': [
                  {
                    'id': 'doc-1',
                    'name': 'د. كريم بلقاسم',
                    'specialty': 'أمراض القلب',
                    'is_verified': true,
                    'clinics': [],
                  },
                  {
                    'id': 'doc-2',
                    'name': 'د. نادية منصوري',
                    'specialty': 'طب الأطفال',
                    'is_verified': false,
                    'clinics': [],
                  },
                ],
                'meta': {
                  'current_page': 1,
                  'last_page': 2,
                  'per_page': 2,
                  'total': 3,
                },
                'links': {'next': '/api/v1/doctors?page=2', 'prev': null},
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          } else {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': [
                  {
                    'id': 'doc-3',
                    'name': 'د. يوسف حداد',
                    'specialty': 'طب العيون',
                    'is_verified': true,
                    'clinics': [],
                  },
                ],
                'meta': {
                  'current_page': 2,
                  'last_page': 2,
                  'per_page': 2,
                  'total': 3,
                },
                'links': {'next': null, 'prev': '/api/v1/doctors?page=1'},
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        await tester.pumpWidget(
          createTestableWidget(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        // Page 1 is displayed
        expect(find.text('د. كريم بلقاسم'), findsOneWidget);
        expect(find.text('د. نادية منصوري'), findsOneWidget);
        expect(find.text('د. يوسف حداد'), findsNothing);

        // Ensure load more button is visible and tap to trigger page 2
        await tester.ensureVisible(find.text('تحميل المزيد'));
        await tester.tap(find.text('تحميل المزيد'));
        await tester.pumpAndSettle();

        // Page 2 doctors are now appended
        expect(requestedPage, 2);
        expect(find.text('د. كريم بلقاسم'), findsOneWidget);
        expect(find.text('د. نادية منصوري'), findsOneWidget);
        expect(find.text('د. يوسف حداد'), findsOneWidget);
        expect(find.text('تم عرض جميع النتائج.'), findsOneWidget);
      });

      testWidgets('next-page failure shows retry button and clicking retry loads page 2', (tester) async {
        int attempts = 0;
        final mockClient = MockClient((request) async {
          final pageParam = int.tryParse(request.url.queryParameters['page'] ?? '1') ?? 1;

          if (pageParam == 1) {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': [
                  {
                    'id': 'doc-1',
                    'name': 'د. كريم بلقاسم',
                    'specialty': 'أمراض القلب',
                    'is_verified': true,
                    'clinics': [],
                  },
                ],
                'meta': {
                  'current_page': 1,
                  'last_page': 2,
                  'per_page': 1,
                  'total': 2,
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          } else {
            attempts++;
            if (attempts == 1) {
              return http.Response(
                jsonEncode({'message': 'Server error loading next page'}),
                500,
                headers: {'content-type': 'application/json; charset=utf-8'},
              );
            } else {
              return http.Response(
                jsonEncode({
                  'status': 'success',
                  'data': [
                    {
                      'id': 'doc-2',
                      'name': 'د. نادية منصوري',
                      'specialty': 'طب الأطفال',
                      'is_verified': false,
                      'clinics': [],
                    },
                  ],
                  'meta': {
                    'current_page': 2,
                    'last_page': 2,
                    'per_page': 1,
                    'total': 2,
                  },
                }),
                200,
                headers: {'content-type': 'application/json; charset=utf-8'},
              );
            }
          }
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        // Page 1 is displayed
        expect(find.text('د. كريم بلقاسم'), findsOneWidget);

        // Tap load more button to trigger page 2 (which fails)
        await tester.tap(find.text('تحميل المزيد'));
        await tester.pumpAndSettle();

        // Error footer is shown
        expect(find.text('فشل تحميل المزيد، انقر للمحاولة مجدداً.'), findsOneWidget);
        expect(find.byType(OutlinedButton), findsOneWidget);

        // Tap retry button
        await tester.tap(find.byType(OutlinedButton));
        await tester.pumpAndSettle();

        // Page 2 is now loaded successfully
        expect(find.text('د. نادية منصوري'), findsOneWidget);
        expect(find.text('تم عرض جميع النتائج.'), findsOneWidget);
      });

      testWidgets('search query debounces and queries API resetting to page 1', (tester) async {
        String? lastSearchQuery;
        final mockClient = MockClient((request) async {
          lastSearchQuery = request.url.queryParameters['search'];
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {
                  'id': 'doc-1',
                  'name': 'د. كريم بلقاسم',
                  'specialty': 'أمراض القلب',
                  'is_verified': true,
                  'clinics': [],
                },
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();
        expect(lastSearchQuery, isNull);

        // Enter search text
        await tester.enterText(find.byType(TextField).first, 'كريم');
        // Wait for debounce timer (400ms)
        await tester.pump(const Duration(milliseconds: 500));
        await tester.pumpAndSettle();

        expect(lastSearchQuery, 'كريم');
      });

      testWidgets('specialty filter chip resets page to 1 and passes specialty query param', (tester) async {
        String? lastSpecialty;
        final mockClient = MockClient((request) async {
          lastSpecialty = request.url.queryParameters['specialty'];
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 0},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        // Tap specialty chip 'أمراض القلب'
        await tester.tap(find.text('أمراض القلب'));
        await tester.pumpAndSettle();

        expect(lastSpecialty, 'أمراض القلب');
      });

      testWidgets('empty results view is rendered when zero doctors found', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 0},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        expect(find.byType(AafiyaEmptyView), findsOneWidget);
        expect(find.text('لم يتم العثور على أطباء مطابقين للبحث.'), findsOneWidget);
      });

      testWidgets('initial error displays AafiyaErrorView and retry works', (tester) async {
        int callCount = 0;
        final mockClient = MockClient((request) async {
          callCount++;
          if (callCount <= 3) {
            return http.Response(
              jsonEncode({'message': 'Network timeout'}),
              503,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          } else {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': [
                  {
                    'id': 'doc-1',
                    'name': 'د. كريم بلقاسم',
                    'specialty': 'أمراض القلب',
                    'is_verified': true,
                    'clinics': [],
                  },
                ],
                'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 1},
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
        });

        final apiClient = ApiClient(
          httpClient: mockClient,
          tokenStorage: tokenStorage,
          retryPolicy: const RetryPolicy(useDelays: false),
        );

        await tester.pumpWidget(
          createTestableWidget(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        expect(find.byType(AafiyaErrorView), findsOneWidget);

        // Tap retry
        await tester.tap(find.text('إعادة المحاولة'));
        await tester.pumpAndSettle();

        expect(find.text('د. كريم بلقاسم'), findsOneWidget);
      });
    });

    // =========================================================================
    // 4. ClinicDirectoryScreen Pagination & Lifecycle Tests
    // =========================================================================
    group('4. ClinicDirectoryScreen Tests', () {
      testWidgets('renders clinics and supports wilaya filter', (tester) async {
        String? lastWilaya;
        final mockClient = MockClient((request) async {
          lastWilaya = request.url.queryParameters['wilaya'];
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {
                  'id': 'clinic-1',
                  'name': 'عيادة الشفاء التخصصية',
                  'address': '12 شارع ديدوش مراد',
                  'wilaya': 'الجزائر',
                  'phone': '021445566',
                  'director': null,
                  'doctors': [],
                },
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: ClinicDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        expect(find.text('عيادة الشفاء التخصصية'), findsOneWidget);

        // Tap wilaya chip 'الجزائر'
        await tester.tap(find.text('الجزائر').first);
        await tester.pumpAndSettle();

        expect(lastWilaya, 'الجزائر');
      });

      testWidgets('empty state is rendered when zero clinics found', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 0},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: ClinicDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        expect(find.byType(AafiyaEmptyView), findsOneWidget);
        expect(find.text('لم يتم العثور على عيادات مطابقة للبحث.'), findsOneWidget);
      });
    });

    // =========================================================================
    // 5. Patient Home Discovery Integration Tests
    // =========================================================================
    group('5. PatientHomeShell Directory Integration', () {
      testWidgets('displays Doctor & Clinic discovery cards and navigates on tap', (tester) async {
        final mockClient = MockClient((request) async {
          if (request.url.path == '/api/v1/appointments') {
            return http.Response(
              jsonEncode({'status': 'success', 'data': []}),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          if (request.url.path == '/api/v1/doctors') {
            return http.Response(
              jsonEncode({
                'status': 'success',
                'data': [],
                'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 0},
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 0},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
        final sessionManager = AuthSessionManager(
          tokenStorage: tokenStorage,
          apiClient: apiClient,
        );
        await sessionManager.setAuthenticatedUser(
          token: 'token-123',
          user: const User(
            id: 'p-1',
            name: 'أحمد',
            email: 'ahmed@aafiya.dz',
            roles: [UserRole.patient],
          ),
        );

        await tester.pumpWidget(
          createTestableWidget(
            child: PatientHomeShell(
              sessionManager: sessionManager,
              apiClient: apiClient,
              onSignOut: () {},
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Verify discovery header and cards exist on Home overview
        expect(find.text('دليل الأطباء والعيادات'), findsOneWidget);
        expect(find.text('دليل الأطباء'), findsOneWidget);
        expect(find.text('دليل العيادات'), findsOneWidget);

        // Tap Doctor Directory card
        await tester.tap(find.text('دليل الأطباء'));
        await tester.pumpAndSettle();

        // Navigated to DoctorDirectoryScreen
        expect(find.byType(DoctorDirectoryScreen), findsOneWidget);

        // Pop back to home
        Navigator.of(tester.element(find.byType(DoctorDirectoryScreen))).pop();
        await tester.pumpAndSettle();

        // Tap Clinic Directory card
        await tester.ensureVisible(find.text('دليل العيادات'));
        await tester.tap(find.text('دليل العيادات'));
        await tester.pumpAndSettle();

        // Navigated to ClinicDirectoryScreen
        expect(find.byType(ClinicDirectoryScreen), findsOneWidget);
      });
    });

    // =========================================================================
    // 6. DISC-01 Zero-Booking Comprehensive Proof
    // =========================================================================
    group('6. DISC-01 Zero-Booking Comprehensive Invariant Proof', () {
      testWidgets('verifies zero direct booking buttons across DoctorDirectoryScreen', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {
                  'id': 'doc-1',
                  'name': 'د. كريم بلقاسم',
                  'specialty': 'أمراض القلب',
                  'is_verified': true,
                  'clinics': [
                    {
                      'id': 'clinic-1',
                      'name': 'عيادة الشفاء',
                      'wilaya': 'الجزائر',
                      'phone': '021445566',
                    }
                  ],
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        expect(find.textContaining('احجز'), findsNothing);
        expect(find.textContaining('حجز موعد'), findsNothing);
        expect(find.textContaining('Book'), findsNothing);
        expect(find.textContaining('Rendez-vous'), findsNothing);
        expect(find.byType(ElevatedButton), findsNothing);
      });

      testWidgets('verifies zero direct booking buttons across ClinicDirectoryScreen', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [
                {
                  'id': 'clinic-1',
                  'name': 'عيادة الشفاء',
                  'address': 'الجزائر العاصمة',
                  'wilaya': 'الجزائر',
                  'phone': '021445566',
                  'director': null,
                  'doctors': [],
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            child: ClinicDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        expect(find.textContaining('احجز'), findsNothing);
        expect(find.textContaining('حجز موعد'), findsNothing);
        expect(find.textContaining('Book'), findsNothing);
        expect(find.textContaining('Rendez-vous'), findsNothing);
        expect(find.byType(ElevatedButton), findsNothing);
      });
    });

    // =========================================================================
    // 7. Localization & RTL / LTR Directionality Tests
    // =========================================================================
    group('7. Localization & RTL / LTR Compatibility', () {
      testWidgets('renders Arabic in RTL direction', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 0},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            locale: const Locale('ar'),
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        final directionality = Directionality.of(tester.element(find.byType(DoctorDirectoryScreen)));
        expect(directionality, TextDirection.rtl);
        expect(find.text('دليل الأطباء'), findsOneWidget);
      });

      testWidgets('renders English in LTR direction', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 10, 'total': 0},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);

        await tester.pumpWidget(
          createTestableWidget(
            locale: const Locale('en'),
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ),
        );

        await tester.pumpAndSettle();

        final directionality = Directionality.of(tester.element(find.byType(DoctorDirectoryScreen)));
        expect(directionality, TextDirection.ltr);
        expect(find.text('Doctor Directory'), findsOneWidget);
        expect(find.text('No doctors found matching search.'), findsOneWidget);
      });
    });
  });
}

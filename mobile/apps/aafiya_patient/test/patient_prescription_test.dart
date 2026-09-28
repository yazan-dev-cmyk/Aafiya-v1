// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/screens/prescription_detail_screen.dart';
import 'package:aafiya_patient/screens/prescriptions_screen.dart';
import 'package:aafiya_patient/widgets/prescription_card.dart';

void main() {
  group('TASK-03-04: Patient Prescription Viewer & QR Tests', () {
    const mockPrescription1 = Prescription(
      id: 'rx-1',
      prescriptionReference: 'RX-2026-0001',
      secureToken: 'token_abc_123',
      qrVerificationUrl: 'https://api.aafiya.dz/v/token_abc_123',
      patient: PrescriptionPatient(
        id: 'pat-1',
        name: 'أحمد بن علي',
        mrn: 'MRN-100',
        phone: '0555112233',
      ),
      doctor: PrescriptionDoctor(
        id: 'doc-1',
        name: 'د. فاطمة منصوري',
        specialty: 'أمراض القلب',
      ),
      clinic: PrescriptionClinic(
        id: 'cli-1',
        name: 'عيادة الشفاء',
        phone: '021445566',
      ),
      issueDate: '2026-09-14',
      expiryDate: '2026-10-14',
      status: 'active',
      isValid: true,
      notes: 'تناول الدواء مع كأس ماء كبير بعد الأكل.',
      items: [
        PrescriptionItem(
          id: 'item-1',
          medicationName: 'Amoxicillin 500mg',
          dosage: '500mg',
          frequency: '3 مرات يومياً',
          duration: '7 أيام',
          instructions: 'بعد الأكل مباشرة',
          substitutionAllowed: false,
        ),
        PrescriptionItem(
          id: 'item-2',
          medicationName: 'Paracetamol 1g',
          dosage: '1000mg',
          frequency: 'عند اللزوم',
          duration: '5 أيام',
          instructions: 'في حال ارتفاع الحرارة',
          substitutionAllowed: true,
        ),
      ],
    );

    const mockPrescriptionVoided = Prescription(
      id: 'rx-2',
      prescriptionReference: 'RX-2026-0002',
      secureToken: 'token_voided',
      qrVerificationUrl: 'https://api.aafiya.dz/v/token_voided',
      patient: PrescriptionPatient(id: 'pat-1', name: 'أحمد بن علي'),
      doctor: PrescriptionDoctor(id: 'doc-2', name: 'د. رشيد بوعلام'),
      clinic: PrescriptionClinic(id: 'cli-1', name: 'عيادة الأمل'),
      status: 'voided',
      isValid: false,
      items: [],
    );

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
        home: child,
      );
    }

    // =========================================================================
    // 1. PrescriptionCard Component Tests
    // =========================================================================
    group('1. PrescriptionCard Component', () {
      testWidgets('renders reference, doctor name, clinic, and medication count', (tester) async {
        bool tapped = false;

        await tester.pumpWidget(
          createTestableWidget(
            child: Scaffold(
              body: PrescriptionCard(
                prescription: mockPrescription1,
                onTap: () => tapped = true,
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('RX-2026-0001'), findsOneWidget);
        expect(find.text('د. فاطمة منصوري'), findsOneWidget);
        expect(find.text('أمراض القلب'), findsOneWidget);
        expect(find.text('عيادة الشفاء'), findsOneWidget);
        expect(find.textContaining('2026-09-14'), findsOneWidget);
        expect(find.textContaining('2 الأدوية الموصوفة'), findsOneWidget);
        expect(find.text('نشطة'), findsOneWidget);

        await tester.tap(find.byType(PrescriptionCard));
        expect(tapped, isTrue);
      });

      testWidgets('renders voided status correctly', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: Scaffold(
              body: PrescriptionCard(
                prescription: mockPrescriptionVoided,
                onTap: () {},
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('ملغاة'), findsOneWidget);
      });
    });

    // =========================================================================
    // 2. PrescriptionDetailScreen Tests
    // =========================================================================
    group('2. PrescriptionDetailScreen', () {
      testWidgets('renders read-only notice, doctor details, and medications list', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const PrescriptionDetailScreen(prescription: mockPrescription1),
          ),
        );
        await tester.pumpAndSettle();

        // Read-only notice
        expect(
          find.text('هذه الوصفة الطبية رقمية معتمدة ومخصصة للعرض فقط.'),
          findsOneWidget,
        );

        // Header & Doctor & Clinic
        expect(find.text('RX-2026-0001'), findsOneWidget);
        expect(find.textContaining('د. فاطمة منصوري'), findsOneWidget);
        expect(find.text('عيادة الشفاء'), findsOneWidget);

        // Medication items
        expect(find.text('Amoxicillin 500mg'), findsOneWidget);
        expect(find.text('Paracetamol 1g'), findsOneWidget);
        expect(find.text('500mg'), findsOneWidget);
        expect(find.textContaining('3 مرات يومياً'), findsOneWidget);
        expect(find.textContaining('7 أيام'), findsOneWidget);
        expect(find.textContaining('بعد الأكل مباشرة'), findsOneWidget);

        // Substitution badges
        expect(find.text('لا يُسمح بالبديل'), findsOneWidget);
        expect(find.text('يُسمح بالبديل'), findsOneWidget);

        // Doctor notes
        expect(find.text('تناول الدواء مع كأس ماء كبير بعد الأكل.'), findsOneWidget);

        // SEC-02 & DISC-01: Zero edit / update / delete buttons exist
        expect(find.text('تعديل'), findsNothing);
        expect(find.text('حفظ'), findsNothing);
        expect(find.text('إلغاء'), findsNothing);
        expect(find.byType(ElevatedButton), findsNothing);
      });

      testWidgets('renders QR code widget with verification link and token (AC-03)', (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const PrescriptionDetailScreen(prescription: mockPrescription1),
          ),
        );
        await tester.pumpAndSettle();

        // QR verification section
        expect(find.text('التحقق الرقمي (QR)'), findsOneWidget);
        expect(
          find.text('امسح رمز الاستجابة السريعة لدى الصيدلية للتحقق الفوري من أصالة الوصفة.'),
          findsOneWidget,
        );
        expect(find.byType(QrImageView), findsOneWidget);
        expect(find.textContaining('token_abc_123'), findsOneWidget);
        expect(find.text('نسخ رابط التحقق'), findsOneWidget);
      });

      testWidgets('renders in English (LTR) and French (LTR)', (tester) async {
        // English
        await tester.pumpWidget(
          createTestableWidget(
            locale: const Locale('en'),
            child: const PrescriptionDetailScreen(prescription: mockPrescription1),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Prescription Details'), findsOneWidget);
        expect(find.text('QR Verification'), findsOneWidget);
        expect(find.text('Copy verification link'), findsOneWidget);

        // French
        await tester.pumpWidget(
          createTestableWidget(
            locale: const Locale('fr'),
            child: const PrescriptionDetailScreen(prescription: mockPrescription1),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text("Détails de l'ordonnance"), findsOneWidget);
        expect(find.text('Vérification QR'), findsOneWidget);
        expect(find.text('Copier le lien'), findsOneWidget);
      });
    });

    // =========================================================================
    // 3. PrescriptionsScreen List & Pagination Tests
    // =========================================================================
    group('3. PrescriptionsScreen List & Flow', () {
      testWidgets('renders loading state initially then displays prescriptions', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'rx-1',
                  'prescription_reference': 'RX-2026-0001',
                  'secure_token': 'token_abc_123',
                  'qr_verification_url': 'https://api.aafiya.dz/v/token_abc_123',
                  'patient': {'id': 'p-1', 'name': 'Ahmed'},
                  'doctor': {'id': 'd-1', 'name': 'Dr. Mansouri'},
                  'clinic': {'id': 'c-1', 'name': 'Clinic 1'},
                  'status': 'active',
                  'is_valid': true,
                  'items': [],
                }
              ],
              'meta': {
                'current_page': 1,
                'last_page': 1,
                'total': 1,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient);

        await tester.pumpWidget(
          createTestableWidget(
            child: PrescriptionsScreen(apiClient: apiClient),
          ),
        );

        // Loading view is shown
        expect(find.byType(AafiyaLoadingView), findsOneWidget);

        await tester.pumpAndSettle();

        // Prescription card is shown
        expect(find.byType(PrescriptionCard), findsOneWidget);
        expect(find.text('RX-2026-0001'), findsOneWidget);
      });

      testWidgets('renders empty state when patient has no prescriptions', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1, 'total': 0},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient);

        await tester.pumpWidget(
          createTestableWidget(
            child: PrescriptionsScreen(apiClient: apiClient),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(AafiyaEmptyView), findsOneWidget);
        expect(find.text('لا توجد وصفات طبية مسجلة.'), findsOneWidget);
      });

      testWidgets('renders error state with retry on network error', (tester) async {
        int callCount = 0;
        final mockClient = MockClient((request) async {
          callCount++;
          if (callCount == 1) {
            return http.Response(
              jsonEncode({'message': 'فشل الاتصال بالخادم'}),
              500,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'rx-recov',
                  'prescription_reference': 'RX-RECOVERED',
                  'secure_token': 'tok',
                  'qr_verification_url': 'http://url',
                  'patient': {'id': 'p', 'name': 'P'},
                  'doctor': {'id': 'd', 'name': 'D'},
                  'clinic': {'id': 'c', 'name': 'C'},
                  'status': 'active',
                  'is_valid': true,
                  'items': [],
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient);

        await tester.pumpWidget(
          createTestableWidget(
            child: PrescriptionsScreen(apiClient: apiClient),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(AafiyaErrorView), findsOneWidget);
        expect(find.text('إعادة تحميل الوصفات'), findsOneWidget);

        // Tap retry
        await tester.tap(find.text('إعادة تحميل الوصفات'));
        await tester.pumpAndSettle();

        expect(find.byType(PrescriptionCard), findsOneWidget);
        expect(find.text('RX-RECOVERED'), findsOneWidget);
      });

      testWidgets('filters by status when clicking status chips', (tester) async {
        String? lastStatusRequested;
        final mockClient = MockClient((request) async {
          lastStatusRequested = request.url.queryParameters['status'];
          return http.Response(
            jsonEncode({
              'data': [],
              'meta': {'current_page': 1, 'last_page': 1, 'total': 0},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient);

        await tester.pumpWidget(
          createTestableWidget(
            child: PrescriptionsScreen(apiClient: apiClient),
          ),
        );
        await tester.pumpAndSettle();

        expect(lastStatusRequested, isNull);

        // Tap 'نشطة' chip
        await tester.tap(find.text('نشطة'));
        await tester.pumpAndSettle();
        expect(lastStatusRequested, equals('active'));

        // Tap 'مكتملة' chip
        await tester.tap(find.text('مكتملة'));
        await tester.pumpAndSettle();
        expect(lastStatusRequested, equals('completed'));
      });

      testWidgets('navigation: tapping card navigates to PrescriptionDetailScreen and back', (tester) async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'rx-nav',
                  'prescription_reference': 'RX-NAV-TEST',
                  'secure_token': 'tok_nav',
                  'qr_verification_url': 'https://api.aafiya.dz/v/tok_nav',
                  'patient': {'id': 'p', 'name': 'Patient Nav'},
                  'doctor': {'id': 'd', 'name': 'Dr. Nav'},
                  'clinic': {'id': 'c', 'name': 'Clinic Nav'},
                  'status': 'active',
                  'is_valid': true,
                  'items': [
                    {
                      'id': 'item-nav',
                      'medication_name': 'Vitamin C 500mg',
                      'dosage': '500mg',
                      'frequency': 'Once daily',
                      'duration': '10 days',
                    }
                  ],
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final apiClient = ApiClient(httpClient: mockClient);

        await tester.pumpWidget(
          createTestableWidget(
            child: PrescriptionsScreen(apiClient: apiClient),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(PrescriptionCard), findsOneWidget);

        // Tap card to navigate
        await tester.tap(find.byType(PrescriptionCard));
        await tester.pumpAndSettle();

        expect(find.byType(PrescriptionDetailScreen), findsOneWidget);
        expect(find.text('Vitamin C 500mg'), findsOneWidget);
        expect(find.byType(QrImageView), findsOneWidget);

        // Tap back
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();

        expect(find.byType(PrescriptionsScreen), findsOneWidget);
      });
    });
  });
}

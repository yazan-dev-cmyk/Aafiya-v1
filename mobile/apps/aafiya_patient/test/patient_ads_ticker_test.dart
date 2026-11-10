// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

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

  group('AdsTickerItem Model Tests', () {
    test('Parses real backend AdsTickerItem payload correctly', () {
      final json = {
        'id': 'ad-uuid-101',
        'title': 'حملة الفحص المبكر الشامل',
        'content': 'احجز فحصك الطبي الشامل الآن واحصل على تقرير متكامل.',
        'target_url': 'https://aafiya.app/campaigns/checkup',
        'banner_image_url': 'https://aafiya.app/images/ad1.png',
        'status': 'active',
        'starts_at': '2026-01-01T00:00:00Z',
        'ends_at': '2026-12-31T23:59:59Z',
        'ticker_clicks_count': 42,
        'placements': [
          {
            'id': 'pl-1',
            'audience': 'patient',
            'destination': 'ticker',
            'is_active': true,
          }
        ],
      };

      final ad = AdsTickerItem.fromJson(json);

      expect(ad.id, 'ad-uuid-101');
      expect(ad.title, 'حملة الفحص المبكر الشامل');
      expect(ad.content, 'احجز فحصك الطبي الشامل الآن واحصل على تقرير متكامل.');
      expect(ad.targetUrl, 'https://aafiya.app/campaigns/checkup');
      expect(ad.bannerImageUrl, 'https://aafiya.app/images/ad1.png');
      expect(ad.status, 'active');
      expect(ad.isActive, isTrue);
      expect(ad.hasValidDates, isTrue);
      expect(ad.tickerClicksCount, 42);
      expect(ad.placements.length, 1);
      expect(ad.placements.first.audience, 'patient');
      expect(ad.placements.first.destination, 'ticker');
    });

    test('Defensively handles null and missing optional fields', () {
      final json = <String, dynamic>{
        'id': 'ad-minimal-1',
        'title': 'Minimal Ad',
        'content': 'Content',
      };

      final ad = AdsTickerItem.fromJson(json);

      expect(ad.id, 'ad-minimal-1');
      expect(ad.title, 'Minimal Ad');
      expect(ad.content, 'Content');
      expect(ad.targetUrl, isNull);
      expect(ad.bannerImageUrl, isNull);
      expect(ad.status, 'active');
      expect(ad.tickerClicksCount, 0);
      expect(ad.placements, isEmpty);
      expect(ad.hasValidDates, isTrue);
    });

    test('Parses AdsTickerClickResult payload correctly', () {
      final json = {
        'success': true,
        'recorded': true,
        'clicks_count': 43,
        'target_url': 'https://aafiya.app/promo',
      };

      final result = AdsTickerClickResult.fromJson(json);

      expect(result.success, isTrue);
      expect(result.recorded, isTrue);
      expect(result.clicksCount, 43);
      expect(result.targetUrl, 'https://aafiya.app/promo');
    });
  });

  group('AafiyaAdsTicker URL Safety Tests', () {
    test('Allows safe HTTPS external URLs', () {
      final validation =
          AafiyaAdsTicker.validateTargetUrl('https://example.com/promo');
      expect(validation.isSafe, isTrue);
      expect(validation.isExternal, isTrue);
      expect(validation.url, 'https://example.com/promo');
    });

    test('Allows safe relative internal URLs', () {
      final validation =
          AafiyaAdsTicker.validateTargetUrl('/doctors?specialty=cardio');
      expect(validation.isSafe, isTrue);
      expect(validation.isExternal, isFalse);
      expect(validation.url, '/doctors?specialty=cardio');
    });

    test('Rejects plain HTTP external URLs', () {
      final validation =
          AafiyaAdsTicker.validateTargetUrl('http://insecure.com');
      expect(validation.isSafe, isFalse);
    });

    test('Rejects dangerous javascript: and data: schemes', () {
      expect(AafiyaAdsTicker.validateTargetUrl('javascript:alert(1)').isSafe,
          isFalse);
      expect(
          AafiyaAdsTicker.validateTargetUrl('data:text/html,<script>').isSafe,
          isFalse);
    });

    test('Rejects directory traversal and backslashes in internal routes', () {
      expect(
          AafiyaAdsTicker.validateTargetUrl('/internal/../../etc/passwd')
              .isSafe,
          isFalse);
      expect(AafiyaAdsTicker.validateTargetUrl('/internal\\escape').isSafe,
          isFalse);
      expect(
          AafiyaAdsTicker.validateTargetUrl('//protocol-relative.com').isSafe,
          isFalse);
    });
  });

  group('AafiyaAdsTicker Widget Tests (Zero Mock Policy & Zero Height)', () {
    testWidgets('Renders SizedBox.shrink (0 height) when ads list is empty',
        (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          child: Scaffold(
            body: AafiyaAdsTicker(
              ads: const [],
              onAdClick: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(AafiyaAdsTicker), findsOneWidget);
      expect(find.byType(SizedBox), findsWidgets);
      // Ensure no text, sponsored badges, or icons are rendered
      expect(find.text('إعلان'), findsNothing);
      expect(find.text('Sponsored'), findsNothing);
      expect(find.byType(InkWell), findsNothing);
    });

    testWidgets(
        'Renders active ad campaign with sponsored badge and title in Arabic',
        (tester) async {
      AdsTickerItem? clickedAd;

      final testAd = AdsTickerItem(
        id: 'ad-1',
        title: 'فحص دوري لمرضى السكري',
        content: 'سجل الآن في برنامج المتابعة السريرية بأسعار مخفضة.',
        targetUrl: 'https://aafiya.app/promo',
      );

      await tester.pumpWidget(
        createTestWidget(
          locale: const Locale('ar'),
          child: Scaffold(
            body: AafiyaAdsTicker(
              ads: [testAd],
              onAdClick: (ad) => clickedAd = ad,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('فحص دوري لمرضى السكري'), findsOneWidget);
      expect(find.text('سجل الآن في برنامج المتابعة السريرية بأسعار مخفضة.'),
          findsOneWidget);
      expect(find.text('إعلان'), findsOneWidget); // Arabic sponsored label

      // Tap ad
      await tester.tap(find.text('فحص دوري لمرضى السكري'));
      await tester.pumpAndSettle();

      expect(clickedAd, isNotNull);
      expect(clickedAd!.id, 'ad-1');
    });

    testWidgets(
        'Renders active ad campaign in English and French with correct localization',
        (tester) async {
      final testAd = AdsTickerItem(
        id: 'ad-2',
        title: 'Health Checkup',
        content: 'Comprehensive wellness checkup.',
        targetUrl: 'https://aafiya.app/checkup',
      );

      // English test
      await tester.pumpWidget(
        createTestWidget(
          locale: const Locale('en'),
          child: Scaffold(
            body: AafiyaAdsTicker(
              ads: [testAd],
              onAdClick: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Sponsored'), findsOneWidget);

      // French test
      await tester.pumpWidget(
        createTestWidget(
          locale: const Locale('fr'),
          child: Scaffold(
            body: AafiyaAdsTicker(
              ads: [testAd],
              onAdClick: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Sponsorisé'), findsOneWidget);
    });
  });

  group('AdsTickerService Integration with Client Mock', () {
    test('getEligibleAds fetches, parses, and caches campaigns', () async {
      int fetchCount = 0;
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/ads/ticker') {
          fetchCount++;
          expect(request.headers['X-Platform'], 'mobile');
          expect(request.url.queryParameters['destination'], 'ticker');
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'ad-feed-1',
                  'title': 'عرض خاص',
                  'content': 'محتوى العرض',
                  'target_url': 'https://aafiya.app/special',
                  'status': 'active',
                  'starts_at': '2026-01-01T00:00:00Z',
                  'ends_at': '2026-12-31T23:59:59Z',
                  'ticker_clicks_count': 5,
                  'placements': [],
                }
              ]
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AdsTickerService(apiClient: apiClient);

      // 1. First fetch hits network
      final res1 = await service.getEligibleAds();
      expect(res1, isA<ApiSuccess<List<AdsTickerItem>>>());
      final ads1 = (res1 as ApiSuccess<List<AdsTickerItem>>).data;
      expect(ads1.length, 1);
      expect(ads1.first.id, 'ad-feed-1');
      expect(fetchCount, 1);

      // 2. Second fetch hits cache
      final res2 = await service.getEligibleAds();
      expect(res2, isA<ApiSuccess<List<AdsTickerItem>>>());
      expect(fetchCount, 1);

      // 3. Clear cache and re-fetch hits network
      service.clearCache();
      final res3 = await service.getEligibleAds();
      expect(res3, isA<ApiSuccess<List<AdsTickerItem>>>());
      expect(fetchCount, 2);
    });

    test('recordClick sends POST request and parses telemetry result',
        () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/ads/ticker/ad-test-99/click') {
          expect(request.method, 'POST');
          expect(request.headers['X-Platform'], 'mobile');
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['destination'], 'ticker');
          return http.Response(
            jsonEncode({
              'success': true,
              'recorded': true,
              'clicks_count': 12,
              'target_url': 'https://aafiya.app/promo',
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AdsTickerService(apiClient: apiClient);
      final result = await service.recordClick('ad-test-99');

      expect(result, isA<ApiSuccess<AdsTickerClickResult>>());
      final click = (result as ApiSuccess<AdsTickerClickResult>).data;
      expect(click.success, isTrue);
      expect(click.recorded, isTrue);
      expect(click.clicksCount, 12);
    });
  });
}

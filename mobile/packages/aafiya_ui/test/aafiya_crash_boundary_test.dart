import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

Widget buildTestableWidget({
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
    home: child,
  );
}

void main() {
  group('AafiyaCrashBoundary Widget Tests', () {
    testWidgets('Renders localized Arabic crash boundary and invokes recovery', (tester) async {
      bool recovered = false;

      await tester.pumpWidget(buildTestableWidget(
        locale: const Locale('ar'),
        child: AafiyaCrashBoundary(
          onRecover: () => recovered = true,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.shield_outlined), findsOneWidget);
      expect(find.text('حدث خطأ غير متوقع'), findsOneWidget);
      expect(find.text('نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو العودة للرئيسية.'), findsOneWidget);
      expect(find.text('العودة للرئيسية'), findsOneWidget);

      // Verify recovery action
      await tester.tap(find.text('العودة للرئيسية'));
      await tester.pump();
      expect(recovered, isTrue);
    });

    testWidgets('Renders English localization and supports custom title/message', (tester) async {
      await tester.pumpWidget(buildTestableWidget(
        locale: const Locale('en'),
        child: const AafiyaCrashBoundary(
          customTitle: 'Custom Recovery Title',
          customMessage: 'Custom recovery message details.',
          recoverLabel: 'Retry Action',
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Custom Recovery Title'), findsOneWidget);
      expect(find.text('Custom recovery message details.'), findsOneWidget);
      expect(find.byType(AafiyaButton), findsNothing, reason: 'No onRecover callback provided');
    });

    testWidgets('Renders French localization cleanly', (tester) async {
      await tester.pumpWidget(buildTestableWidget(
        locale: const Locale('fr'),
        child: AafiyaCrashBoundary(onRecover: () {}),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Une erreur inattendue est survenue'), findsOneWidget);
      expect(find.text('Retour à l’accueil'), findsOneWidget);
    });
  });
}

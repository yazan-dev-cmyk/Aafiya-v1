import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/shells/auth_shell.dart';

Widget _wrapApp({required Widget child, Locale locale = const Locale('ar')}) {
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
  group('ProAuthShell Password Visibility', () {
    late InMemoryTokenStorage tokenStorage;
    late ApiClient apiClient;
    late AuthSessionManager sessionManager;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
      apiClient = ApiClient(tokenStorage: tokenStorage);
      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
    });

    Future<void> pumpProAuth(WidgetTester tester, {Locale locale = const Locale('ar')}) async {
      await tester.pumpWidget(
        _wrapApp(
          locale: locale,
          child: ProAuthShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            onLoginSuccess: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    Finder passwordFieldFinder() => find.byType(TextField).at(1);

    IconButton visibilityButton(WidgetTester tester) =>
        tester.widget<IconButton>(find.byType(IconButton));

    testWidgets('password is hidden by default', (tester) async {
      await pumpProAuth(tester);

      final passwordField = tester.widget<TextField>(passwordFieldFinder());
      expect(passwordField.obscureText, isTrue);
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
    });

    testWidgets('tapping the visibility button reveals the password and icon switches', (tester) async {
      await pumpProAuth(tester);

      await tester.enterText(passwordFieldFinder(), 'ValidPass123!');
      expect(tester.widget<TextField>(passwordFieldFinder()).obscureText, isTrue);

      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();

      expect(tester.widget<TextField>(passwordFieldFinder()).obscureText, isFalse);
      expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
      expect(find.text('ValidPass123!'), findsOneWidget);
    });

    testWidgets('tapping again hides the password', (tester) async {
      await pumpProAuth(tester);

      await tester.enterText(passwordFieldFinder(), 'ValidPass123!');
      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(passwordFieldFinder()).obscureText, isFalse);

      await tester.tap(find.byIcon(Icons.visibility_off_outlined));
      await tester.pumpAndSettle();

      expect(tester.widget<TextField>(passwordFieldFinder()).obscureText, isTrue);
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
    });

    testWidgets('password value remains unchanged while toggling', (tester) async {
      await pumpProAuth(tester);

      await tester.enterText(passwordFieldFinder(), 'UnchangedSecret#1');
      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();
      expect(find.text('UnchangedSecret#1'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.visibility_off_outlined));
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();

      expect(find.text('UnchangedSecret#1'), findsOneWidget);
      expect(tester.widget<TextField>(passwordFieldFinder()).obscureText, isFalse);
    });

    testWidgets('localized tooltip text for Arabic', (tester) async {
      await pumpProAuth(tester, locale: const Locale('ar'));

      expect(visibilityButton(tester).tooltip, equals('إظهار كلمة المرور'));

      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();

      expect(visibilityButton(tester).tooltip, equals('إخفاء كلمة المرور'));
    });

    testWidgets('localized tooltip text for English', (tester) async {
      await pumpProAuth(tester, locale: const Locale('en'));

      expect(visibilityButton(tester).tooltip, equals('Show password'));

      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();

      expect(visibilityButton(tester).tooltip, equals('Hide password'));
    });

    testWidgets('localized tooltip text for French', (tester) async {
      await pumpProAuth(tester, locale: const Locale('fr'));

      expect(visibilityButton(tester).tooltip, equals('Afficher le mot de passe'));

      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();

      expect(visibilityButton(tester).tooltip, equals('Masquer le mot de passe'));
    });
  });
}
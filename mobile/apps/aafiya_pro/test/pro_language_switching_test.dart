import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/shells/auth_shell.dart';
import 'package:aafiya_pro/shells/splash_shell.dart';

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

class _ProShellHarness extends StatefulWidget {
  const _ProShellHarness({required this.initialLocale, required this.builder});

  final Locale initialLocale;
  final Widget Function(Locale locale, ValueChanged<Locale> onLocaleChanged) builder;

  @override
  State<_ProShellHarness> createState() => _ProShellHarnessState();
}

class _ProShellHarnessState extends State<_ProShellHarness> {
  late Locale _locale = widget.initialLocale;

  void _onLocaleChanged(Locale locale) => setState(() => _locale = locale);

  @override
  Widget build(BuildContext context) {
    return _wrapApp(
      locale: _locale,
      child: widget.builder(_locale, _onLocaleChanged),
    );
  }
}

void main() {
  group('Pro Splash Language Selector', () {
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

    Future<void> pumpSplash(WidgetTester tester) async {
      await tester.pumpWidget(
        _ProShellHarness(
          initialLocale: const Locale('ar'),
          builder: (current, onLocaleChanged) => ProSplashShell(
            sessionManager: sessionManager,
            onAuthenticated: () {},
            onUnauthenticated: () {},
            onLocaleChanged: onLocaleChanged,
            currentLocale: current,
          ),
        ),
      );
      await tester.pump();
    }

    testWidgets('renders the language selector when onLocaleChanged is provided', (tester) async {
      await pumpSplash(tester);

      final selector = tester.widget<SegmentedButton<String>>(find.byType(SegmentedButton<String>));
      expect(selector.selected, equals({'ar'}));

      await tester.pump(const Duration(milliseconds: 700));
    });

    testWidgets('hides the language selector when onLocaleChanged is not provided', (tester) async {
      await tester.pumpWidget(
        _wrapApp(
          child: ProSplashShell(
            sessionManager: sessionManager,
            onAuthenticated: () {},
            onUnauthenticated: () {},
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(SegmentedButton<String>), findsNothing);

      await tester.pump(const Duration(milliseconds: 700));
    });

    testWidgets('selecting French updates the active segment at runtime', (tester) async {
      await pumpSplash(tester);

      await tester.tap(find.text('FR'));
      await tester.pump();

      final selector = tester.widget<SegmentedButton<String>>(find.byType(SegmentedButton<String>));
      expect(selector.selected, equals({'fr'}));

      await tester.pump(const Duration(milliseconds: 700));
    });

    testWidgets('switching locale changes layout directionality without restart', (tester) async {
      await pumpSplash(tester);
      expect(Directionality.of(tester.element(find.byType(ProSplashShell))), TextDirection.rtl);

      await tester.tap(find.text('EN'));
      await tester.pump();

      expect(Directionality.of(tester.element(find.byType(ProSplashShell))), TextDirection.ltr);

      await tester.pump(const Duration(milliseconds: 700));
    });
  });

  group('Pro Auth Shell Language Menu', () {
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

    Future<void> pumpAuth(WidgetTester tester) async {
      await tester.pumpWidget(
        _ProShellHarness(
          initialLocale: const Locale('ar'),
          builder: (current, onLocaleChanged) => ProAuthShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            onLoginSuccess: () {},
            onLocaleChanged: onLocaleChanged,
            currentLocale: current,
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('renders the language menu in the AppBar when onLocaleChanged is provided', (tester) async {
      await pumpAuth(tester);

      expect(find.byIcon(Icons.language_rounded), findsOneWidget);
    });

    testWidgets('hides the language icon when onLocaleChanged is not provided', (tester) async {
      await tester.pumpWidget(
        _wrapApp(
          child: ProAuthShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            onLoginSuccess: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.language_rounded), findsNothing);
    });

    testWidgets('opening the menu lists Arabic, English and French options', (tester) async {
      await pumpAuth(tester);

      await tester.tap(find.byIcon(Icons.language_rounded));
      await tester.pumpAndSettle();

      expect(find.text('العربية'), findsOneWidget);
      expect(find.text('English'), findsOneWidget);
      expect(find.text('Français'), findsOneWidget);
    });

    testWidgets('selecting French switches the shell content at runtime without restart', (tester) async {
      await pumpAuth(tester);

      expect(find.text('Votre passerelle vers Aafiya'), findsNothing);

      await tester.tap(find.byIcon(Icons.language_rounded));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Français'));
      await tester.pumpAndSettle();

      expect(find.text('Votre passerelle vers Aafiya'), findsOneWidget);
    });

    testWidgets('selecting English switches layout directionality at runtime without restart', (tester) async {
      await pumpAuth(tester);
      expect(Directionality.of(tester.element(find.byType(ProAuthShell))), TextDirection.rtl);

      await tester.tap(find.byIcon(Icons.language_rounded));
      await tester.pumpAndSettle();
      await tester.tap(find.text('English'));
      await tester.pumpAndSettle();

      expect(Directionality.of(tester.element(find.byType(ProAuthShell))), TextDirection.ltr);
    });
  });
}
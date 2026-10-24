import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_pro/utils/qr_token_sanitizer.dart';

void main() {
  group('QrTokenSanitizer Unit Tests', () {
    // 64-char alphanumeric token with letters outside hex (G, Z, Y, W, V, K, etc.)
    const validAlphanumericToken =
        'G7k9Z1w3Y5v8Q2x4M6n0P1r3T5u7A9b0C2d4E6f8H0j2L4o6R8s0U2i4X6y8Z0W2';
    // Exactly 64 chars
    assert(validAlphanumericToken.length == 64);

    test('1. Accepts valid raw 64-character alphanumeric token', () {
      final result = QrTokenSanitizer.sanitize(validAlphanumericToken);
      expect(result, equals(validAlphanumericToken));
      expect(result?.length, equals(64));
    });

    test('2. Accepts token containing letters outside hexadecimal subset', () {
      // Contains 'G', 'Z', 'Y', 'W', 'V', 'K', 'X'
      expect(
        validAlphanumericToken.contains(RegExp(r'[G-Zg-z]')),
        isTrue,
        reason:
            'Token must have non-hex characters to prove [A-Za-z0-9] contract',
      );
      final result = QrTokenSanitizer.sanitize(validAlphanumericToken);
      expect(result, equals(validAlphanumericToken));
    });

    test('3. Accepts singular Web appointment pass URL with localization', () {
      final url =
          'https://aafiya.site/ar/appointment/pass/$validAlphanumericToken';
      final result = QrTokenSanitizer.sanitize(url);
      expect(result, equals(validAlphanumericToken));
    });

    test('4. Accepts plural Web appointments pass URL with localization', () {
      final url =
          'https://aafiya.site/fr/appointments/pass/$validAlphanumericToken';
      final result = QrTokenSanitizer.sanitize(url);
      expect(result, equals(validAlphanumericToken));
    });

    test('5. Accepts non-localized pass URL (singular and plural)', () {
      final singularUrl =
          'https://aafiya.site/appointment/pass/$validAlphanumericToken';
      final pluralUrl =
          'https://aafiya.site/appointments/pass/$validAlphanumericToken';

      expect(QrTokenSanitizer.sanitize(singularUrl),
          equals(validAlphanumericToken));
      expect(
          QrTokenSanitizer.sanitize(pluralUrl), equals(validAlphanumericToken));
    });

    test('6. Safely parses and ignores query parameters and fragments', () {
      final urlWithQueryAndFrag =
          'https://aafiya.site/appointments/pass/$validAlphanumericToken?ref=sms&date=2026-10-24#scanner-view';
      final result = QrTokenSanitizer.sanitize(urlWithQueryAndFrag);
      expect(result, equals(validAlphanumericToken));
    });

    test('7. Safely trims leading and trailing whitespace', () {
      final paddedRaw = '   $validAlphanumericToken   \n';
      final paddedUrl =
          '  https://aafiya.site/appointment/pass/$validAlphanumericToken?locale=ar  \t';

      expect(
          QrTokenSanitizer.sanitize(paddedRaw), equals(validAlphanumericToken));
      expect(
          QrTokenSanitizer.sanitize(paddedUrl), equals(validAlphanumericToken));
    });

    test('8. Rejects short token (< 64 characters)', () {
      final shortToken = validAlphanumericToken.substring(0, 63);
      expect(shortToken.length, equals(63));

      expect(QrTokenSanitizer.sanitize(shortToken), isNull);
      expect(
        QrTokenSanitizer.sanitize(
            'https://aafiya.site/appointment/pass/$shortToken'),
        isNull,
      );
    });

    test('9. Rejects overlong token (> 64 characters)', () {
      final overlongToken = '${validAlphanumericToken}A';
      expect(overlongToken.length, equals(65));

      expect(QrTokenSanitizer.sanitize(overlongToken), isNull);
      expect(
        QrTokenSanitizer.sanitize(
            'https://aafiya.site/appointment/pass/$overlongToken'),
        isNull,
      );
    });

    test(
        '10. Rejects invalid characters (hyphens, underscores, symbols, spaces inside token)',
        () {
      final withHyphen = validAlphanumericToken.replaceRange(10, 11, '-');
      final withUnderscore = validAlphanumericToken.replaceRange(10, 11, '_');
      final withSymbol = validAlphanumericToken.replaceRange(10, 11, '\$');

      expect(QrTokenSanitizer.sanitize(withHyphen), isNull);
      expect(QrTokenSanitizer.sanitize(withUnderscore), isNull);
      expect(QrTokenSanitizer.sanitize(withSymbol), isNull);
    });

    test('11. Rejects ambiguous or extra trailing path segments', () {
      final ambiguousUrl =
          'https://aafiya.site/appointment/pass/$validAlphanumericToken/download/report';
      expect(QrTokenSanitizer.sanitize(ambiguousUrl), isNull);
    });

    test(
        '12. Rejects unsupported paths (prescriptions, diagnostic orders, generic URLs)',
        () {
      expect(
          QrTokenSanitizer.sanitize(
              'https://aafiya.site/v/$validAlphanumericToken'),
          isNull);
      expect(
        QrTokenSanitizer.sanitize(
            'https://aafiya.site/diagnostic/order/$validAlphanumericToken'),
        isNull,
      );
      expect(
        QrTokenSanitizer.sanitize(
            'https://aafiya.site/patient/pass/$validAlphanumericToken'),
        isNull,
      );
      expect(QrTokenSanitizer.sanitize('https://google.com'), isNull);
    });

    test('13. Rejects null, empty string, and whitespace-only input', () {
      expect(QrTokenSanitizer.sanitize(null), isNull);
      expect(QrTokenSanitizer.sanitize(''), isNull);
      expect(QrTokenSanitizer.sanitize('    \n\t   '), isNull);
    });
  });
}

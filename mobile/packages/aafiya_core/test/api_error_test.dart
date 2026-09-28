import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  group('ApiErrorResponse & AppException Parsing', () {
    test('parses standard Laravel error response with message and field errors', () {
      final json = {
        'status': 'error',
        'message': 'The given data was invalid.',
        'errors': {
          'email': ['The email field is required.'],
          'password': ['The password must be at least 8 characters.']
        }
      };

      final parsed = ApiErrorResponse.fromJson(json);

      expect(parsed.message, equals('The given data was invalid.'));
      expect(parsed.status, equals('error'));
      expect(parsed.errors.containsKey('email'), isTrue);
      expect(parsed.firstErrorFor('email'), equals('The email field is required.'));
      expect(parsed.firstErrorFor('password'), equals('The password must be at least 8 characters.'));
    });

    test('parses success:false style envelope', () {
      final json = {
        'success': false,
        'message': 'Invalid credentials provided.',
      };

      final parsed = ApiErrorResponse.fromJson(json);

      expect(parsed.message, equals('Invalid credentials provided.'));
      expect(parsed.success, isFalse);
      expect(parsed.errors.isEmpty, isTrue);
    });

    test('ApiException.fromStatusCode maps 401 to UnauthorizedException', () {
      final exception = ApiException.fromStatusCode(
        statusCode: 401,
        parsedResponse: const ApiErrorResponse(message: 'Unauthenticated.'),
      );

      expect(exception, isA<UnauthorizedException>());
      expect(exception.statusCode, equals(401));
      expect(exception.message, equals('Unauthenticated.'));
    });

    test('ApiException.fromStatusCode maps 403 to ForbiddenException', () {
      final exception = ApiException.fromStatusCode(
        statusCode: 403,
        parsedResponse: const ApiErrorResponse(message: 'Forbidden access.'),
      );

      expect(exception, isA<ForbiddenException>());
      expect(exception.statusCode, equals(403));
    });

    test('ApiException.fromStatusCode maps 422 to ValidationException', () {
      final parsed = ApiErrorResponse.fromJson({
        'message': 'Validation failed.',
        'errors': {
          'phone': ['The phone format is invalid.']
        }
      });

      final exception = ApiException.fromStatusCode(
        statusCode: 422,
        parsedResponse: parsed,
      );

      expect(exception, isA<ValidationException>());
      final valEx = exception as ValidationException;
      expect(valEx.firstErrorFor('phone'), equals('The phone format is invalid.'));
    });

    test('ApiException.fromStatusCode maps 500 to ServerException', () {
      final exception = ApiException.fromStatusCode(
        statusCode: 500,
        parsedResponse: const ApiErrorResponse(message: 'Internal error.'),
      );

      expect(exception, isA<ServerException>());
      expect(exception.statusCode, equals(500));
    });
  });
}

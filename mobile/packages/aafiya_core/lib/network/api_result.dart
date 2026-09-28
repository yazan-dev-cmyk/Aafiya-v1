import '../errors/app_exception.dart';

/// Sealed result container representing either a successful data payload or a failure.
sealed class ApiResult<T> {
  const ApiResult();

  bool get isSuccess => this is ApiSuccess<T>;
  bool get isFailure => this is ApiFailure<T>;

  T? get dataOrNull => switch (this) {
        ApiSuccess(:final data) => data,
        ApiFailure() => null,
      };

  AppException? get exceptionOrNull => switch (this) {
        ApiSuccess() => null,
        ApiFailure(:final exception) => exception,
      };

  R when<R>({
    required R Function(T data) onSuccess,
    required R Function(AppException exception) onFailure,
  }) {
    return switch (this) {
      ApiSuccess(:final data) => onSuccess(data),
      ApiFailure(:final exception) => onFailure(exception),
    };
  }
}

class ApiSuccess<T> extends ApiResult<T> {
  const ApiSuccess(this.data);
  final T data;
}

class ApiFailure<T> extends ApiResult<T> {
  const ApiFailure(this.exception);
  final AppException exception;
}

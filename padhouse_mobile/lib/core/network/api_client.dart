import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure API client configured with Dio, JWT rotation, and retry policies
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:4000/api/v1',
  );
  static const String fallbackRemoteUrl = 'https://api.padhouse.ps/api/v1';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  late final Dio _dio = _createDio();

  Dio get dio => _dio;

  Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Automatic Refresh Token Rotation on 401 Unauthorized
          if (error.response?.statusCode == 401) {
            final refreshToken = await _storage.read(key: 'refresh_token');
            if (refreshToken != null) {
              try {
                final refreshDio = Dio(BaseOptions(baseUrl: baseUrl));
                final response = await refreshDio.post<Map<String, dynamic>>(
                  '/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );

                final newAccessToken = response.data?['accessToken']?.toString();
                final newRefreshToken = response.data?['refreshToken']?.toString();

                if (newAccessToken != null) {
                  await _storage.write(key: 'access_token', value: newAccessToken);
                }
                if (newRefreshToken != null) {
                  await _storage.write(key: 'refresh_token', value: newRefreshToken);
                }

                // Retry original failed request with updated token
                final opts = error.requestOptions;
                opts.headers['Authorization'] = 'Bearer $newAccessToken';
                final cloneReq = await dio.request<dynamic>(
                  opts.path,
                  options: Options(
                    method: opts.method,
                    headers: opts.headers,
                  ),
                  data: opts.data,
                  queryParameters: opts.queryParameters,
                );
                return handler.resolve(cloneReq);
              } catch (_) {
                // If refresh token also fails, purge storage to trigger re-login
                await _storage.deleteAll();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );

    return dio;
  }
}

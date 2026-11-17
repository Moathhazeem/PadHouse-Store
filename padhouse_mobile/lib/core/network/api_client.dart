import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kDebugMode, kIsWeb, TargetPlatform;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure API client configured with Dio, JWT rotation, and retry policies
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  static const String _configuredBaseUrl =
      String.fromEnvironment('API_BASE_URL');
  // Replace the default with the development PC's LAN address when building
  // for a physical Android device, or pass --dart-define=API_BASE_URL=... .
  static const String androidLanBaseUrl = 'http://192.168.1.100:4000';
  static const String skipAuthorizationExtra = 'padhouse.skipAuthorization';
  static const String localDevelopmentBaseUrl = 'http://localhost:4000/api/v1';
  static final String baseUrl = _resolveBaseUrl();
  static const String fallbackRemoteUrl = 'https://api.padhouse.ps/api/v1';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static String _resolveBaseUrl() {
    if (_configuredBaseUrl.isNotEmpty) {
      return _withApiPrefix(_configuredBaseUrl);
    }
    final host = Uri.base.host;
    if (kIsWeb && const {'localhost', '127.0.0.1', '::1'}.contains(host)) {
      return _withApiPrefix(Uri(scheme: 'http', host: host, port: 4000).toString());
    }
    // Android emulators use 10.0.2.2 to reach the development host's loopback.
    if (kDebugMode &&
        !kIsWeb &&
        defaultTargetPlatform == TargetPlatform.android) {
      return _withApiPrefix('http://10.0.2.2:4000');
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return _withApiPrefix(androidLanBaseUrl);
    }
    if (kDebugMode) return _withApiPrefix(localDevelopmentBaseUrl);
    return _withApiPrefix(fallbackRemoteUrl);
  }

  static String _withApiPrefix(String value) {
    final uri = Uri.parse(value.trim());
    final path = uri.path.replaceFirst(RegExp(r'/+$'), '');
    final apiPath = path.endsWith('/api/v1') ? path : '$path/api/v1';
    return uri.replace(path: apiPath).toString().replaceFirst(RegExp(r'/+$'), '');
  }

  static String resolveImageUrl(String value) {
    final uri = Uri.tryParse(value.trim());
    if (uri == null || value.trim().isEmpty) return '';

    if (const {'padhouse.ps', 'www.padhouse.ps'}
        .contains(uri.host.toLowerCase())) {
      final sourceUrl = uri.replace(scheme: 'https').toString();
      final apiBase = baseUrl.replaceFirst(RegExp(r'/+$'), '');
      return '$apiBase/products/image?url=${Uri.encodeComponent(sourceUrl)}';
    }

    if (uri.hasScheme) return uri.toString();
    return Uri.parse(baseUrl)
        .replace(
          path: uri.path,
          query: uri.hasQuery ? uri.query : null,
        )
        .toString();
  }

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
          if (options.extra[skipAuthorizationExtra] == true) {
            return handler.next(options);
          }
          final token = await _storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Automatic Refresh Token Rotation on 401 Unauthorized
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra[skipAuthorizationExtra] != true) {
            final refreshToken = await _storage.read(key: 'refresh_token');
            if (refreshToken != null) {
              try {
                final refreshDio = Dio(BaseOptions(baseUrl: baseUrl));
                final response = await refreshDio.post<Map<String, dynamic>>(
                  '/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );

                final newAccessToken =
                    response.data?['accessToken']?.toString();
                final newRefreshToken =
                    response.data?['refreshToken']?.toString();

                if (newAccessToken != null) {
                  await _storage.write(
                      key: 'access_token', value: newAccessToken);
                }
                if (newRefreshToken != null) {
                  await _storage.write(
                      key: 'refresh_token', value: newRefreshToken);
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

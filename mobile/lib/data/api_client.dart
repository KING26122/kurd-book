import 'dart:convert';

import 'package:http/http.dart' as http;

import '../state/auth_store.dart';
import 'models.dart';

class ApiError extends Error {
  ApiError(this.status, this.code, this.message, {this.details});

  final int status;
  final String code;
  final String message;
  final dynamic details;

  @override
  String toString() => 'ApiError($status, $code, $message)';
}

/// Native HTTP client for the Kurd Book Fastify API.
///
/// Mirrors the behaviour of `apps/web/src/lib/api.ts`:
///  - JSON bodies with `Content-Type: application/json`
///  - `Authorization: Bearer <accessToken>` when a token exists
///  - refresh-token rotation handled through the stored refresh token
///  - Kurdish error messages surfaced to the UI
class ApiClient {
  ApiClient({this.baseUrl = 'https://kurdbook.app'});

  final String baseUrl;
  final http.Client _client = http.Client();

  String get _base => baseUrl.replaceAll(RegExp(r'/+$'), '');

  Uri _uri(String path) => Uri.parse('$_base/api$path');

  Future<http.Response> _request({
    required String path,
    required String method,
    Map<String, String> headers = const {},
    Object? body,
    bool noAuth = false,
    bool noRefresh = false,
  }) async {
    final token = authStore.accessToken;
    final finalHeaders = Map<String, String>.from(headers);
    if (!noAuth) {
      if (token != null) finalHeaders['Authorization'] = 'Bearer $token';
    }
    http.Response response;
    if (body is http.MultipartRequest) {
      final multipart = body;
      final streamed = await _client.send(multipart);
      response = await http.Response.fromStream(streamed);
    } else {
      final http.Request request = http.Request(method, _uri(path));
      request.headers.addAll(finalHeaders);
      request.headers['Accept'] = 'application/json';
      if (body != null) {
        request.headers['Content-Type'] = 'application/json';
        request.body = jsonEncode(body);
      }
      final streamed = await _client.send(request);
      response = await http.Response.fromStream(streamed);
    }

    if (response.statusCode == 401 && !noAuth && !noRefresh) {
      final payload = await refreshAccessToken();
      if (payload != null) {
        return _request(
          path: path,
          method: method,
          headers: finalHeaders,
          body: body,
          noAuth: noAuth,
          noRefresh: true,
        );
      }
    }

    return response;
  }

  Future<T> request<T>({
    required String path,
    String method = 'GET',
    Map<String, String> headers = const {},
    Object? body,
    bool noAuth = false,
    bool noRefresh = false,
  }) async {
    final response = await _request(
      path: path,
      method: method,
      headers: headers,
      body: body,
      noAuth: noAuth,
      noRefresh: noRefresh,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiError(
        response.statusCode,
        _errorCode(response),
        _errorMessage(response) ?? 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەوە.',
        details: _errorDetails(response),
      );
    }

    if (response.statusCode == 204) {
      // 204 No Content carries no body — typed callers use dedicated helpers.
      return _empty<T>();
    }

    final contentType = response.headers['content-type'] ?? '';
    if (!contentType.contains('application/json')) {
      return jsonDecode(response.body) as T;
    }
    final decoded = jsonDecode(response.body);
    return decoded as T;
  }

  T _empty<T>() => throw StateError('204 No Content must be handled by a dedicated client method.');

  String _errorCode(http.Response response) {
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final error = body['error'];
      if (error is Map) {
        return error['code'] as String? ?? 'ERROR';
      }
    } catch (_) {
      // ignore
    }
    return 'ERROR';
  }

  String? _errorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final error = body['error'];
      if (error is Map) {
        return error['message'] as String?;
      }
    } catch (_) {
      // ignore
    }
    if (response.statusCode == 413) {
      return 'فایلەکە زۆر گەورەیە.';
    }
    if (response.statusCode == 429) {
      return 'هەوڵەکان زۆر بوون. کەمێک چاوەڕوان بە.';
    }
    return null;
  }

  dynamic _errorDetails(http.Response response) {
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      return body['error']?['details'];
    } catch (_) {
      return null;
    }
  }

  Future<AuthPayload?> refreshAccessToken() async {
    final token = authStore.refreshToken;
    if (token == null) {
      await authStore.clear();
      return null;
    }
    try {
      final response = await _client.post(
        _uri('/api/auth/refresh'),
        headers: <String, String>{'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: jsonEncode(<String, dynamic>{'token': token}),
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        await authStore.clear();
        return null;
      }
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final accessToken = decoded['accessToken'] as String?;
      final refreshToken = decoded['refreshToken'] as String?;
      final userJson = decoded['user'] as Map<String, dynamic>? ?? <String, dynamic>{};
      if (accessToken == null) {
        await authStore.clear();
        return null;
      }
      final payload = AuthPayload(accessToken: accessToken, refreshToken: refreshToken, user: User.fromJson(userJson));
      await authStore.setSession(payload);
      return payload;
    } catch (_) {
      await authStore.clear();
      return null;
    }
  }

  /// Multipart upload for avatars / covers / posts / stories / chat media.
  Future<http.Response> upload({required http.MultipartRequest request}) async {
    final token = authStore.accessToken;
    request.headers.addAll(<String, String>{
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    });
    final streamed = await _client.send(request);
    return http.Response.fromStream(streamed);
  }

  Future<void> logout() async {
    final response = await _request(path: '/api/auth/logout', method: 'POST', noAuth: true);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiError(response.statusCode, 'ERROR', 'تۆمارکراوەکان بەسەرچووە.');
    }
  }
}

/// Shared API client instance used by screens and stores.
final ApiClient apiClient = ApiClient();

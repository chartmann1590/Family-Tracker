import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user.dart';
import '../models/family.dart';
import '../models/location.dart';
import '../models/message.dart';
import 'auth_service.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiService {
  final AuthService _authService;

  ApiService(this._authService);

  Future<Map<String, String>> _getHeaders({bool includeAuth = true}) async {
    final headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      final token = await _authService.getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  Future<dynamic> _handleResponse(http.Response response) async {
    final statusCode = response.statusCode;

    if (statusCode >= 200 && statusCode < 300) {
      if (response.body.isEmpty) {
        return {};
      }
      return json.decode(response.body);
    } else {
      String errorMessage = 'Request failed with status: $statusCode';
      try {
        final errorData = json.decode(response.body);
        if (errorData['error'] is String) {
          errorMessage = errorData['error'];
        } else if (errorData['error'] is List) {
          errorMessage = errorData['error']
              .map((e) => '${e['field']}: ${e['message']}')
              .join(', ');
        }
      } catch (_) {
        // Use default error message
      }
      throw ApiException(errorMessage, statusCode);
    }
  }

  // Authentication endpoints
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.register}'),
      headers: await _getHeaders(includeAuth: false),
      body: json.encode({
        'email': email,
        'password': password,
        'name': name,
      }),
    );

    final data = await _handleResponse(response);
    return {
      'user': User.fromJson(data['user']),
      'token': data['token'] as String,
    };
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.login}'),
      headers: await _getHeaders(includeAuth: false),
      body: json.encode({
        'email': email,
        'password': password,
      }),
    );

    final data = await _handleResponse(response);
    return {
      'user': User.fromJson(data['user']),
      'token': data['token'] as String,
    };
  }

  Future<User> getCurrentUser() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.me}'),
      headers: await _getHeaders(),
    );

    final data = await _handleResponse(response);
    return User.fromJson(data['user']);
  }

  // Family endpoints
  Future<Family> createFamily(String name) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.createFamily}'),
      headers: await _getHeaders(),
      body: json.encode({'name': name}),
    );

    final data = await _handleResponse(response);
    return Family.fromJson(data['family']);
  }

  Future<Family> getMyFamily() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.getFamily}'),
      headers: await _getHeaders(),
    );

    final data = await _handleResponse(response);
    return Family.fromJson(data['family']);
  }

  Future<Family> updateFamilyName(String name) async {
    final response = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.updateFamily}'),
      headers: await _getHeaders(),
      body: json.encode({'name': name}),
    );

    final data = await _handleResponse(response);
    return Family.fromJson(data['family']);
  }

  Future<void> inviteUserToFamily(String email) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.inviteUser}'),
      headers: await _getHeaders(),
      body: json.encode({'email': email}),
    );

    await _handleResponse(response);
  }

  Future<void> leaveFamily() async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.leaveFamily}'),
      headers: await _getHeaders(),
    );

    await _handleResponse(response);
  }

  // Location endpoints
  Future<Location> updateLocation({
    required double latitude,
    required double longitude,
    double? accuracy,
    double? altitude,
    int? battery,
    String? timestamp,
  }) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.updateLocation}'),
      headers: await _getHeaders(),
      body: json.encode({
        'latitude': latitude,
        'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
        if (altitude != null) 'altitude': altitude,
        if (battery != null) 'battery': battery,
        if (timestamp != null) 'timestamp': timestamp,
      }),
    );

    final data = await _handleResponse(response);
    return Location.fromJson(data['location']);
  }

  Future<List<FamilyMemberLocation>> getFamilyLocations() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.getFamilyLocations}'),
      headers: await _getHeaders(),
    );

    final data = await _handleResponse(response);
    final locations = data['locations'] as List;
    return locations
        .map((loc) => FamilyMemberLocation.fromJson(loc))
        .toList();
  }

  Future<List<Location>> getLocationHistory(int userId, {int limit = 100}) async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/locations/history/$userId?limit=$limit'),
      headers: await _getHeaders(),
    );

    final data = await _handleResponse(response);
    final locations = data['locations'] as List;
    return locations.map((loc) => Location.fromJson(loc)).toList();
  }

  // Message endpoints
  Future<Message> sendMessage(String message) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.sendMessage}'),
      headers: await _getHeaders(),
      body: json.encode({'message': message}),
    );

    final data = await _handleResponse(response);
    return Message.fromJson(data['message']);
  }

  Future<Map<String, dynamic>> getMessages({int limit = 100, int offset = 0}) async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.getMessages}?limit=$limit&offset=$offset'),
      headers: await _getHeaders(),
    );

    final data = await _handleResponse(response);
    final messages = (data['messages'] as List)
        .map((msg) => Message.fromJson(msg))
        .toList();
    final pagination = MessagePagination.fromJson(data['pagination']);

    return {
      'messages': messages,
      'pagination': pagination,
    };
  }

  Future<void> deleteMessage(int messageId) async {
    final response = await http.delete(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.deleteMessage}/$messageId'),
      headers: await _getHeaders(),
    );

    await _handleResponse(response);
  }

  // Health check
  Future<bool> checkHealth() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/health'),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}

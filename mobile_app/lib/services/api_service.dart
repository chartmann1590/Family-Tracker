import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user.dart';
import '../models/family.dart';
import '../models/location.dart';
import '../models/message.dart';
import 'auth_service.dart';
import 'server_config_service.dart';
import 'logger_service.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiService {
  final AuthService _authService;
  final ServerConfigService _serverConfigService = ServerConfigService();
  final LoggerService _logger = LoggerService();

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

  Future<String> _getBaseUrl() async {
    return await _serverConfigService.getApiBaseUrl();
  }

  Future<dynamic> _handleResponse(http.Response response, String endpoint) async {
    final statusCode = response.statusCode;

    _logger.logApiCall(
      endpoint.split('?')[0], // Remove query params for logging
      endpoint,
      statusCode,
    );

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

      _logger.error('API Error: $endpoint - $errorMessage', statusCode);
      throw ApiException(errorMessage, statusCode);
    }
  }

  // Authentication endpoints
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String name,
  }) async {
    try {
      final baseUrl = await _getBaseUrl();
      _logger.info('Registering user: $email');

      final response = await http.post(
        Uri.parse('$baseUrl${ApiConfig.register}'),
        headers: await _getHeaders(includeAuth: false),
        body: json.encode({
          'email': email,
          'password': password,
          'name': name,
        }),
      );

      final data = await _handleResponse(response, 'POST ${ApiConfig.register}');
      _logger.logAuthEvent('User registered: $email');
      return {
        'user': User.fromJson(data['user']),
        'token': data['token'] as String,
      };
    } catch (e, stackTrace) {
      _logger.error('Registration failed', e, stackTrace);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final baseUrl = await _getBaseUrl();
      _logger.info('Logging in user: $email');

      final response = await http.post(
        Uri.parse('$baseUrl${ApiConfig.login}'),
        headers: await _getHeaders(includeAuth: false),
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      final data = await _handleResponse(response, 'POST ${ApiConfig.login}');
      _logger.logAuthEvent('User logged in: $email');
      return {
        'user': User.fromJson(data['user']),
        'token': data['token'] as String,
      };
    } catch (e, stackTrace) {
      _logger.error('Login failed', e, stackTrace);
      rethrow;
    }
  }

  Future<User> getCurrentUser() async {
    try {
      final baseUrl = await _getBaseUrl();

      final response = await http.get(
        Uri.parse('$baseUrl${ApiConfig.me}'),
        headers: await _getHeaders(),
      );

      final data = await _handleResponse(response, 'GET ${ApiConfig.me}');
      return User.fromJson(data['user']);
    } catch (e, stackTrace) {
      _logger.error('Get current user failed', e, stackTrace);
      rethrow;
    }
  }

  // Family endpoints
  Future<Family> createFamily(String name) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.post(
        Uri.parse('$baseUrl${ApiConfig.createFamily}'),
        headers: await _getHeaders(),
        body: json.encode({'name': name}),
      );

      final data = await _handleResponse(response, 'POST ${ApiConfig.createFamily}');
      return Family.fromJson(data['family']);
    } catch (e, stackTrace) {
      _logger.error('Create family failed', e, stackTrace);
      rethrow;
    }
  }

  Future<Family> getMyFamily() async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl${ApiConfig.getFamily}'),
        headers: await _getHeaders(),
      );

      final data = await _handleResponse(response, 'GET ${ApiConfig.getFamily}');
      return Family.fromJson(data['family']);
    } catch (e, stackTrace) {
      _logger.error('Get family failed', e, stackTrace);
      rethrow;
    }
  }

  Future<Family> updateFamilyName(String name) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.patch(
        Uri.parse('$baseUrl${ApiConfig.updateFamily}'),
        headers: await _getHeaders(),
        body: json.encode({'name': name}),
      );

      final data = await _handleResponse(response, 'PATCH ${ApiConfig.updateFamily}');
      return Family.fromJson(data['family']);
    } catch (e, stackTrace) {
      _logger.error('Update family failed', e, stackTrace);
      rethrow;
    }
  }

  Future<void> inviteUserToFamily(String email) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.post(
        Uri.parse('$baseUrl${ApiConfig.inviteUser}'),
        headers: await _getHeaders(),
        body: json.encode({'email': email}),
      );

      await _handleResponse(response, 'POST ${ApiConfig.inviteUser}');
    } catch (e, stackTrace) {
      _logger.error('Invite user failed', e, stackTrace);
      rethrow;
    }
  }

  Future<void> leaveFamily() async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.post(
        Uri.parse('$baseUrl${ApiConfig.leaveFamily}'),
        headers: await _getHeaders(),
      );

      await _handleResponse(response, 'POST ${ApiConfig.leaveFamily}');
    } catch (e, stackTrace) {
      _logger.error('Leave family failed', e, stackTrace);
      rethrow;
    }
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
    try {
      final baseUrl = await _getBaseUrl();
      _logger.logLocationUpdate(latitude, longitude);

      final response = await http.post(
        Uri.parse('$baseUrl${ApiConfig.updateLocation}'),
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

      final data = await _handleResponse(response, 'POST ${ApiConfig.updateLocation}');
      return Location.fromJson(data['location']);
    } catch (e, stackTrace) {
      _logger.error('Update location failed', e, stackTrace);
      rethrow;
    }
  }

  Future<List<FamilyMemberLocation>> getFamilyLocations() async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl${ApiConfig.getFamilyLocations}'),
        headers: await _getHeaders(),
      );

      final data = await _handleResponse(response, 'GET ${ApiConfig.getFamilyLocations}');
      final locations = data['locations'] as List;
      return locations
          .map((loc) => FamilyMemberLocation.fromJson(loc))
          .toList();
    } catch (e, stackTrace) {
      _logger.error('Get family locations failed', e, stackTrace);
      rethrow;
    }
  }

  Future<List<Location>> getLocationHistory(int userId, {int limit = 100}) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl/locations/history/$userId?limit=$limit'),
        headers: await _getHeaders(),
      );

      final data = await _handleResponse(response, 'GET /locations/history/$userId');
      final locations = data['locations'] as List;
      return locations.map((loc) => Location.fromJson(loc)).toList();
    } catch (e, stackTrace) {
      _logger.error('Get location history failed', e, stackTrace);
      rethrow;
    }
  }

  // Message endpoints
  Future<Message> sendMessage(String message) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.post(
        Uri.parse('$baseUrl${ApiConfig.sendMessage}'),
        headers: await _getHeaders(),
        body: json.encode({'message': message}),
      );

      final data = await _handleResponse(response, 'POST ${ApiConfig.sendMessage}');
      return Message.fromJson(data['message']);
    } catch (e, stackTrace) {
      _logger.error('Send message failed', e, stackTrace);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getMessages({int limit = 100, int offset = 0}) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl${ApiConfig.getMessages}?limit=$limit&offset=$offset'),
        headers: await _getHeaders(),
      );

      final data = await _handleResponse(response, 'GET ${ApiConfig.getMessages}');
      final messages = (data['messages'] as List)
          .map((msg) => Message.fromJson(msg))
          .toList();
      final pagination = MessagePagination.fromJson(data['pagination']);

      return {
        'messages': messages,
        'pagination': pagination,
      };
    } catch (e, stackTrace) {
      _logger.error('Get messages failed', e, stackTrace);
      rethrow;
    }
  }

  Future<void> deleteMessage(int messageId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.delete(
        Uri.parse('$baseUrl${ApiConfig.deleteMessage}/$messageId'),
        headers: await _getHeaders(),
      );

      await _handleResponse(response, 'DELETE ${ApiConfig.deleteMessage}/$messageId');
    } catch (e, stackTrace) {
      _logger.error('Delete message failed', e, stackTrace);
      rethrow;
    }
  }

  // Health check
  Future<bool> checkHealth() async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl/health'),
      );
      _logger.logApiCall('GET', '/health', response.statusCode);
      return response.statusCode == 200;
    } catch (e) {
      _logger.error('Health check failed', e);
      return false;
    }
  }
}

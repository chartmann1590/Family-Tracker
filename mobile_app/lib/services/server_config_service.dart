import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'logger_service.dart';

class ServerConfigService {
  static final ServerConfigService _instance = ServerConfigService._internal();
  factory ServerConfigService() => _instance;

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );
  final LoggerService _logger = LoggerService();

  static const String _serverUrlKey = 'server_url';
  static const String _isConfiguredKey = 'is_configured';

  String? _cachedServerUrl;
  bool? _cachedIsConfigured;

  ServerConfigService._internal();

  // Get server URL
  Future<String?> getServerUrl() async {
    if (_cachedServerUrl != null) {
      return _cachedServerUrl;
    }

    try {
      _cachedServerUrl = await _storage.read(key: _serverUrlKey);
      return _cachedServerUrl;
    } catch (e) {
      _logger.error('Error reading server URL', e);
      return null;
    }
  }

  // Save server URL
  Future<void> saveServerUrl(String url) async {
    try {
      // Normalize URL - remove trailing slash
      String normalizedUrl = url.trim();
      if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.substring(0, normalizedUrl.length - 1);
      }

      // Ensure it starts with http:// or https://
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'http://$normalizedUrl';
      }

      await _storage.write(key: _serverUrlKey, value: normalizedUrl);
      _cachedServerUrl = normalizedUrl;

      _logger.info('Server URL saved: $normalizedUrl');
    } catch (e) {
      _logger.error('Error saving server URL', e);
      rethrow;
    }
  }

  // Check if server is configured
  Future<bool> isConfigured() async {
    if (_cachedIsConfigured != null) {
      return _cachedIsConfigured!;
    }

    try {
      // Try to get from SharedPreferences first (more reliable for simple flags)
      final prefs = await SharedPreferences.getInstance();
      final isConfigured = prefs.getBool(_isConfiguredKey);
      
      if (isConfigured == true) {
        _cachedIsConfigured = true;
        return true;
      }

      // Fallback: Check if we have a server URL in secure storage
      // This handles cases where the flag might have been lost but data persists
      final serverUrl = await _storage.read(key: _serverUrlKey);
      if (serverUrl != null && serverUrl.isNotEmpty) {
        _logger.info('Found server URL but is_configured flag was missing. Repairing...');
        await markAsConfigured(); // Repair the flag
        _cachedIsConfigured = true;
        return true;
      }

      _cachedIsConfigured = false;
      return false;
    } catch (e) {
      _logger.error('Error checking configuration status', e);
      return false;
    }
  }

  // Mark as configured
  Future<void> markAsConfigured() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_isConfiguredKey, true);
      
      // Also save to secure storage for backward compatibility/redundancy
      await _storage.write(key: _isConfiguredKey, value: 'true');
      
      _cachedIsConfigured = true;
      _logger.info('Server marked as configured');
    } catch (e) {
      _logger.error('Error marking as configured', e);
      rethrow;
    }
  }

  // Reset configuration
  Future<void> resetConfiguration() async {
    try {
      await _storage.delete(key: _serverUrlKey);
      await _storage.delete(key: _isConfiguredKey);
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_isConfiguredKey);
      
      _cachedServerUrl = null;
      _cachedIsConfigured = null;
      _logger.info('Server configuration reset');
    } catch (e) {
      _logger.error('Error resetting configuration', e);
      rethrow;
    }
  }

  // Test server connection
  Future<ServerTestResult> testConnection(String url) async {
    try {
      _logger.info('Testing connection to: $url');

      // Normalize URL
      String testUrl = url.trim();
      if (testUrl.endsWith('/')) {
        testUrl = testUrl.substring(0, testUrl.length - 1);
      }
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = 'http://$testUrl';
      }

      // Try to connect to health endpoint
      final healthUrl = '$testUrl/api/health';
      _logger.info('Checking health endpoint: $healthUrl');

      final response = await http.get(
        Uri.parse(healthUrl),
      ).timeout(const Duration(seconds: 10));

      _logger.info('Health check response: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['status'] == 'ok') {
          _logger.info('Server connection successful');
          return ServerTestResult(
            success: true,
            message: 'Connection successful!',
            serverUrl: testUrl,
          );
        }
      }

      _logger.warning('Server returned unexpected response: ${response.statusCode}');
      return ServerTestResult(
        success: false,
        message: 'Server returned unexpected response (${response.statusCode})',
        serverUrl: testUrl,
      );
    } catch (e) {
      _logger.error('Server connection test failed', e);

      String errorMessage = 'Connection failed: ';
      if (e.toString().contains('SocketException')) {
        errorMessage += 'Cannot reach server. Check IP address and network.';
      } else if (e.toString().contains('TimeoutException')) {
        errorMessage += 'Connection timeout. Server may be down.';
      } else if (e.toString().contains('FormatException')) {
        errorMessage += 'Invalid server URL format.';
      } else {
        errorMessage += e.toString();
      }

      return ServerTestResult(
        success: false,
        message: errorMessage,
        serverUrl: url,
      );
    }
  }

  // Get API base URL
  Future<String> getApiBaseUrl() async {
    final serverUrl = await getServerUrl();
    if (serverUrl == null) {
      throw Exception('Server not configured');
    }
    return '$serverUrl/api';
  }

  // Get WebSocket URL
  Future<String> getWebSocketUrl() async {
    final serverUrl = await getServerUrl();
    if (serverUrl == null) {
      throw Exception('Server not configured');
    }

    // Convert http to ws, https to wss
    String wsUrl = serverUrl.replaceFirst('http://', 'ws://');
    wsUrl = wsUrl.replaceFirst('https://', 'wss://');

    return '$wsUrl/ws';
  }
}

class ServerTestResult {
  final bool success;
  final String message;
  final String serverUrl;

  ServerTestResult({
    required this.success,
    required this.message,
    required this.serverUrl,
  });
}

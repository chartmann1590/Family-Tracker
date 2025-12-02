import 'package:workmanager/workmanager.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'logger_service.dart';

/// Background location tracking service using WorkManager
/// This is a simpler, more reliable approach than flutter_background_service
class BackgroundLocationService {
  static const String _taskName = 'locationUpdateTask';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  /// Initialize the background location service
  static Future<void> initialize() async {
    await Workmanager().initialize(
      _callbackDispatcher,
      isInDebugMode: false, // Set to true for debugging
    );
  }

  /// Start background location tracking
  /// Updates location every 15 minutes
  static Future<void> startTracking() async {
    final logger = LoggerService();

    try {
      logger.info('Starting background location tracking with WorkManager');

      // Register the periodic task
      // WorkManager will run this task approximately every 15 minutes
      await Workmanager().registerPeriodicTask(
        _taskName,
        _taskName,
        frequency: const Duration(minutes: 15), // Minimum allowed by Android
        constraints: Constraints(
          networkType: NetworkType.connected, // Require internet
        ),
        backoffPolicy: BackoffPolicy.exponential,
        backoffPolicyDelay: const Duration(seconds: 30),
      );

      logger.info('Background location tracking started successfully');
    } catch (e, stackTrace) {
      logger.error('Failed to start background tracking', e, stackTrace);
      rethrow;
    }
  }

  /// Stop background location tracking
  static Future<void> stopTracking() async {
    final logger = LoggerService();

    try {
      logger.info('Stopping background location tracking');
      await Workmanager().cancelByUniqueName(_taskName);
      logger.info('Background location tracking stopped');
    } catch (e, stackTrace) {
      logger.error('Failed to stop background tracking', e, stackTrace);
    }
  }

  /// Check if background tracking is enabled
  static Future<bool> isTrackingEnabled() async {
    // WorkManager doesn't provide a way to check if a task is registered
    // So we'll use SharedPreferences to track this
    // This is handled in the settings screen
    return false;
  }
}

/// Background callback dispatcher
/// This function runs in a separate isolate from the main app
@pragma('vm:entry-point')
void _callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      print('[BackgroundWorker] Task started: $task');

      // Get authentication token from secure storage
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final apiUrl = await storage.read(key: 'api_url');

      if (token == null || token.isEmpty) {
        print('[BackgroundWorker] No auth token found, skipping location update');
        return Future.value(true);
      }

      if (apiUrl == null || apiUrl.isEmpty) {
        print('[BackgroundWorker] No API URL found, skipping location update');
        return Future.value(true);
      }

      // Check location permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        print('[BackgroundWorker] Location permission denied');
        return Future.value(true);
      }

      // Get current location
      print('[BackgroundWorker] Getting current location...');
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 30),
      );

      print('[BackgroundWorker] Location obtained: ${position.latitude}, ${position.longitude}');

      // Send location to backend
      final url = Uri.parse('$apiUrl/api/locations');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'altitude': position.altitude,
          'speed': position.speed,
          'heading': position.heading,
          'timestamp': position.timestamp.toIso8601String(),
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('[BackgroundWorker] Location sent successfully');
        return Future.value(true);
      } else {
        print('[BackgroundWorker] Failed to send location: ${response.statusCode} - ${response.body}');
        return Future.value(false);
      }

    } catch (e, stackTrace) {
      print('[BackgroundWorker] Error: $e');
      print('[BackgroundWorker] StackTrace: $stackTrace');
      return Future.value(false);
    }
  });
}

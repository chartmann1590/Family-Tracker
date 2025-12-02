import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'auth_service.dart';
import 'logger_service.dart';

class BackgroundLocationService {
  static final BackgroundLocationService _instance = BackgroundLocationService._internal();
  factory BackgroundLocationService() => _instance;
  BackgroundLocationService._internal();

  final LoggerService _logger = LoggerService();
  final FlutterBackgroundService _service = FlutterBackgroundService();
  bool _isInitialized = false;

  // Initialize the background service
  Future<void> initialize() async {
    if (_isInitialized) {
      _logger.debug('BackgroundLocationService: Already initialized');
      return;
    }

    try {
      await _service.configure(
        androidConfiguration: AndroidConfiguration(
          onStart: onStart,
          autoStart: false,
          isForegroundMode: true,
          notificationChannelId: 'family_tracker_location',
          initialNotificationTitle: 'Family Tracker',
          initialNotificationContent: 'Location tracking active',
          foregroundServiceNotificationId: 888,
        ),
        iosConfiguration: IosConfiguration(
          autoStart: false,
          onForeground: onStart,
          onBackground: onIosBackground,
        ),
      );

      _isInitialized = true;
      _logger.info('BackgroundLocationService: Initialized successfully');
    } catch (e, stackTrace) {
      _logger.error('BackgroundLocationService: Failed to initialize', e, stackTrace);
      rethrow;
    }
  }

  // Start the background service
  Future<void> start() async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final isRunning = await _service.isRunning();
      if (isRunning) {
        _logger.debug('BackgroundLocationService: Already running');
        return;
      }

      await _service.startService();
      _logger.info('BackgroundLocationService: Started');
    } catch (e, stackTrace) {
      _logger.error('BackgroundLocationService: Failed to start', e, stackTrace);
      rethrow;
    }
  }

  // Stop the background service
  Future<void> stop() async {
    try {
      final isRunning = await _service.isRunning();
      if (!isRunning) {
        _logger.debug('BackgroundLocationService: Not running');
        return;
      }

      _service.invoke('stopService');
      _logger.info('BackgroundLocationService: Stopped');
    } catch (e, stackTrace) {
      _logger.error('BackgroundLocationService: Failed to stop', e, stackTrace);
    }
  }

  // Check if service is running
  Future<bool> isRunning() async {
    return await _service.isRunning();
  }

  // iOS background handler
  @pragma('vm:entry-point')
  static Future<bool> onIosBackground(ServiceInstance service) async {
    WidgetsFlutterBinding.ensureInitialized();
    DartPluginRegistrant.ensureInitialized();
    return true;
  }

  // Main background service entry point
  @pragma('vm:entry-point')
  static void onStart(ServiceInstance service) async {
    try {
      DartPluginRegistrant.ensureInitialized();

      final logger = LoggerService();
      logger.info('BackgroundLocationService: onStart called');

      // Initialize services once
      final authService = AuthService();
      final apiService = ApiService(authService);
      final prefs = await SharedPreferences.getInstance();

      if (service is AndroidServiceInstance) {
        service.on('setAsForeground').listen((event) {
          service.setAsForegroundService();
        });

        service.on('setAsBackground').listen((event) {
          service.setAsBackgroundService();
        });

        // valid for background service
        service.setAsForegroundService();
        
        service.setForegroundNotificationInfo(
          title: 'Family Tracker',
          content: 'Location tracking active',
        );
      }

      service.on('stopService').listen((event) {
        logger.info('BackgroundLocationService: Stop requested');
        service.stopSelf();
      });

      // Start location updates
      Timer.periodic(const Duration(seconds: 1), (timer) async {
        if (service is AndroidServiceInstance) {
          if (!await service.isForegroundService()) {
            return;
          }
        }

        try {
          // Reload prefs to get latest settings
          await prefs.reload();
          final intervalSeconds = prefs.getInt('location_update_interval') ?? 60;

          // Check if we should update based on interval
          final lastUpdate = prefs.getInt('last_location_update') ?? 0;
          final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;

          if (now - lastUpdate < intervalSeconds) {
            return;
          }

          // Get current location
          final position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
          );

          logger.info('BackgroundLocationService: Got location: ${position.latitude}, ${position.longitude}');

          // Send location to server using reused services
          await _sendLocationUpdate(position, logger, apiService);

          // Update last update time
          await prefs.setInt('last_location_update', now);

          // Update notification
          if (service is AndroidServiceInstance) {
            service.setForegroundNotificationInfo(
              title: 'Family Tracker',
              content: 'Location updated: ${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}',
            );
          }
        } catch (e, stackTrace) {
          logger.error('BackgroundLocationService: Error in update loop', e, stackTrace);
        }
      });
    } catch (e, stackTrace) {
      print('CRITICAL ERROR in BackgroundLocationService: $e');
      print(stackTrace);
      // Try to log to file as well if possible
      try {
        final logger = LoggerService();
        logger.fatal('CRITICAL ERROR in BackgroundLocationService', e, stackTrace);
      } catch (_) {}
    }
  }

  // Send location update to server
  // Send location to server
  static Future<void> _sendLocationUpdate(Position position, LoggerService logger, ApiService apiService) async {
    try {
      // Send location to server
      await apiService.updateLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      );

      logger.info('BackgroundLocationService: Location sent to server');
    } catch (e, stackTrace) {
      logger.error('BackgroundLocationService: Failed to send location', e, stackTrace);
    }
  }

  // Start background tracking (alias for start)
  Future<void> startBackgroundTracking() async {
    await start();
  }

  // Stop background tracking (alias for stop)
  Future<void> stopBackgroundTracking() async {
    await stop();
  }

  // Check if background tracking is enabled
  Future<bool> isBackgroundTrackingEnabled() async {
    return await isRunning();
  }

  // Update the interval setting with LocationInterval enum
  Future<void> updateInterval(LocationInterval interval) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('location_update_interval', interval.seconds);
      _logger.info('BackgroundLocationService: Interval updated to ${interval.seconds} seconds');
    } catch (e, stackTrace) {
      _logger.error('BackgroundLocationService: Failed to update interval', e, stackTrace);
    }
  }

  // Get current interval setting
  Future<LocationInterval> getCurrentInterval() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final seconds = prefs.getInt('location_update_interval') ?? 60;

      return LocationInterval.values.firstWhere(
        (interval) => interval.seconds == seconds,
        orElse: () => LocationInterval.interval60s,
      );
    } catch (e, stackTrace) {
      _logger.error('BackgroundLocationService: Failed to get interval', e, stackTrace);
      return LocationInterval.interval60s;
    }
  }
}

// Location interval enum
enum LocationInterval {
  interval15s(15, '15 seconds'),
  interval30s(30, '30 seconds'),
  interval60s(60, '60 seconds (Default)');

  final int seconds;
  final String label;

  const LocationInterval(this.seconds, this.label);
}

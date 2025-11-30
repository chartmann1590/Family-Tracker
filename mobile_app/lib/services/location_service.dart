import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'api_service.dart';

class LocationService {
  final ApiService _apiService;
  StreamSubscription<Position>? _positionStreamSubscription;
  Timer? _backgroundTimer;
  bool _isTracking = false;

  LocationService(this._apiService);

  // Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  // Check location permission status
  Future<LocationPermission> checkPermission() async {
    return await Geolocator.checkPermission();
  }

  // Request location permission
  Future<LocationPermission> requestPermission() async {
    LocationPermission permission = await checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    return permission;
  }

  // Request background location permission (Android 10+)
  Future<bool> requestBackgroundPermission() async {
    final status = await Permission.locationAlways.request();
    return status.isGranted;
  }

  // Check if we have proper permissions
  Future<bool> hasProperPermissions() async {
    final serviceEnabled = await isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    final permission = await checkPermission();
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  // Get current position
  Future<Position?> getCurrentPosition() async {
    try {
      if (!await hasProperPermissions()) {
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      print('Error getting current position: $e');
      return null;
    }
  }

  // Get battery level (approximation based on location accuracy)
  Future<int?> getBatteryLevel() async {
    try {
      // Note: For actual battery level, you'd need battery_plus package
      // For now, we'll return null and let the backend handle it
      return null;
    } catch (e) {
      return null;
    }
  }

  // Start location tracking
  Future<void> startTracking({
    Duration interval = const Duration(minutes: 5),
  }) async {
    if (_isTracking) {
      return;
    }

    if (!await hasProperPermissions()) {
      throw Exception('Location permissions not granted');
    }

    _isTracking = true;

    // Start foreground location tracking
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Update every 10 meters
    );

    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) async {
      await _updateLocationToServer(position);
    });

    // Start background location tracking
    await _startBackgroundTracking(interval);
  }

  // Start background location tracking using Timer
  Future<void> _startBackgroundTracking(Duration interval) async {
    try {
      // Use a periodic timer for background updates
      _backgroundTimer = Timer.periodic(interval, (timer) async {
        if (!_isTracking) {
          timer.cancel();
          return;
        }

        try {
          final position = await getCurrentPosition();
          if (position != null) {
            await _updateLocationToServer(position);
          }
        } catch (e) {
          print('Error in periodic location update: $e');
        }
      });
    } catch (e) {
      print('Error starting background location timer: $e');
    }
  }

  // Update location to server
  Future<void> _updateLocationToServer(Position position) async {
    try {
      final battery = await getBatteryLevel();
      await _apiService.updateLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        battery: battery,
        timestamp: position.timestamp?.toIso8601String(),
      );
    } catch (e) {
      print('Error updating location to server: $e');
    }
  }

  // Stop location tracking
  Future<void> stopTracking() async {
    _isTracking = false;

    await _positionStreamSubscription?.cancel();
    _positionStreamSubscription = null;

    _backgroundTimer?.cancel();
    _backgroundTimer = null;
  }

  // Update location once
  Future<void> updateLocationOnce() async {
    final position = await getCurrentPosition();
    if (position != null) {
      await _updateLocationToServer(position);
    }
  }

  // Calculate distance between two points
  double calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  // Get location settings for user to enable location
  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  // Dispose
  void dispose() {
    stopTracking();
  }

  bool get isTracking => _isTracking;
}

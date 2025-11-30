import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../models/location.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../services/websocket_service.dart';
import '../services/logger_service.dart';

class LocationProvider with ChangeNotifier {
  final ApiService _apiService;
  final LocationService _locationService;
  final WebSocketService _webSocketService;
  final LoggerService _logger = LoggerService();

  List<FamilyMemberLocation> _familyLocations = [];
  Position? _currentPosition;
  bool _isLoading = false;
  bool _isTracking = false;
  String? _error;
  StreamSubscription<Map<String, dynamic>>? _wsSubscription;

  LocationProvider(
    this._apiService,
    this._locationService,
    this._webSocketService,
  ) {
    _listenToWebSocket();
  }

  List<FamilyMemberLocation> get familyLocations => _familyLocations;
  Position? get currentPosition => _currentPosition;
  bool get isLoading => _isLoading;
  bool get isTracking => _isTracking;
  String? get error => _error;
  bool get hasLocations => _familyLocations.isNotEmpty;

  // Listen to WebSocket for real-time location updates
  void _listenToWebSocket() {
    _wsSubscription?.cancel();
    _wsSubscription = _webSocketService.messages.listen((data) {
      if (data['type'] == 'location_update') {
        _handleLocationUpdate(data['data']);
      }
    });
  }

  void _handleLocationUpdate(Map<String, dynamic> data) {
    try {
      final userId = data['userId'] as int;
      final userName = data['userName'] as String;
      final locationData = data['location'] as Map<String, dynamic>;

      final location = Location.fromJson(locationData);
      final memberLocation = FamilyMemberLocation(
        userId: userId,
        userName: userName,
        userEmail: '', // Not provided in WebSocket update
        location: location,
      );

      // Update or add the location
      final index = _familyLocations.indexWhere((l) => l.userId == userId);
      if (index >= 0) {
        _familyLocations[index] = memberLocation;
      } else {
        _familyLocations.add(memberLocation);
      }

      notifyListeners();
    } catch (e, stackTrace) {
      _logger.error("Error in provider", e, stackTrace);
      print('Error handling location update: $e');
    }
  }

  // Load family locations
  Future<void> loadFamilyLocations() async {
    _setLoading(true);
    _error = null;

    try {
      final locations = await _apiService.getFamilyLocations();
      _familyLocations = locations;
      _setLoading(false);
    } catch (e, stackTrace) {
      _logger.error("Error in provider", e, stackTrace);
      _error = e.toString();
      _setLoading(false);
    }
  }

  // Get current position
  Future<void> updateCurrentPosition() async {
    try {
      final position = await _locationService.getCurrentPosition();
      _currentPosition = position;
      notifyListeners();
    } catch (e, stackTrace) {
      _logger.error("Error in provider", e, stackTrace);
      print('Error getting current position: $e');
    }
  }

  // Start location tracking
  Future<bool> startTracking() async {
    _error = null;

    try {
      // Check permissions first
      if (!await _locationService.hasProperPermissions()) {
        final permission = await _locationService.requestPermission();
        if (permission != LocationPermission.always &&
            permission != LocationPermission.whileInUse) {
          _error = 'Location permission denied';
          notifyListeners();
          return false;
        }
      }

      await _locationService.startTracking();
      _isTracking = true;
      notifyListeners();
      return true;
    } catch (e, stackTrace) {
      _logger.error("Error in provider", e, stackTrace);
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Stop location tracking
  Future<void> stopTracking() async {
    await _locationService.stopTracking();
    _isTracking = false;
    notifyListeners();
  }

  // Update location once
  Future<bool> updateLocationOnce() async {
    _error = null;

    try {
      await _locationService.updateLocationOnce();
      await updateCurrentPosition();
      return true;
    } catch (e, stackTrace) {
      _logger.error("Error in provider", e, stackTrace);
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Request location permission
  Future<LocationPermission> requestPermission() async {
    return await _locationService.requestPermission();
  }

  // Check if location service is enabled
  Future<bool> isLocationServiceEnabled() async {
    return await _locationService.isLocationServiceEnabled();
  }

  // Open location settings
  Future<void> openLocationSettings() async {
    await _locationService.openLocationSettings();
  }

  // Get location for a specific user
  FamilyMemberLocation? getLocationForUser(int userId) {
    try {
      return _familyLocations.firstWhere((loc) => loc.userId == userId);
    } catch (e, stackTrace) {
      _logger.error("Error in provider", e, stackTrace);
      return null;
    }
  }

  // Calculate distance to a user
  double? getDistanceToUser(int userId) {
    if (_currentPosition == null) {
      return null;
    }

    final userLocation = getLocationForUser(userId);
    if (userLocation == null) {
      return null;
    }

    return _locationService.calculateDistance(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      userLocation.location.latitude,
      userLocation.location.longitude,
    );
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearLocations() {
    _familyLocations = [];
    _currentPosition = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    _locationService.dispose();
    super.dispose();
  }
}

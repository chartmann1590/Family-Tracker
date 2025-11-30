import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/logger_service.dart';

enum AuthState {
  initial,
  authenticated,
  unauthenticated,
  loading,
}

class AuthProvider with ChangeNotifier {
  final ApiService _apiService;
  final AuthService _authService;
  final LoggerService _logger = LoggerService();

  User? _user;
  AuthState _state = AuthState.initial;
  String? _error;

  AuthProvider(this._apiService, this._authService);

  User? get user => _user;
  AuthState get state => _state;
  String? get error => _error;
  bool get isAuthenticated => _state == AuthState.authenticated && _user != null;
  bool get isLoading => _state == AuthState.loading;

  // Check if user is already authenticated
  Future<void> checkAuthentication() async {
    _setState(AuthState.loading);
    _logger.info('AuthProvider: Checking authentication...');

    try {
      final hasToken = await _authService.hasToken();

      if (hasToken) {
        _logger.info('AuthProvider: Token found, fetching user data');
        final user = await _apiService.getCurrentUser();
        _user = user;
        await _authService.saveUserData(
          userId: user.id,
          email: user.email,
          name: user.name,
        );
        _logger.logAuthEvent('User authenticated: ${user.email}');
        _setState(AuthState.authenticated);
      } else {
        _logger.info('AuthProvider: No token found');
        _setState(AuthState.unauthenticated);
      }
    } catch (e, stackTrace) {
      _logger.error('AuthProvider: Error checking authentication', e, stackTrace);
      await _authService.clearAll();
      _setState(AuthState.unauthenticated);
    }
  }

  // Login
  Future<bool> login(String email, String password) async {
    _setState(AuthState.loading);
    _error = null;
    _logger.info('AuthProvider: Attempting login for $email');

    try {
      final result = await _apiService.login(email: email, password: password);
      final user = result['user'] as User;
      final token = result['token'] as String;

      await _authService.saveToken(token);
      await _authService.saveUserData(
        userId: user.id,
        email: user.email,
        name: user.name,
      );

      _user = user;
      _logger.logAuthEvent('Login successful: $email');
      _setState(AuthState.authenticated);
      return true;
    } catch (e, stackTrace) {
      _logger.error('AuthProvider: Login failed for $email', e, stackTrace);
      _error = e.toString();
      _setState(AuthState.unauthenticated);
      return false;
    }
  }

  // Register
  Future<bool> register(String email, String password, String name) async {
    _setState(AuthState.loading);
    _error = null;
    _logger.info('AuthProvider: Attempting registration for $email');

    try {
      final result = await _apiService.register(
        email: email,
        password: password,
        name: name,
      );
      final user = result['user'] as User;
      final token = result['token'] as String;

      await _authService.saveToken(token);
      await _authService.saveUserData(
        userId: user.id,
        email: user.email,
        name: user.name,
      );

      _user = user;
      _logger.logAuthEvent('Registration successful: $email');
      _setState(AuthState.authenticated);
      return true;
    } catch (e, stackTrace) {
      _logger.error('AuthProvider: Registration failed for $email', e, stackTrace);
      _error = e.toString();
      _setState(AuthState.unauthenticated);
      return false;
    }
  }

  // Refresh user data
  Future<void> refreshUser() async {
    try {
      _logger.info('AuthProvider: Refreshing user data');
      final user = await _apiService.getCurrentUser();
      _user = user;
      await _authService.saveUserData(
        userId: user.id,
        email: user.email,
        name: user.name,
      );
      notifyListeners();
    } catch (e, stackTrace) {
      _logger.error('AuthProvider: Error refreshing user', e, stackTrace);
    }
  }

  // Logout
  Future<void> logout() async {
    _logger.logAuthEvent('User logging out');
    await _authService.clearAll();
    _user = null;
    _error = null;
    _setState(AuthState.unauthenticated);
  }

  void _setState(AuthState state) {
    _state = state;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}

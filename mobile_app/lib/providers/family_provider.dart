import 'package:flutter/material.dart';
import '../models/family.dart';
import '../services/api_service.dart';

class FamilyProvider with ChangeNotifier {
  final ApiService _apiService;

  Family? _family;
  bool _isLoading = false;
  String? _error;

  FamilyProvider(this._apiService);

  Family? get family => _family;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasFamily => _family != null;
  int get memberCount => _family?.memberCount ?? 0;

  // Load family data
  Future<void> loadFamily() async {
    _setLoading(true);
    _error = null;

    try {
      final family = await _apiService.getMyFamily();
      _family = family;
      _setLoading(false);
    } catch (e) {
      // User might not have a family yet, which is not an error
      if (e.toString().contains('404')) {
        _family = null;
        _error = null;
      } else {
        _error = e.toString();
      }
      _setLoading(false);
    }
  }

  // Create family
  Future<bool> createFamily(String name) async {
    _setLoading(true);
    _error = null;

    try {
      final family = await _apiService.createFamily(name);
      _family = family;
      _setLoading(false);
      await loadFamily(); // Reload to get members
      return true;
    } catch (e) {
      _error = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Update family name
  Future<bool> updateFamilyName(String name) async {
    _setLoading(true);
    _error = null;

    try {
      final family = await _apiService.updateFamilyName(name);
      _family = family;
      _setLoading(false);
      await loadFamily(); // Reload to get full data
      return true;
    } catch (e) {
      _error = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Invite user
  Future<bool> inviteUser(String email) async {
    _setLoading(true);
    _error = null;

    try {
      await _apiService.inviteUserToFamily(email);
      _setLoading(false);
      await loadFamily(); // Reload to see new member
      return true;
    } catch (e) {
      _error = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Leave family
  Future<bool> leaveFamily() async {
    _setLoading(true);
    _error = null;

    try {
      await _apiService.leaveFamily();
      _family = null;
      _setLoading(false);
      return true;
    } catch (e) {
      _error = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Clear family data
  void clearFamily() {
    _family = null;
    _error = null;
    notifyListeners();
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}

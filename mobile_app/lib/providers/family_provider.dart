import 'package:flutter/material.dart';
import '../models/family.dart';
import '../services/api_service.dart';
import '../services/logger_service.dart';

class FamilyProvider with ChangeNotifier {
  final ApiService _apiService;
  final LoggerService _logger = LoggerService();

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
    _logger.info('FamilyProvider: Loading family data');

    try {
      final family = await _apiService.getMyFamily();
      _family = family;
      _logger.info('FamilyProvider: Family loaded - ${family.name}');
      _setLoading(false);
    } catch (e, stackTrace) {
      // User might not have a family yet, which is not an error
      if (e.toString().contains('404')) {
        _logger.info('FamilyProvider: No family found for user');
        _family = null;
        _error = null;
      } else {
        _logger.error('FamilyProvider: Error loading family', e, stackTrace);
        _error = e.toString();
      }
      _setLoading(false);
    }
  }

  // Create family
  Future<bool> createFamily(String name) async {
    _setLoading(true);
    _error = null;
    _logger.info('FamilyProvider: Creating family - $name');

    try {
      final family = await _apiService.createFamily(name);
      _family = family;
      _logger.info('FamilyProvider: Family created successfully');
      _setLoading(false);
      await loadFamily(); // Reload to get members
      return true;
    } catch (e, stackTrace) {
      _logger.error('FamilyProvider: Error creating family', e, stackTrace);
      _error = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Update family name
  Future<bool> updateFamilyName(String name) async {
    _setLoading(true);
    _error = null;
    _logger.info('FamilyProvider: Updating family name to $name');

    try {
      final family = await _apiService.updateFamilyName(name);
      _family = family;
      _logger.info('FamilyProvider: Family name updated');
      _setLoading(false);
      await loadFamily(); // Reload to get full data
      return true;
    } catch (e, stackTrace) {
      _logger.error('FamilyProvider: Error updating family name', e, stackTrace);
      _error = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Invite user
  Future<bool> inviteUser(String email) async {
    _setLoading(true);
    _error = null;
    _logger.info('FamilyProvider: Inviting user - $email');

    try {
      await _apiService.inviteUserToFamily(email);
      _logger.info('FamilyProvider: User invited successfully');
      _setLoading(false);
      await loadFamily(); // Reload to see new member
      return true;
    } catch (e, stackTrace) {
      _logger.error('FamilyProvider: Error inviting user', e, stackTrace);
      _error = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Leave family
  Future<bool> leaveFamily() async {
    _setLoading(true);
    _error = null;
    _logger.info('FamilyProvider: Leaving family');

    try {
      await _apiService.leaveFamily();
      _family = null;
      _logger.info('FamilyProvider: Left family successfully');
      _setLoading(false);
      return true;
    } catch (e, stackTrace) {
      _logger.error('FamilyProvider: Error leaving family', e, stackTrace);
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

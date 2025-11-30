import 'dart:async';
import 'package:flutter/material.dart';
import '../models/message.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';

class MessageProvider with ChangeNotifier {
  final ApiService _apiService;
  final WebSocketService _webSocketService;

  List<Message> _messages = [];
  MessagePagination? _pagination;
  bool _isLoading = false;
  bool _isSending = false;
  String? _error;
  StreamSubscription<Map<String, dynamic>>? _wsSubscription;

  MessageProvider(this._apiService, this._webSocketService) {
    _listenToWebSocket();
  }

  List<Message> get messages => _messages;
  MessagePagination? get pagination => _pagination;
  bool get isLoading => _isLoading;
  bool get isSending => _isSending;
  String? get error => _error;
  bool get hasMessages => _messages.isNotEmpty;
  bool get hasMore => _pagination?.hasMore ?? false;

  // Listen to WebSocket for real-time messages
  void _listenToWebSocket() {
    _wsSubscription?.cancel();
    _wsSubscription = _webSocketService.messages.listen((data) {
      if (data['type'] == 'message') {
        _handleNewMessage(data['data']);
      }
    });
  }

  void _handleNewMessage(Map<String, dynamic> data) {
    try {
      final message = Message.fromJson(data);

      // Check if message already exists
      final exists = _messages.any((m) => m.id == message.id);
      if (!exists) {
        _messages.insert(0, message); // Add to beginning (newest first)

        // Update pagination
        if (_pagination != null) {
          _pagination = MessagePagination(
            limit: _pagination!.limit,
            offset: _pagination!.offset,
            total: _pagination!.total + 1,
          );
        }

        notifyListeners();
      }
    } catch (e) {
      print('Error handling new message: $e');
    }
  }

  // Load messages
  Future<void> loadMessages({bool refresh = false}) async {
    if (refresh) {
      _messages = [];
      _pagination = null;
    }

    _setLoading(true);
    _error = null;

    try {
      final result = await _apiService.getMessages(limit: 100, offset: 0);
      _messages = result['messages'] as List<Message>;
      _pagination = result['pagination'] as MessagePagination;
      _setLoading(false);
    } catch (e) {
      _error = e.toString();
      _setLoading(false);
    }
  }

  // Load more messages (pagination)
  Future<void> loadMoreMessages() async {
    if (_isLoading || !hasMore) {
      return;
    }

    _setLoading(true);
    _error = null;

    try {
      final offset = _messages.length;
      final result = await _apiService.getMessages(
        limit: 100,
        offset: offset,
      );

      final newMessages = result['messages'] as List<Message>;
      _messages.addAll(newMessages);
      _pagination = result['pagination'] as MessagePagination;
      _setLoading(false);
    } catch (e) {
      _error = e.toString();
      _setLoading(false);
    }
  }

  // Send message
  Future<bool> sendMessage(String messageText) async {
    if (messageText.trim().isEmpty) {
      return false;
    }

    _isSending = true;
    _error = null;
    notifyListeners();

    try {
      final message = await _apiService.sendMessage(messageText.trim());

      // Add message to the beginning if not already there
      final exists = _messages.any((m) => m.id == message.id);
      if (!exists) {
        _messages.insert(0, message);

        // Update pagination
        if (_pagination != null) {
          _pagination = MessagePagination(
            limit: _pagination!.limit,
            offset: _pagination!.offset,
            total: _pagination!.total + 1,
          );
        }
      }

      _isSending = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isSending = false;
      notifyListeners();
      return false;
    }
  }

  // Delete message
  Future<bool> deleteMessage(int messageId) async {
    _error = null;

    try {
      await _apiService.deleteMessage(messageId);
      _messages.removeWhere((m) => m.id == messageId);

      // Update pagination
      if (_pagination != null) {
        _pagination = MessagePagination(
          limit: _pagination!.limit,
          offset: _pagination!.offset,
          total: _pagination!.total - 1,
        );
      }

      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Get message by ID
  Message? getMessageById(int messageId) {
    try {
      return _messages.firstWhere((m) => m.id == messageId);
    } catch (e) {
      return null;
    }
  }

  // Get messages by user
  List<Message> getMessagesByUser(int userId) {
    return _messages.where((m) => m.userId == userId).toList();
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearMessages() {
    _messages = [];
    _pagination = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

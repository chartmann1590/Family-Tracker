import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/api_config.dart';
import 'auth_service.dart';

enum WebSocketStatus {
  disconnected,
  connecting,
  connected,
  error,
}

class WebSocketService {
  final AuthService _authService;
  WebSocketChannel? _channel;
  StreamController<Map<String, dynamic>>? _messageController;
  StreamController<WebSocketStatus>? _statusController;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  int _reconnectAttempts = 0;
  bool _isDisposed = false;
  bool _manualDisconnect = false;

  static const int _maxReconnectAttempts = 5;
  static const Duration _initialReconnectDelay = Duration(seconds: 1);
  static const Duration _heartbeatInterval = Duration(seconds: 30);

  WebSocketService(this._authService) {
    _messageController = StreamController<Map<String, dynamic>>.broadcast();
    _statusController = StreamController<WebSocketStatus>.broadcast();
  }

  Stream<Map<String, dynamic>> get messages => _messageController!.stream;
  Stream<WebSocketStatus> get status => _statusController!.stream;

  WebSocketStatus _currentStatus = WebSocketStatus.disconnected;
  WebSocketStatus get currentStatus => _currentStatus;

  void _updateStatus(WebSocketStatus status) {
    _currentStatus = status;
    if (!_statusController!.isClosed) {
      _statusController!.add(status);
    }
  }

  // Connect to WebSocket
  Future<void> connect() async {
    if (_isDisposed) {
      return;
    }

    if (_currentStatus == WebSocketStatus.connected ||
        _currentStatus == WebSocketStatus.connecting) {
      return;
    }

    _manualDisconnect = false;
    await _doConnect();
  }

  Future<void> _doConnect() async {
    try {
      _updateStatus(WebSocketStatus.connecting);

      final token = await _authService.getToken();
      if (token == null || token.isEmpty) {
        _updateStatus(WebSocketStatus.error);
        throw Exception('No authentication token available');
      }

      final wsUrl = '${ApiConfig.wsUrl}?token=$token';
      print('Connecting to WebSocket: $wsUrl');

      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      // Listen to the WebSocket stream
      _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: false,
      );

      _updateStatus(WebSocketStatus.connected);
      _reconnectAttempts = 0;
      _startHeartbeat();

      print('WebSocket connected successfully');
    } catch (e) {
      print('WebSocket connection error: $e');
      _updateStatus(WebSocketStatus.error);
      _scheduleReconnect();
    }
  }

  void _onMessage(dynamic message) {
    try {
      final data = json.decode(message as String) as Map<String, dynamic>;
      print('WebSocket message received: ${data['type']}');

      if (!_messageController!.isClosed) {
        _messageController!.add(data);
      }

      // Reset reconnect attempts on successful message
      _reconnectAttempts = 0;
    } catch (e) {
      print('Error parsing WebSocket message: $e');
    }
  }

  void _onError(dynamic error) {
    print('WebSocket error: $error');
    _updateStatus(WebSocketStatus.error);
    _scheduleReconnect();
  }

  void _onDone() {
    print('WebSocket connection closed');
    _stopHeartbeat();
    _updateStatus(WebSocketStatus.disconnected);

    if (!_manualDisconnect && !_isDisposed) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_manualDisconnect || _isDisposed) {
      return;
    }

    if (_reconnectAttempts >= _maxReconnectAttempts) {
      print('Max reconnection attempts reached');
      _updateStatus(WebSocketStatus.error);
      return;
    }

    _reconnectAttempts++;
    final delay = _initialReconnectDelay * _reconnectAttempts;

    print('Scheduling reconnection attempt $_reconnectAttempts in ${delay.inSeconds}s');

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () {
      if (!_isDisposed && !_manualDisconnect) {
        _doConnect();
      }
    });
  }

  void _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (timer) {
      if (_currentStatus == WebSocketStatus.connected) {
        try {
          _channel?.sink.add(json.encode({'type': 'ping'}));
        } catch (e) {
          print('Error sending heartbeat: $e');
        }
      }
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  // Disconnect from WebSocket
  Future<void> disconnect() async {
    _manualDisconnect = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _stopHeartbeat();

    await _channel?.sink.close();
    _channel = null;

    _updateStatus(WebSocketStatus.disconnected);
    print('WebSocket disconnected manually');
  }

  // Send a message through WebSocket
  void send(Map<String, dynamic> data) {
    if (_currentStatus == WebSocketStatus.connected && _channel != null) {
      try {
        _channel!.sink.add(json.encode(data));
      } catch (e) {
        print('Error sending WebSocket message: $e');
      }
    }
  }

  // Check if connected
  bool get isConnected => _currentStatus == WebSocketStatus.connected;

  // Dispose
  Future<void> dispose() async {
    _isDisposed = true;
    _manualDisconnect = true;

    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _stopHeartbeat();

    await _channel?.sink.close();
    _channel = null;

    await _messageController?.close();
    _messageController = null;

    await _statusController?.close();
    _statusController = null;

    print('WebSocket service disposed');
  }
}

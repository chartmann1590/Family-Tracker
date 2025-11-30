import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/api_config.dart';
import 'auth_service.dart';
import 'server_config_service.dart';
import 'logger_service.dart';

enum WebSocketStatus {
  disconnected,
  connecting,
  connected,
  error,
}

class WebSocketService {
  final AuthService _authService;
  final ServerConfigService _serverConfigService = ServerConfigService();
  final LoggerService _logger = LoggerService();

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
      _logger.info('WebSocket: Attempting to connect...');

      final token = await _authService.getToken();
      if (token == null || token.isEmpty) {
        _updateStatus(WebSocketStatus.error);
        _logger.error('WebSocket: No authentication token available');
        throw Exception('No authentication token available');
      }

      final wsUrl = await _serverConfigService.getWebSocketUrl();
      final fullUrl = '$wsUrl?token=$token';
      _logger.info('WebSocket: Connecting to $wsUrl');

      _channel = WebSocketChannel.connect(Uri.parse(fullUrl));

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

      _logger.info('WebSocket: Connected successfully');
    } catch (e, stackTrace) {
      _logger.error('WebSocket: Connection error', e, stackTrace);
      _updateStatus(WebSocketStatus.error);
      _scheduleReconnect();
    }
  }

  void _onMessage(dynamic message) {
    try {
      final data = json.decode(message as String) as Map<String, dynamic>;
      _logger.debug('WebSocket: Message received - ${data['type']}');

      if (!_messageController!.isClosed) {
        _messageController!.add(data);
      }

      // Reset reconnect attempts on successful message
      _reconnectAttempts = 0;
    } catch (e, stackTrace) {
      _logger.error('WebSocket: Error parsing message', e, stackTrace);
    }
  }

  void _onError(dynamic error) {
    _logger.error('WebSocket: Connection error', error);
    _updateStatus(WebSocketStatus.error);
    _scheduleReconnect();
  }

  void _onDone() {
    _logger.info('WebSocket: Connection closed');
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
      _logger.warning('WebSocket: Max reconnection attempts reached');
      _updateStatus(WebSocketStatus.error);
      return;
    }

    _reconnectAttempts++;
    final delay = _initialReconnectDelay * _reconnectAttempts;

    _logger.info('WebSocket: Scheduling reconnection attempt $_reconnectAttempts in ${delay.inSeconds}s');

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
          _logger.debug('WebSocket: Heartbeat sent');
        } catch (e, stackTrace) {
          _logger.error('WebSocket: Error sending heartbeat', e, stackTrace);
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
    _logger.info('WebSocket: Disconnected manually');
  }

  // Send a message through WebSocket
  void send(Map<String, dynamic> data) {
    if (_currentStatus == WebSocketStatus.connected && _channel != null) {
      try {
        _channel!.sink.add(json.encode(data));
        _logger.debug('WebSocket: Message sent - ${data['type']}');
      } catch (e, stackTrace) {
        _logger.error('WebSocket: Error sending message', e, stackTrace);
      }
    } else {
      _logger.warning('WebSocket: Attempted to send message while not connected');
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

    _logger.info('WebSocket: Service disposed');
  }
}

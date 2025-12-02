import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'logger_service.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();
  final LoggerService _logger = LoggerService();

  bool _initialized = false;
  bool get isInitialized => _initialized;

  // Android notification channel for messages
  static const AndroidNotificationChannel _messageChannel =
      AndroidNotificationChannel(
    'family_tracker_messages', // id
    'Family Messages', // name
    description: 'Notifications for family messages',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
  );

  // Android notification channel for background tracking
  static const AndroidNotificationChannel _trackingChannel =
      AndroidNotificationChannel(
    'family_tracker_location', // id
    'Background Location Tracking', // name
    description: 'Persistent notification while location tracking is active',
    importance: Importance.low, // Low importance for persistent notifications
    playSound: false,
    enableVibration: false,
    showBadge: false,
  );

  // Notification ID for persistent tracking notification
  static const int _trackingNotificationId = 999999;

  // Initialize the notification service
  Future<bool> initialize() async {
    if (_initialized) {
      _logger.info('NotificationService: Already initialized');
      return true;
    }

    try {
      _logger.info('NotificationService: Initializing...');

      // Android initialization settings
      const AndroidInitializationSettings androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');

      // iOS initialization settings
      const DarwinInitializationSettings iosSettings =
          DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      // Combined initialization settings
      const InitializationSettings initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      // Initialize the plugin
      final bool? result = await _notificationsPlugin.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );

      if (result != true) {
        _logger.warning('NotificationService: Initialization returned false');
        return false;
      }

      // Create notification channels for Android
      final androidImplementation = _notificationsPlugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();

      await androidImplementation?.createNotificationChannel(_messageChannel);
      await androidImplementation?.createNotificationChannel(_trackingChannel);

      // Request permissions
      await requestPermissions();

      _initialized = true;
      _logger.info('NotificationService: Initialized successfully');
      return true;
    } catch (e, stackTrace) {
      _logger.error('NotificationService: Initialization failed', e, stackTrace);
      return false;
    }
  }

  // Handle notification tap
  void _onNotificationTapped(NotificationResponse response) {
    _logger.info(
        'NotificationService: Notification tapped - ${response.payload}');
    // TODO: Navigate to messages screen when notification is tapped
    // This would require a navigator key or a navigation callback
  }

  // Request notification permissions
  Future<bool> requestPermissions() async {
    try {
      _logger.info('NotificationService: Requesting permissions...');

      // For Android 13+ (API level 33+), request notification permission
      if (defaultTargetPlatform == TargetPlatform.android) {
        final status = await Permission.notification.request();
        _logger.info('NotificationService: Permission status - $status');

        if (status.isDenied || status.isPermanentlyDenied) {
          _logger.warning('NotificationService: Notification permission denied');
          return false;
        }

        return status.isGranted;
      }

      // For iOS, permissions are requested during initialization
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        final bool? result = await _notificationsPlugin
            .resolvePlatformSpecificImplementation<
                IOSFlutterLocalNotificationsPlugin>()
            ?.requestPermissions(
              alert: true,
              badge: true,
              sound: true,
            );

        _logger.info('NotificationService: iOS permission result - $result');
        return result ?? false;
      }

      return true;
    } catch (e, stackTrace) {
      _logger.error(
          'NotificationService: Error requesting permissions', e, stackTrace);
      return false;
    }
  }

  // Check if notifications are enabled
  Future<bool> areNotificationsEnabled() async {
    try {
      if (defaultTargetPlatform == TargetPlatform.android) {
        final status = await Permission.notification.status;
        return status.isGranted;
      }

      if (defaultTargetPlatform == TargetPlatform.iOS) {
        final bool? result = await _notificationsPlugin
            .resolvePlatformSpecificImplementation<
                IOSFlutterLocalNotificationsPlugin>()
            ?.requestPermissions(
              alert: true,
              badge: true,
              sound: true,
            );
        return result ?? false;
      }

      return true;
    } catch (e, stackTrace) {
      _logger.error(
          'NotificationService: Error checking notification status',
          e,
          stackTrace);
      return false;
    }
  }

  // Show a new message notification
  Future<void> showMessageNotification({
    required int messageId,
    required String userName,
    required String message,
    String? userEmail,
  }) async {
    if (!_initialized) {
      _logger.warning(
          'NotificationService: Cannot show notification - not initialized');
      return;
    }

    try {
      _logger.info('NotificationService: Showing notification for message $messageId');

      // Truncate long messages
      final String displayMessage =
          message.length > 100 ? '${message.substring(0, 100)}...' : message;

      // Android notification details
      final AndroidNotificationDetails androidDetails =
          AndroidNotificationDetails(
        _messageChannel.id,
        _messageChannel.name,
        channelDescription: _messageChannel.description,
        importance: Importance.high,
        priority: Priority.high,
        showWhen: true,
        styleInformation: BigTextStyleInformation(
          displayMessage,
          contentTitle: userName,
          summaryText: 'Family Tracker',
        ),
        icon: '@mipmap/ic_launcher',
      );

      // iOS notification details
      const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      // Combined notification details
      final NotificationDetails notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      // Show the notification
      await _notificationsPlugin.show(
        messageId, // Use message ID as notification ID
        userName, // Title
        displayMessage, // Body
        notificationDetails,
        payload: 'message_$messageId', // Payload for handling taps
      );

      _logger.info('NotificationService: Notification shown successfully');
    } catch (e, stackTrace) {
      _logger.error(
          'NotificationService: Error showing notification', e, stackTrace);
    }
  }

  // Cancel a specific notification
  Future<void> cancelNotification(int id) async {
    try {
      await _notificationsPlugin.cancel(id);
      _logger.info('NotificationService: Cancelled notification $id');
    } catch (e, stackTrace) {
      _logger.error(
          'NotificationService: Error cancelling notification', e, stackTrace);
    }
  }

  // Cancel all notifications
  Future<void> cancelAllNotifications() async {
    try {
      await _notificationsPlugin.cancelAll();
      _logger.info('NotificationService: Cancelled all notifications');
    } catch (e, stackTrace) {
      _logger.error('NotificationService: Error cancelling all notifications',
          e, stackTrace);
    }
  }

  // Get pending notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    try {
      final notifications =
          await _notificationsPlugin.pendingNotificationRequests();
      _logger.info(
          'NotificationService: Found ${notifications.length} pending notifications');
      return notifications;
    } catch (e, stackTrace) {
      _logger.error('NotificationService: Error getting pending notifications',
          e, stackTrace);
      return [];
    }
  }

  // Show persistent notification for background tracking
  Future<void> showTrackingNotification() async {
    if (!_initialized) {
      _logger.warning(
          'NotificationService: Cannot show tracking notification - not initialized');
      return;
    }

    try {
      _logger.info('NotificationService: Showing persistent tracking notification');

      // Android notification details
      final AndroidNotificationDetails androidDetails =
          AndroidNotificationDetails(
        _trackingChannel.id,
        _trackingChannel.name,
        channelDescription: _trackingChannel.description,
        importance: Importance.low,
        priority: Priority.low,
        ongoing: true, // Makes it persistent
        autoCancel: false, // Prevents dismissing by swiping
        showWhen: false,
        icon: '@mipmap/ic_launcher',
        styleInformation: const BigTextStyleInformation(
          'Family Tracker is tracking your location in the background. Updates sent every 15 minutes.',
          contentTitle: 'Location Tracking Active',
        ),
      );

      // iOS notification details
      const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
        presentAlert: false, // Don't show alert for persistent notification
        presentBadge: false,
        presentSound: false,
      );

      // Combined notification details
      final NotificationDetails notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      // Show the notification
      await _notificationsPlugin.show(
        _trackingNotificationId,
        'Location Tracking Active',
        'Updating every 15 minutes',
        notificationDetails,
      );

      _logger.info('NotificationService: Tracking notification shown successfully');
    } catch (e, stackTrace) {
      _logger.error(
          'NotificationService: Error showing tracking notification', e, stackTrace);
    }
  }

  // Hide persistent tracking notification
  Future<void> hideTrackingNotification() async {
    try {
      await _notificationsPlugin.cancel(_trackingNotificationId);
      _logger.info('NotificationService: Tracking notification hidden');
    } catch (e, stackTrace) {
      _logger.error(
          'NotificationService: Error hiding tracking notification', e, stackTrace);
    }
  }

  // Dispose (if needed)
  Future<void> dispose() async {
    _logger.info('NotificationService: Disposing...');
    // Clean up if necessary
  }
}

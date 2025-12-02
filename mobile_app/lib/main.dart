import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'services/api_service.dart';
import 'services/location_service.dart';
import 'services/websocket_service.dart';
import 'services/server_config_service.dart';
import 'services/logger_service.dart';
import 'services/notification_service.dart';
import 'services/background_location_service.dart';
import 'providers/auth_provider.dart';
import 'providers/family_provider.dart';
import 'providers/location_provider.dart';
import 'providers/message_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/server_config_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final logger = LoggerService();

  // Set up error handlers
  FlutterError.onError = (FlutterErrorDetails details) {
    logger.fatal(
      'Flutter Error: ${details.exceptionAsString()}',
      details.exception,
      details.stack,
    );
    FlutterError.presentError(details);
  };

  // Initialize notification service
  final notificationService = NotificationService();
  await notificationService.initialize();

  // Initialize background location service
  await BackgroundLocationService.initialize();

  runApp(const FamilyTrackerApp());
}

class FamilyTrackerApp extends StatelessWidget {
  const FamilyTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Services
        Provider<AuthService>(
          create: (_) => AuthService(),
        ),
        Provider<NotificationService>(
          create: (_) => NotificationService(),
        ),
        ProxyProvider<AuthService, ApiService>(
          update: (_, authService, __) => ApiService(authService),
        ),
        ProxyProvider<ApiService, LocationService>(
          update: (_, apiService, __) => LocationService(apiService),
        ),
        ProxyProvider<AuthService, WebSocketService>(
          update: (_, authService, __) => WebSocketService(authService),
        ),

        // Providers
        ChangeNotifierProxyProvider2<ApiService, AuthService, AuthProvider>(
          create: (context) => AuthProvider(
            context.read<ApiService>(),
            context.read<AuthService>(),
          ),
          update: (_, apiService, authService, previous) =>
              previous ?? AuthProvider(apiService, authService),
        ),
        ChangeNotifierProxyProvider<ApiService, FamilyProvider>(
          create: (context) => FamilyProvider(context.read<ApiService>()),
          update: (_, apiService, previous) =>
              previous ?? FamilyProvider(apiService),
        ),
        ChangeNotifierProxyProvider3<ApiService, LocationService,
            WebSocketService, LocationProvider>(
          create: (context) => LocationProvider(
            context.read<ApiService>(),
            context.read<LocationService>(),
            context.read<WebSocketService>(),
          ),
          update: (_, apiService, locationService, wsService, previous) =>
              previous ??
              LocationProvider(apiService, locationService, wsService),
        ),
        ChangeNotifierProxyProvider3<ApiService, WebSocketService,
            NotificationService, MessageProvider>(
          create: (context) => MessageProvider(
            context.read<ApiService>(),
            context.read<WebSocketService>(),
            context.read<NotificationService>(),
          ),
          update: (_, apiService, wsService, notificationService, previous) =>
              previous ??
              MessageProvider(apiService, wsService, notificationService),
        ),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp(
            title: 'Family Tracker',
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              useMaterial3: true,
              colorScheme: ColorScheme.fromSeed(
                seedColor: const Color(0xFF6366F1), // Indigo
                brightness: Brightness.light,
              ),
              appBarTheme: const AppBarTheme(
                centerTitle: true,
                elevation: 0,
              ),
              cardTheme: const CardThemeData(
                elevation: 2,
              ),
              inputDecorationTheme: InputDecorationTheme(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
              ),
            ),
            home: const AppInitializer(),
          );
        },
      ),
    );
  }
}

class AppInitializer extends StatefulWidget {
  const AppInitializer({super.key});

  @override
  State<AppInitializer> createState() => _AppInitializerState();
}

class _AppInitializerState extends State<AppInitializer> with WidgetsBindingObserver {
  final _serverConfigService = ServerConfigService();
  final _logger = LoggerService();
  bool _isChecking = true;
  bool _isConfigured = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkServerConfig();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Re-check configuration when app resumes
    if (state == AppLifecycleState.resumed && !_isConfigured) {
      _checkServerConfig();
    }
  }

  Future<void> _checkServerConfig() async {
    try {
      _logger.info('AppInitializer: Checking server configuration...');
      final isConfigured = await _serverConfigService.isConfigured();
      _logger.info('AppInitializer: Server configured status: $isConfigured');

      if (isConfigured) {
        final serverUrl = await _serverConfigService.getServerUrl();
        _logger.info('AppInitializer: Server URL: $serverUrl');
      }

      if (mounted) {
        setState(() {
          _isConfigured = isConfigured;
          _isChecking = false;
        });
      }
    } catch (e) {
      _logger.error('AppInitializer: Error checking server configuration', e);
      if (mounted) {
        setState(() {
          _isConfigured = false;
          _isChecking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.family_restroom,
                size: 100,
                color: Color(0xFF6366F1),
              ),
              SizedBox(height: 24),
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Initializing...'),
            ],
          ),
        ),
      );
    }

    if (!_isConfigured) {
      // Use a callback to re-check when configuration is saved
      return ServerConfigScreenWrapper(onConfigured: _checkServerConfig);
    }

    return const AuthWrapper();
  }
}

// Wrapper to handle configuration completion callback
class ServerConfigScreenWrapper extends StatelessWidget {
  final VoidCallback onConfigured;

  const ServerConfigScreenWrapper({super.key, required this.onConfigured});

  @override
  Widget build(BuildContext context) {
    return ServerConfigScreen(onConfigured: onConfigured);
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  final _logger = LoggerService();
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    try {
      _logger.info('AuthWrapper: Checking authentication...');
      await context.read<AuthProvider>().checkAuthentication();
    } catch (e, stackTrace) {
      _logger.error('AuthWrapper: Error during auth check', e, stackTrace);
    } finally {
      if (mounted) {
        setState(() {
          _initialized = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.family_restroom,
                size: 100,
                color: Color(0xFF6366F1),
              ),
              SizedBox(height: 24),
              CircularProgressIndicator(),
            ],
          ),
        ),
      );
    }

    final authProvider = context.watch<AuthProvider>();

    if (authProvider.state == AuthState.authenticated) {
      return const HomeScreen();
    } else {
      return const LoginScreen();
    }
  }
}

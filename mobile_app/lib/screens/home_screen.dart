import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/family_provider.dart';
import '../providers/location_provider.dart';
import '../providers/message_provider.dart';
import '../services/websocket_service.dart';
import '../services/logger_service.dart';
import 'map_screen.dart';
import 'family_screen.dart';
import 'messages_screen.dart';
import 'settings_screen.dart';
import 'package:package_info_plus/package_info_plus.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  bool _initialized = false;
  final _logger = LoggerService();

  final List<Widget> _screens = const [
    MapScreen(),
    FamilyScreen(),
    MessagesScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _logger.logScreenView('HomeScreen');
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    if (_initialized) return;

    final familyProvider = context.read<FamilyProvider>();
    final locationProvider = context.read<LocationProvider>();
    final messageProvider = context.read<MessageProvider>();
    final wsService = context.read<WebSocketService>();

    // Connect to WebSocket
    await wsService.connect();

    // Load family data
    await familyProvider.loadFamily();

    // Load initial data if user has a family
    if (familyProvider.hasFamily) {
      await Future.wait([
        locationProvider.loadFamilyLocations(),
        messageProvider.loadMessages(),
      ]);

      // Start location tracking
      await locationProvider.startTracking();
    }

    _initialized = true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Family Tracker'),
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () {
              _logger.logTap('HomeScreen', 'MenuButton');
              Scaffold.of(context).openDrawer();
            },
          ),
        ),
        actions: [
          // WebSocket status indicator
          Consumer<WebSocketService>(
            builder: (context, wsService, _) {
              final status = wsService.currentStatus;
              Color statusColor;
              IconData statusIcon;

              switch (status) {
                case WebSocketStatus.connected:
                  statusColor = Colors.green;
                  statusIcon = Icons.wifi;
                  break;
                case WebSocketStatus.connecting:
                  statusColor = Colors.orange;
                  statusIcon = Icons.wifi;
                  break;
                case WebSocketStatus.error:
                case WebSocketStatus.disconnected:
                  statusColor = Colors.red;
                  statusIcon = Icons.wifi_off;
                  break;
              }

              return IconButton(
                icon: Icon(statusIcon, color: statusColor),
                onPressed: () {
                  final message = status == WebSocketStatus.connected
                      ? 'Connected to server'
                      : status == WebSocketStatus.connecting
                          ? 'Connecting to server...'
                          : 'Disconnected from server';

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(message),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
      drawer: _buildDrawer(context),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map),
            label: 'Map',
          ),
          NavigationDestination(
            icon: Icon(Icons.family_restroom_outlined),
            selectedIcon: Icon(Icons.family_restroom),
            label: 'Family',
          ),
          NavigationDestination(
            icon: Icon(Icons.message_outlined),
            selectedIcon: Icon(Icons.message),
            label: 'Messages',
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    final theme = Theme.of(context);
    final authProvider = context.watch<AuthProvider>();

    return Drawer(
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
            ),
            accountName: Text(
              authProvider.user?.name ?? 'User',
              style: TextStyle(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.bold,
              ),
            ),
            accountEmail: Text(
              authProvider.user?.email ?? '',
              style: TextStyle(
                color: theme.colorScheme.onPrimaryContainer,
              ),
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: theme.colorScheme.primary,
              child: Text(
                (authProvider.user?.name ?? 'U')[0].toUpperCase(),
                style: TextStyle(
                  fontSize: 32,
                  color: theme.colorScheme.onPrimary,
                ),
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Settings'),
            onTap: () {
              _logger.logTap('HomeScreen', 'SettingsMenuItem');
              Navigator.pop(context); // Close drawer
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const SettingsScreen(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.info),
            title: const Text('About'),
            onTap: () async {
              _logger.logTap('HomeScreen', 'AboutMenuItem');
              Navigator.pop(context); // Close drawer

              final packageInfo = await PackageInfo.fromPlatform();

              if (context.mounted) {
                showAboutDialog(
                  context: context,
                  applicationName: 'Family Tracker',
                  applicationVersion: '${packageInfo.version} (${packageInfo.buildNumber})',
                  applicationIcon: Icon(
                    Icons.family_restroom,
                    size: 64,
                    color: theme.colorScheme.primary,
                  ),
                  applicationLegalese: '© 2024 Family Tracker\nReal-time family location tracking and messaging',
                );
              }
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Logout', style: TextStyle(color: Colors.red)),
            onTap: () async {
              _logger.logTap('HomeScreen', 'LogoutMenuItem');
              Navigator.pop(context); // Close drawer

              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Logout'),
                  content: const Text('Are you sure you want to logout?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel'),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.red,
                      ),
                      child: const Text('Logout'),
                    ),
                  ],
                ),
              );

              if (confirm == true && mounted) {
                _logger.logAuthEvent('User logged out');

                // Stop location tracking
                await context.read<LocationProvider>().stopTracking();

                // Disconnect WebSocket
                await context.read<WebSocketService>().disconnect();

                // Clear provider data
                context.read<FamilyProvider>().clearFamily();
                context.read<LocationProvider>().clearLocations();
                context.read<MessageProvider>().clearMessages();

                // Logout
                await context.read<AuthProvider>().logout();
              }
            },
          ),
        ],
      ),
    );
  }
}

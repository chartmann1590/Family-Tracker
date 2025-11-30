import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../services/server_config_service.dart';
import '../services/logger_service.dart';
import 'log_viewer_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _serverConfigService = ServerConfigService();
  final _logger = LoggerService();

  String? _serverUrl;
  String _appVersion = 'Loading...';
  String _buildNumber = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _logger.logScreenView('SettingsScreen');
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final serverUrl = await _serverConfigService.getServerUrl();
      final packageInfo = await PackageInfo.fromPlatform();

      setState(() {
        _serverUrl = serverUrl;
        _appVersion = packageInfo.version;
        _buildNumber = packageInfo.buildNumber;
        _isLoading = false;
      });
    } catch (e) {
      _logger.error('Error loading settings', e);
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _changeServer() async {
    _logger.logTap('SettingsScreen', 'ChangeServerButton');

    final controller = TextEditingController(text: _serverUrl);

    final result = await showDialog<String>(
      context: context,
      builder: (context) => _ChangeServerDialog(controller: controller),
    );

    if (result != null && mounted) {
      setState(() {
        _isLoading = true;
      });

      try {
        await _serverConfigService.saveServerUrl(result);
        _logger.info('Server URL changed to: $result');

        if (mounted) {
          setState(() {
            _serverUrl = result;
            _isLoading = false;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Server URL updated successfully'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        _logger.error('Error changing server URL', e);
        if (mounted) {
          setState(() {
            _isLoading = false;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to update server URL: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _viewLogs() async {
    _logger.logTap('SettingsScreen', 'ViewLogsButton');

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const LogViewerScreen(),
      ),
    );
  }

  Future<void> _emailLogs() async {
    _logger.logTap('SettingsScreen', 'EmailLogsButton');

    try {
      final logs = await _logger.getLogsFromFile();

      final emailUri = Uri(
        scheme: 'mailto',
        path: 'support@familytracker.com',
        query: 'subject=Family Tracker Logs&body=${Uri.encodeComponent(logs)}',
      );

      if (await canLaunchUrl(emailUri)) {
        await launchUrl(emailUri);
        _logger.info('Email logs opened');
      } else {
        throw Exception('Could not open email app');
      }
    } catch (e) {
      _logger.error('Error emailing logs', e);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to open email: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _clearLogs() async {
    _logger.logTap('SettingsScreen', 'ClearLogsButton');

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Logs'),
        content: const Text('Are you sure you want to clear all logs? This action cannot be undone.'),
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
            child: const Text('Clear'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        _logger.clearLogs();
        _logger.info('Logs cleared by user');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Logs cleared successfully'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        _logger.error('Error clearing logs', e);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to clear logs: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                // Server Configuration Section
                _buildSectionHeader('Server Configuration'),
                Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.dns),
                        title: const Text('Server URL'),
                        subtitle: Text(_serverUrl ?? 'Not configured'),
                        trailing: FilledButton.tonal(
                          onPressed: _changeServer,
                          child: const Text('Change'),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Logs Section
                _buildSectionHeader('Logs'),
                Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.list_alt),
                        title: const Text('View Logs'),
                        subtitle: const Text('View application logs'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: _viewLogs,
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.email),
                        title: const Text('Email Logs'),
                        subtitle: const Text('Send logs via email'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: _emailLogs,
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: Icon(Icons.delete, color: Colors.red.shade700),
                        title: Text('Clear Logs', style: TextStyle(color: Colors.red.shade700)),
                        subtitle: const Text('Delete all log entries'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: _clearLogs,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // About Section
                _buildSectionHeader('About'),
                Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.info),
                        title: const Text('App Version'),
                        subtitle: Text(_appVersion),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.tag),
                        title: const Text('Build Number'),
                        subtitle: Text(_buildNumber),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.copyright),
                        title: const Text('Family Tracker'),
                        subtitle: const Text('Real-time family location tracking'),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),
              ],
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }
}

class _ChangeServerDialog extends StatefulWidget {
  final TextEditingController controller;

  const _ChangeServerDialog({required this.controller});

  @override
  State<_ChangeServerDialog> createState() => _ChangeServerDialogState();
}

class _ChangeServerDialogState extends State<_ChangeServerDialog> {
  final _formKey = GlobalKey<FormState>();
  final _serverConfigService = ServerConfigService();
  final _logger = LoggerService();

  bool _isLoading = false;
  bool _testSuccessful = false;
  String? _testMessage;

  Future<void> _testConnection() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _testSuccessful = false;
      _testMessage = null;
    });

    try {
      final result = await _serverConfigService.testConnection(widget.controller.text);

      setState(() {
        _testSuccessful = result.success;
        _testMessage = result.message;
        _isLoading = false;
      });
    } catch (e) {
      _logger.error('Error testing server connection', e);
      setState(() {
        _testSuccessful = false;
        _testMessage = 'Connection test failed: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Change Server'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: widget.controller,
              decoration: const InputDecoration(
                labelText: 'Server URL',
                hintText: '192.168.1.100:8081',
                prefixIcon: Icon(Icons.dns),
              ),
              keyboardType: TextInputType.url,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a server URL';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _isLoading ? null : _testConnection,
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.wifi_find),
              label: Text(_isLoading ? 'Testing...' : 'Test Connection'),
            ),
            if (_testMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _testSuccessful
                      ? Colors.green.shade50
                      : Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      _testSuccessful ? Icons.check_circle : Icons.error,
                      color: _testSuccessful
                          ? Colors.green.shade700
                          : Colors.red.shade700,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _testMessage!,
                        style: TextStyle(
                          color: _testSuccessful
                              ? Colors.green.shade900
                              : Colors.red.shade900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _testSuccessful && !_isLoading
              ? () => Navigator.pop(context, widget.controller.text)
              : null,
          child: const Text('Save'),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import '../services/server_config_service.dart';
import '../services/logger_service.dart';

class ServerConfigScreen extends StatefulWidget {
  final VoidCallback? onConfigured;

  const ServerConfigScreen({super.key, this.onConfigured});

  @override
  State<ServerConfigScreen> createState() => _ServerConfigScreenState();
}

class _ServerConfigScreenState extends State<ServerConfigScreen> {
  final _formKey = GlobalKey<FormState>();
  final _urlController = TextEditingController();
  final _serverConfigService = ServerConfigService();
  final _logger = LoggerService();

  bool _isLoading = false;
  bool _testSuccessful = false;
  String? _testMessage;

  @override
  void initState() {
    super.initState();
    _logger.logScreenView('ServerConfigScreen');
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    _logger.logTap('ServerConfigScreen', 'TestConnectionButton');
    setState(() {
      _isLoading = true;
      _testSuccessful = false;
      _testMessage = null;
    });

    try {
      final result = await _serverConfigService.testConnection(_urlController.text);

      setState(() {
        _testSuccessful = result.success;
        _testMessage = result.message;
        _isLoading = false;
      });

      if (result.success) {
        _logger.info('Server connection test successful: ${_urlController.text}');
      } else {
        _logger.warning('Server connection test failed: ${result.message}');
      }
    } catch (e) {
      _logger.error('Error testing server connection', e);
      setState(() {
        _testSuccessful = false;
        _testMessage = 'Connection test failed: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _saveAndContinue() async {
    _logger.logTap('ServerConfigScreen', 'SaveAndContinueButton');

    setState(() {
      _isLoading = true;
    });

    try {
      await _serverConfigService.saveServerUrl(_urlController.text);
      await _serverConfigService.markAsConfigured();

      _logger.info('Server configuration saved successfully');

      // Notify parent that configuration is complete
      if (widget.onConfigured != null) {
        widget.onConfigured!();
      }
    } catch (e) {
      _logger.error('Error saving server configuration', e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save configuration: $e'),
            backgroundColor: Colors.red,
          ),
        );
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),

                // Logo/Icon
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.family_restroom,
                    size: 64,
                    color: theme.colorScheme.primary,
                  ),
                ),

                const SizedBox(height: 32),

                // Title
                Text(
                  'Server Configuration',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 16),

                // Help text
                Card(
                  color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                              color: theme.colorScheme.primary,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'What to enter:',
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Enter your server URL or IP address with port number.',
                          style: theme.textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Examples:',
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '• 192.168.1.100:8081\n'
                          '• http://192.168.1.100:8081\n'
                          '• https://myfamilytracker.com',
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontFamily: 'monospace',
                            color: theme.colorScheme.secondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // Server URL input
                TextFormField(
                  controller: _urlController,
                  decoration: InputDecoration(
                    labelText: 'Server URL',
                    hintText: '192.168.1.100:8081',
                    prefixIcon: const Icon(Icons.dns),
                    helperText: 'IP address with port or full URL',
                  ),
                  keyboardType: TextInputType.url,
                  textInputAction: TextInputAction.done,
                  enabled: !_isLoading,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a server URL';
                    }
                    return null;
                  },
                  onFieldSubmitted: (_) => _testConnection(),
                ),

                const SizedBox(height: 24),

                // Test Connection button
                FilledButton.icon(
                  onPressed: _isLoading ? null : _testConnection,
                  icon: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Icon(Icons.wifi_find),
                  label: Text(_isLoading ? 'Testing...' : 'Test Connection'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),

                const SizedBox(height: 16),

                // Test result message
                if (_testMessage != null) ...[
                  Card(
                    color: _testSuccessful
                        ? Colors.green.shade50
                        : Colors.red.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          Icon(
                            _testSuccessful
                                ? Icons.check_circle
                                : Icons.error,
                            color: _testSuccessful
                                ? Colors.green.shade700
                                : Colors.red.shade700,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _testMessage!,
                              style: TextStyle(
                                color: _testSuccessful
                                    ? Colors.green.shade900
                                    : Colors.red.shade900,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Save & Continue button
                FilledButton.tonalIcon(
                  onPressed: _testSuccessful && !_isLoading
                      ? _saveAndContinue
                      : null,
                  icon: const Icon(Icons.save),
                  label: const Text('Save & Continue'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),

                const SizedBox(height: 24),

                // Additional info
                if (!_testSuccessful && _testMessage == null)
                  Center(
                    child: Text(
                      'Test the connection before continuing',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

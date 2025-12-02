import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../services/logger_service.dart';

enum LogLevel {
  all,
  debug,
  info,
  warning,
  error,
  fatal,
}

class LogEntry {
  final String timestamp;
  final String level;
  final String message;
  final String fullText;

  LogEntry({
    required this.timestamp,
    required this.level,
    required this.message,
    required this.fullText,
  });

  static LogEntry parse(String line) {
    // Parse log line format: [timestamp] [LEVEL] message
    // Example: [2024-05-20 10:30:45.123] [INFO] User logged in
    
    String timestamp = '';
    String level = 'INFO';
    String message = line;

    try {
      final timestampMatch = RegExp(r'^\[(.*?)\]').firstMatch(line);
      if (timestampMatch != null) {
        timestamp = timestampMatch.group(1) ?? '';
        
        // Remove timestamp from line to find level
        final remaining = line.substring(timestampMatch.end).trim();
        
        final levelMatch = RegExp(r'^\[(.*?)\]').firstMatch(remaining);
        if (levelMatch != null) {
          level = levelMatch.group(1) ?? 'INFO';
          // Message is everything after level
          message = remaining.substring(levelMatch.end).trim();
        } else {
          // Fallback for old format or other logs
          message = remaining;
        }
      } else {
        // Try parsing old format just in case
        // [timestamp] LEVEL: message
        final oldTimestampMatch = RegExp(r'\[(.*?)\]').firstMatch(line);
        timestamp = oldTimestampMatch?.group(1) ?? '';
        
        if (line.contains('DEBUG:') || line.contains('\u{1F41B}')) {
          level = 'DEBUG';
        } else if (line.contains('INFO:') || line.contains('\u{2139}\u{FE0F}')) {
          level = 'INFO';
        } else if (line.contains('WARNING:') || line.contains('\u{26A0}\u{FE0F}')) {
          level = 'WARNING';
        } else if (line.contains('ERROR:') || line.contains('\u{26D4}')) {
          level = 'ERROR';
        } else if (line.contains('WTF:') || line.contains('\u{1F480}')) {
          level = 'FATAL';
        }
        
        final parts = line.split(RegExp(r'(DEBUG:|INFO:|WARNING:|ERROR:|WTF:)'));
        if (parts.length > 1) {
          message = parts.last.trim();
        }
      }
    } catch (e) {
      // If parsing fails, just return the whole line as message
      message = line;
    }

    return LogEntry(
      timestamp: timestamp,
      level: level,
      message: message,
      fullText: line,
    );
  }
}

class LogViewerScreen extends StatefulWidget {
  const LogViewerScreen({super.key});

  @override
  State<LogViewerScreen> createState() => _LogViewerScreenState();
}

class _LogViewerScreenState extends State<LogViewerScreen> {
  final _logger = LoggerService();
  final _searchController = TextEditingController();

  List<LogEntry> _allLogs = [];
  List<LogEntry> _filteredLogs = [];
  LogLevel _selectedLevel = LogLevel.all;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _logger.logScreenView('LogViewerScreen');
    _logger.info('LogViewerScreen initialized - Testing logging system');
    _loadLogs();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadLogs() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final logsText = await _logger.getLogsFromFile();
      final lines = logsText.split('\n').where((line) => line.trim().isNotEmpty).toList();

      final logs = lines.map((line) => LogEntry.parse(line)).toList();

      setState(() {
        _allLogs = logs.reversed.toList(); // Newest first
        _filteredLogs = _allLogs;
        _isLoading = false;
      });

      _applyFilters();
    } catch (e) {
      _logger.error('Error loading logs', e);
      setState(() {
        _error = 'Failed to load logs: $e';
        _isLoading = false;
      });
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredLogs = _allLogs.where((log) {
        // Filter by level
        if (_selectedLevel != LogLevel.all) {
          if (log.level.toUpperCase() != _selectedLevel.name.toUpperCase()) {
            return false;
          }
        }

        // Filter by search text
        if (_searchController.text.isNotEmpty) {
          final searchText = _searchController.text.toLowerCase();
          return log.fullText.toLowerCase().contains(searchText);
        }

        return true;
      }).toList();
    });
  }

  Future<void> _exportLogs() async {
    _logger.logTap('LogViewerScreen', 'ExportButton');

    try {
      final logFiles = await _logger.getAllLogFiles();
      
      // Also get background service logs
      final directory = await getApplicationDocumentsDirectory();
      final logDir = Directory('${directory.path}/logs');
      
      if (await logDir.exists()) {
        final bgLogFiles = await logDir.list()
            .where((entity) => entity is File && entity.path.contains('background_service_'))
            .map((entity) => entity as File)
            .toList();
        logFiles.addAll(bgLogFiles);
      }

      if (logFiles.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('No log files found to export'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      // Share all log files
      await Share.shareXFiles(
        logFiles.map((f) => XFile(f.path)).toList(),
        subject: 'Family Tracker Logs',
        text: 'Application logs from Family Tracker (includes background service logs)',
      );

      _logger.info('Logs exported successfully');
    } catch (e) {
      _logger.error('Error exporting logs', e);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to export logs: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Color _getLevelColor(String level) {
    switch (level.toUpperCase()) {
      case 'DEBUG':
        return Colors.grey;
      case 'INFO':
        return Colors.blue;
      case 'WARNING':
        return Colors.orange;
      case 'ERROR':
        return Colors.red;
      case 'FATAL':
        return Colors.purple;
      default:
        return Colors.black;
    }
  }

  IconData _getLevelIcon(String level) {
    switch (level.toUpperCase()) {
      case 'DEBUG':
        return Icons.bug_report;
      case 'INFO':
        return Icons.info;
      case 'WARNING':
        return Icons.warning;
      case 'ERROR':
        return Icons.error;
      case 'FATAL':
        return Icons.dangerous;
      default:
        return Icons.circle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Log Viewer'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadLogs,
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _exportLogs,
            tooltip: 'Export',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search and filter section
          Container(
            color: theme.colorScheme.surfaceContainerHighest,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Search field
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search logs...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _applyFilters();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: theme.colorScheme.surface,
                  ),
                  onChanged: (_) => _applyFilters(),
                ),
                const SizedBox(height: 12),

                // Level filter chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: LogLevel.values.map((level) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(level.name.toUpperCase()),
                          selected: _selectedLevel == level,
                          onSelected: (selected) {
                            setState(() {
                              _selectedLevel = level;
                            });
                            _applyFilters();
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // Results count
          if (!_isLoading && _error == null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
              child: Row(
                children: [
                  Text(
                    'Showing ${_filteredLogs.length} of ${_allLogs.length} entries',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),

          // Log entries list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.error_outline,
                                size: 64,
                                color: Colors.red.shade300,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: theme.textTheme.bodyLarge,
                              ),
                              const SizedBox(height: 16),
                              FilledButton.icon(
                                onPressed: _loadLogs,
                                icon: const Icon(Icons.refresh),
                                label: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _filteredLogs.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.search_off,
                                  size: 64,
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No logs found',
                                  style: theme.textTheme.titleLarge,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Try adjusting your filters',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: _filteredLogs.length,
                            itemBuilder: (context, index) {
                              final log = _filteredLogs[index];
                              final levelColor = _getLevelColor(log.level);
                              final levelIcon = _getLevelIcon(log.level);

                              return Card(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                child: ExpansionTile(
                                  leading: Icon(
                                    levelIcon,
                                    color: levelColor,
                                    size: 20,
                                  ),
                                  title: Text(
                                    log.message,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                  subtitle: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: levelColor.withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          log.level,
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: levelColor,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          log.timestamp,
                                          style: const TextStyle(fontSize: 10),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  children: [
                                    Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.all(12),
                                      color: theme.colorScheme.surfaceContainerHighest,
                                      child: SelectableText(
                                        log.fullText,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontFamily: 'monospace',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}

import 'dart:io';
import 'package:logger/logger.dart';
import 'package:path_provider/path_provider.dart';
import 'package:intl/intl.dart';

class LoggerService {
  static final LoggerService _instance = LoggerService._internal();
  factory LoggerService() => _instance;

  late Logger _logger;
  final List<String> _logBuffer = [];
  final int _maxBufferSize = 1000;
  File? _logFile;
  bool _isInitialized = false;

  LoggerService._internal() {
    _logger = Logger(
      printer: PrettyPrinter(
        methodCount: 2,
        errorMethodCount: 8,
        lineLength: 120,
        colors: true,
        printEmojis: true,
        printTime: true,
      ),
      output: _CustomLogOutput(this),
    );
    // Initialize log file asynchronously
    _initializeLogFile();
  }

  Future<void> _initializeLogFile() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final logDir = Directory('${directory.path}/logs');
      if (!await logDir.exists()) {
        await logDir.create(recursive: true);
      }

      final dateStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      _logFile = File('${logDir.path}/app_log_$dateStr.txt');

      // Ensure the file exists
      if (!await _logFile!.exists()) {
        await _logFile!.create();
      }

      _isInitialized = true;
      print('Log file initialized: ${_logFile!.path}');

      // Clean up old log files (keep last 7 days)
      await _cleanupOldLogs(logDir);
    } catch (e) {
      print('Error initializing log file: $e');
      _isInitialized = false;
    }
  }

  Future<void> _cleanupOldLogs(Directory logDir) async {
    try {
      final now = DateTime.now();
      final files = await logDir.list().toList();

      for (var entity in files) {
        if (entity is File && entity.path.contains('app_log_')) {
          final stat = await entity.stat();
          final age = now.difference(stat.modified);

          if (age.inDays > 7) {
            await entity.delete();
          }
        }
      }
    } catch (e) {
      print('Error cleaning up old logs: $e');
    }
  }

  void _addToBuffer(String message) {
    final timestamp = DateFormat('yyyy-MM-dd HH:mm:ss.SSS').format(DateTime.now());
    final logEntry = '[$timestamp] $message';

    _logBuffer.add(logEntry);

    if (_logBuffer.length > _maxBufferSize) {
      _logBuffer.removeAt(0);
    }

    _writeToFile(logEntry);
  }

  Future<void> _writeToFile(String message) async {
    try {
      // Wait for initialization if not ready yet
      if (!_isInitialized && _logFile == null) {
        // Try to initialize again if it failed
        await _initializeLogFile();
      }

      if (_logFile != null && await _logFile!.exists()) {
        await _logFile!.writeAsString('$message\n', mode: FileMode.append);
      }
    } catch (e) {
      print('Error writing to log file: $e');
    }
  }

  // Logging methods
  void debug(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.d(message, error: error, stackTrace: stackTrace);
  }

  void info(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.i(message, error: error, stackTrace: stackTrace);
  }

  void warning(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.w(message, error: error, stackTrace: stackTrace);
  }

  void error(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.e(message, error: error, stackTrace: stackTrace);
  }

  void fatal(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.f(message, error: error, stackTrace: stackTrace);
  }

  // Log user interactions
  void logTap(String screenName, String element) {
    info('TAP: $screenName -> $element');
  }

  void logScreenView(String screenName) {
    info('SCREEN: Viewed $screenName');
  }

  void logApiCall(String method, String endpoint, [int? statusCode]) {
    if (statusCode != null) {
      info('API: $method $endpoint - Status: $statusCode');
    } else {
      info('API: $method $endpoint');
    }
  }

  void logLocationUpdate(double lat, double lon) {
    info('LOCATION: Updated to ($lat, $lon)');
  }

  void logAuthEvent(String event) {
    info('AUTH: $event');
  }

  // Get logs for export
  String getAllLogs() {
    return _logBuffer.join('\n');
  }

  Future<String> getLogsFromFile() async {
    try {
      // Wait for initialization if not ready yet
      if (!_isInitialized && _logFile == null) {
        await _initializeLogFile();
      }

      if (_logFile != null && await _logFile!.exists()) {
        final content = await _logFile!.readAsString();
        // If file is empty but buffer has logs, return buffer
        if (content.trim().isEmpty && _logBuffer.isNotEmpty) {
          return getAllLogs();
        }
        return content;
      }
    } catch (e) {
      error('Error reading log file', e);
    }
    // Fallback to in-memory buffer
    return getAllLogs();
  }

  Future<List<File>> getAllLogFiles() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final logDir = Directory('${directory.path}/logs');

      if (await logDir.exists()) {
        final files = await logDir
            .list()
            .where((entity) => entity is File && entity.path.contains('app_log_'))
            .map((entity) => entity as File)
            .toList();

        // Sort by modification date, newest first
        files.sort((a, b) {
          final aStat = a.statSync();
          final bStat = b.statSync();
          return bStat.modified.compareTo(aStat.modified);
        });

        return files;
      }
    } catch (e) {
      error('Error getting log files', e);
    }
    return [];
  }

  void clearLogs() {
    _logBuffer.clear();
    info('Logs cleared');
  }
}

class _CustomLogOutput extends LogOutput {
  final LoggerService loggerService;

  _CustomLogOutput(this.loggerService);

  @override
  void output(OutputEvent event) {
    for (var line in event.lines) {
      print(line);
      loggerService._addToBuffer(line);
    }
  }
}

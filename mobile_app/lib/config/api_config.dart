class ApiConfig {
  // Change this to your server IP address
  static const String baseUrl = 'http://10.0.0.129:8081/api';
  static const String wsUrl = 'ws://10.0.0.129:8081/ws';

  // API Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String createFamily = '/families';
  static const String getFamily = '/families/me';
  static const String updateFamily = '/families';
  static const String inviteUser = '/families/invite';
  static const String leaveFamily = '/families/leave';
  static const String updateLocation = '/locations';
  static const String getFamilyLocations = '/locations/family';
  static const String getMessages = '/messages';
  static const String sendMessage = '/messages';
  static const String deleteMessage = '/messages';
}

# Family Tracker - Complete Project Summary

## Overview
Family Tracker is a self-hosted family location tracking and messaging application with a web interface and Android mobile app. Similar to Life360, it allows families to share locations in real-time and communicate via messaging.

## Project Components

### 1. Backend API (Node.js + Express + PostgreSQL)
**Location:** `backend/`

**Key Features:**
- RESTful API with JWT authentication
- WebSocket support for real-time updates
- PostgreSQL database with automatic schema initialization
- OwnTracks integration for third-party location apps
- Comprehensive messaging system
- Rate limiting and security (helmet, CORS)

**API Endpoints:**
- **Authentication:** `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- **Family Management:** `/api/families` (CRUD operations, invite, leave)
- **Location Tracking:** `/api/locations`, `/api/locations/family`, `/api/locations/history/:userId`
- **Messaging:** `/api/messages` (send, get with pagination, delete)
- **OwnTracks:** `/api/owntracks` (HTTP endpoint for OwnTracks app)
- **Admin:** `/api/admin/users` (user management)
- **WebSocket:** `ws://server:port/ws?token=<jwt-token>`

**Database Schema:**
- `users` table (id, email, password_hash, name, is_admin, family_id)
- `families` table (id, name, created_by)
- `locations` table (id, user_id, latitude, longitude, accuracy, altitude, battery, timestamp)
- `messages` table (id, family_id, user_id, message, created_at)

---

### 2. Web Frontend (React + TypeScript + Tailwind CSS)
**Location:** `frontend/`

**Pages:**
- **Login/Register:** User authentication
- **Dashboard:** Interactive map showing family member locations
- **Family Management:** Create/join family, invite members, view family details
- **OwnTracks Setup:** Step-by-step guide for configuring OwnTracks mobile app
- **Admin Panel:** User management (admin only)

**Key Features:**
- Real-time location updates via WebSocket
- Interactive map with Leaflet + OpenStreetMap
- Responsive design (mobile + desktop)
- Secure token storage
- Family member management
- Material Design UI components

---

### 3. Android Mobile App (Flutter)
**Location:** `mobile_app/`

**APK Output:** `mobile_app/build/app/outputs/flutter-apk/app-release.apk` (47.9MB)

**Screens:**
- **Login/Register:** Material Design 3 authentication UI
- **Home:** Bottom navigation with 3 tabs (Map, Family, Messages)
- **Map View:** Real-time family member locations with custom markers
- **Family Management:** Create/join/leave family, invite members
- **Messages:** Chat interface with real-time delivery

**Key Features:**
- **Authentication:** Secure token storage using flutter_secure_storage
- **State Management:** Provider package for reactive updates
- **Real-time Updates:** WebSocket integration for locations and messages
- **Location Tracking:** Foreground and periodic background tracking
- **Maps:** Flutter Map with OpenStreetMap tiles
- **Custom Markers:** User avatars with battery level indicators
- **Messaging:** Chat UI with pagination and time formatting
- **Permissions:** Handles location permissions (fine, coarse, background)
- **Error Handling:** Comprehensive error handling with user feedback
- **Pull-to-Refresh:** All data lists support pull-to-refresh

**Technical Details:**
- 20 Dart files (~4,000 lines of code)
- Material Design 3 with indigo theme (#6366F1)
- Production-ready with proper error handling
- Location updates every 5 minutes (configurable)
- Secure HTTP communication with API backend

**Permissions (AndroidManifest.xml):**
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION
- FOREGROUND_SERVICE
- FOREGROUND_SERVICE_LOCATION
- INTERNET
- WAKE_LOCK

---

### 4. API Documentation
**Location:** `MOBILE_API_DOCUMENTATION.md`

Complete API reference for mobile app development including:
- All endpoint specifications with request/response examples
- Authentication flow
- WebSocket message types
- Error codes and handling
- Rate limiting information
- Best practices for mobile apps
- Example implementation flows

---

## Deployment

### Docker Compose (Production)
```bash
docker-compose up -d
```

**Containers:**
- **postgres:** PostgreSQL 16 database (port 5432)
- **backend:** Node.js API server (port 3000 internal)
- **frontend:** Nginx serving React app (port 8081)

**Access:**
- Web App: http://localhost:8081
- API: http://localhost:8081/api
- WebSocket: ws://localhost:8081/ws

**Default Admin Account:**
- Email: admin@familytracker.local
- Password: admin123
- **IMPORTANT:** Change this password immediately!

---

## Configuration

### Backend Environment Variables
Edit `.env` file:
```
PORT=3000
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=family_tracker
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
JWT_SECRET=your_secret_key_here
CORS_ORIGINS=http://localhost:8081,http://localhost
ADMIN_EMAIL=admin@familytracker.local
ADMIN_PASSWORD=admin123
ADMIN_NAME=Administrator
```

### Mobile App Configuration
Edit `mobile_app/lib/config/api_config.dart`:
```dart
class ApiConfig {
  static const String baseUrl = 'http://YOUR_SERVER_IP:8081/api';
  static const String wsUrl = 'ws://YOUR_SERVER_IP:8081/ws';
}
```

---

## Installation & Setup

### Web Application
1. Clone repository
2. Create `.env` file in root directory
3. Run `docker-compose up -d --build`
4. Access web app at http://localhost:8081
5. Login with admin credentials
6. Change admin password
7. Create your family

### Mobile App

#### Build APK
```bash
cd mobile_app
flutter pub get
flutter build apk --release
```

APK will be at: `mobile_app/build/app/outputs/flutter-apk/app-release.apk`

#### Install on Android Device
1. Transfer APK to Android device
2. Enable "Install from Unknown Sources" in Android settings
3. Install APK
4. Grant location permissions when prompted
5. Update server URL in app settings if needed

---

## Features

### Core Functionality
✅ User registration and authentication
✅ Create and manage family groups
✅ Invite family members by email
✅ Real-time location sharing
✅ Background location tracking
✅ Family member map view
✅ Location history
✅ Real-time messaging
✅ Message pagination
✅ WebSocket real-time updates
✅ OwnTracks integration
✅ Admin user management
✅ Responsive web design
✅ Native Android app
✅ Docker deployment

### Security
✅ JWT authentication with 30-day expiry
✅ Password hashing (bcrypt)
✅ Secure token storage on mobile
✅ Rate limiting (100 req/15 min)
✅ CORS configuration
✅ Helmet.js security headers
✅ Family-based privacy (only family members see locations)

---

## Mobile App Architecture

### Services Layer
- **AuthService:** Token management and user data caching
- **ApiService:** HTTP client for all API endpoints
- **LocationService:** Foreground/background location tracking
- **WebSocketService:** Real-time communication with auto-reconnect

### State Management (Provider)
- **AuthProvider:** Authentication state and user info
- **FamilyProvider:** Family data and member management
- **LocationProvider:** Real-time location updates for all family members
- **MessageProvider:** Message history and real-time delivery

### Models (JSON Serialization)
- User, Family, Location, FamilyMemberLocation, Message, MessagePagination

### UI Components
- Login/Register screens with validation
- Home screen with bottom navigation
- Map view with custom location markers
- Family management UI
- Chat interface with message bubbles
- Custom widgets (LocationMarker)

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info (requires auth)

### Family Management
- `POST /api/families` - Create new family
- `GET /api/families/me` - Get my family details
- `PATCH /api/families` - Update family name
- `POST /api/families/invite` - Invite user by email
- `POST /api/families/leave` - Leave current family

### Location Tracking
- `POST /api/locations` - Update your location
- `GET /api/locations/family` - Get all family member locations
- `GET /api/locations/history/:userId?limit=100` - Get location history

### Messaging
- `POST /api/messages` - Send message to family
- `GET /api/messages?limit=100&offset=0` - Get messages with pagination
- `DELETE /api/messages/:messageId` - Delete message (own messages only)

### OwnTracks
- `POST /api/owntracks` - OwnTracks HTTP endpoint

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `DELETE /api/admin/users/:userId` - Delete user (admin only)
- `PUT /api/admin/users/:userId/admin` - Toggle admin status (admin only)

### WebSocket
- Connect: `ws://server:port/ws?token=<jwt-token>`
- Message types: `connected`, `location_update`, `message`

---

## Technology Stack

### Backend
- Node.js 20
- Express.js (web framework)
- TypeScript
- PostgreSQL 16 (database)
- JWT (authentication)
- bcrypt (password hashing)
- WebSocket (ws package)
- Zod (validation)
- Helmet.js (security)
- Rate limiting

### Frontend Web
- React 18
- TypeScript
- Vite (build tool)
- Tailwind CSS
- React Router
- Zustand (state management)
- Leaflet (maps)
- OpenStreetMap
- React Hot Toast (notifications)
- date-fns (date formatting)

### Mobile App (Flutter)
- Flutter 3.35.7
- Dart 3.9.2
- Provider (state management)
- flutter_map (maps)
- geolocator (location services)
- http (API client)
- flutter_secure_storage (secure token storage)
- web_socket_channel (WebSocket)
- permission_handler (permissions)
- json_annotation (JSON serialization)

### DevOps
- Docker & Docker Compose
- Nginx (frontend server)
- Multi-stage builds

---

## Project Structure

```
Family-Tracker/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── config/             # Database configuration
│   │   ├── middleware/         # Auth middleware
│   │   ├── routes/             # API routes
│   │   ├── types/              # TypeScript types
│   │   ├── index.ts            # Entry point
│   │   └── websocket.ts        # WebSocket handler
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # React web app
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── lib/                # API client and utilities
│   │   ├── store/              # Zustand state stores
│   │   └── types/              # TypeScript types
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── mobile_app/                 # Flutter Android app
│   ├── android/                # Android platform files
│   ├── lib/
│   │   ├── config/             # API configuration
│   │   ├── models/             # Data models
│   │   ├── providers/          # State providers
│   │   ├── screens/            # UI screens
│   │   ├── services/           # Business logic
│   │   ├── widgets/            # Reusable widgets
│   │   └── main.dart           # Entry point
│   ├── build/app/outputs/flutter-apk/
│   │   └── app-release.apk     # Built APK (47.9MB)
│   └── pubspec.yaml
│
├── docker-compose.yml          # Docker orchestration
├── .env                        # Environment variables
├── .gitignore
├── README.md                   # Project overview
├── MOBILE_API_DOCUMENTATION.md # Complete API reference
├── PROJECT_SUMMARY.md          # This file
└── DEPLOYMENT.md               # Deployment guide
```

---

## Testing & Usage

### Web Application Testing
1. Open browser to http://localhost:8081
2. Register new account or login with admin credentials
3. Create a family group
4. Invite family members by email
5. View map to see location markers
6. Test real-time updates by opening multiple browser windows

### Mobile App Testing
1. Install APK on Android device
2. Login with same account as web
3. Grant location permissions
4. Verify location appears on web map
5. Send messages and verify real-time delivery
6. Test background location tracking

### API Testing
Use curl, Postman, or any HTTP client:

```bash
# Register
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get family locations (with token)
curl http://localhost:8081/api/locations/family \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Performance & Scalability

### Current Limits
- Rate limiting: 100 requests per 15 minutes per IP
- Database connection pool: 20 connections max
- WebSocket heartbeat: 30 seconds
- Location update interval: 5 minutes (mobile app, configurable)
- Message pagination: 100 messages per page (default)

### Optimization Tips
- Use nginx caching for static assets
- Implement Redis for session storage (future enhancement)
- Add database indexes for frequently queried fields
- Use CDN for map tiles in production
- Implement message archiving for old messages
- Add location data cleanup job for old data

---

## Future Enhancements

### Planned Features
- [ ] iOS mobile app
- [ ] Push notifications for messages
- [ ] Geofencing and location alerts
- [ ] Battery optimization modes
- [ ] Location sharing time limits
- [ ] Private messaging between members
- [ ] Location history playback
- [ ] Multi-language support
- [ ] Dark mode for web and mobile
- [ ] Place favorites and shortcuts
- [ ] Speed and distance tracking

### Technical Improvements
- [ ] Redis for session management
- [ ] PostgreSQL read replicas
- [ ] Automated backups
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] End-to-end encryption for messages
- [ ] Two-factor authentication
- [ ] OAuth2 integration
- [ ] HTTPS/TLS configuration guide
- [ ] Kubernetes deployment

---

## Troubleshooting

### Docker Issues
**Problem:** Containers won't start
**Solution:** Check logs with `docker-compose logs` and ensure `.env` file exists

**Problem:** Port 8081 already in use
**Solution:** Change PORT in `.env` and update CORS_ORIGINS

**Problem:** Database connection failed
**Solution:** Wait for postgres container to be healthy, check credentials in `.env`

### Mobile App Issues
**Problem:** Can't connect to API
**Solution:** Check server IP in `api_config.dart`, ensure device on same network

**Problem:** Location not updating
**Solution:** Check location permissions, ensure app has background permission

**Problem:** APK build fails
**Solution:** Run `flutter clean` and `flutter pub get`, then rebuild

### Web App Issues
**Problem:** 404 on API calls
**Solution:** Check backend container is running, verify API URLs

**Problem:** WebSocket not connecting
**Solution:** Check token is valid, verify WebSocket URL format

---

## Security Considerations

### Production Deployment
1. **Change default admin password immediately**
2. Use strong JWT_SECRET (32+ random characters)
3. Use strong database passwords
4. Enable HTTPS/TLS (use reverse proxy like nginx or Caddy)
5. Implement rate limiting at reverse proxy level
6. Regular security updates for dependencies
7. Monitor logs for suspicious activity
8. Implement database backups
9. Use environment-specific .env files
10. Don't commit .env to version control

### Mobile App Security
1. Use HTTPS in production (update api_config.dart)
2. Implement certificate pinning
3. Add ProGuard/R8 for code obfuscation
4. Review Android permissions regularly
5. Implement app signing for Play Store

---

## License
This project is private and not licensed for public use.

---

## Support & Contribution
For issues and feature requests, use the project's issue tracker.

---

## Credits
Built with Claude Code by Anthropic.

**Generated:** November 30, 2025
**Version:** 1.0.0
**Repository:** http://10.0.0.129:3000/charles/Family-Tracker.git

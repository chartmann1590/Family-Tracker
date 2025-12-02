# Family Tracker

A beautiful, self-hosted family location tracking application with real-time updates. Track your family members' locations privately on your own server with support for OwnTracks and custom mobile apps.

## Features

- **Beautiful Web Interface**: Responsive design that looks amazing on both desktop and mobile
- **Real-time Location Updates**: WebSocket-based live location tracking
- **OwnTracks Integration**: Compatible with the popular OwnTracks mobile app
- **Family Groups**: Create and manage family groups with multiple members
- **Privacy-First**: Self-hosted solution with full control over your data
- **Admin Dashboard**: Comprehensive admin panel for user and family management
- **Docker Support**: Easy deployment with Docker Compose
- **Secure Authentication**: JWT-based authentication with admin and user roles

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- PostgreSQL
- WebSocket (ws)
- JWT Authentication

### Frontend
- React + TypeScript
- Tailwind CSS
- Leaflet + OpenStreetMap
- Zustand (state management)
- React Router

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Or Node.js 20+ and PostgreSQL 16+ for manual installation

### Docker Deployment (Recommended)

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd Family-Tracker
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and update the following:
   - `POSTGRES_PASSWORD`: Set a secure database password
   - `JWT_SECRET`: Generate a secure random string
   - `ADMIN_PASSWORD`: Set a secure admin password
   - `PORT`: Port to run the application (default: 8080)

4. Start the application:
   ```bash
   docker-compose up -d
   ```

5. Access the application:
   - Open your browser to `http://localhost:8080`
   - Login with admin credentials from `.env` file
   - Default: admin@familytracker.local / admin123

### Manual Installation

#### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your PostgreSQL credentials

5. Start the backend:
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access at `http://localhost:5173`

## Usage

### Creating a Family

1. After logging in, navigate to the "Family" page
2. Create a new family by entering a family name
3. Invite other users by their email address
4. Users must register first before they can be invited

### OwnTracks Integration

Family Tracker supports OwnTracks for automatic location updates from your mobile device.

#### OwnTracks Setup

1. Install OwnTracks from the App Store or Google Play
2. Open OwnTracks and go to Settings
3. Configure the following:

   **Connection Settings:**
   - Mode: HTTP
   - URL: `http://your-server:8080/api/owntracks`
   - Authentication: Enable
   - Username: Your email
   - Password: Not used (use token instead)
   - Device ID: Any unique identifier
   - Tracker ID: Your initials (2 characters)

   **Advanced Settings:**
   - Add custom HTTP header:
     - Header: `Authorization`
     - Value: `Bearer YOUR_JWT_TOKEN`

4. To get your JWT token:
   - Login to the web interface
   - Open browser developer tools (F12)
   - Go to Application/Storage → Local Storage
   - Copy the value of `token`

5. Test the connection by moving around. You should see your location update in the web interface.

#### OwnTracks JSON Format

OwnTracks sends location data in this format:
```json
{
  "_type": "location",
  "lat": 40.7128,
  "lon": -74.0060,
  "tst": 1234567890,
  "acc": 10,
  "alt": 50,
  "batt": 85
}
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

#### Locations
- `POST /api/locations` - Update own location
- `GET /api/locations/family` - Get family locations
- `GET /api/locations/history/:userId` - Get location history

#### OwnTracks
- `POST /api/owntracks` - OwnTracks location update
- `POST /api/owntracks/batch` - Batch location updates

#### Families
- `POST /api/families` - Create family
- `GET /api/families/me` - Get my family
- `PATCH /api/families` - Update family
- `POST /api/families/invite` - Invite user
- `POST /api/families/leave` - Leave family

#### Admin (requires admin role)
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/families` - Get all families
- `DELETE /api/admin/families/:id` - Delete family
- `GET /api/admin/stats` - Get system statistics

### WebSocket Connection

Connect to WebSocket for real-time location updates:

```javascript
const ws = new WebSocket('ws://your-server:8080/ws?token=YOUR_JWT_TOKEN');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'location_update') {
    console.log('Location update:', message.data);
  }
};
```

## Security Considerations

1. **Change Default Credentials**: Always change the default admin password
2. **Use HTTPS**: In production, use a reverse proxy (nginx, Traefik) with SSL/TLS
3. **Secure JWT Secret**: Use a strong random string for JWT_SECRET
4. **Database Security**: Use a strong database password
5. **Network Security**: Consider using a VPN or firewall to restrict access
6. **Regular Updates**: Keep dependencies updated

## Production Deployment

### Using Nginx Reverse Proxy

1. Install Nginx on your server
2. Create a configuration file:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d your-domain.com
```

### Environment Variables

Make sure to update these in production:
- `JWT_SECRET`: Use a cryptographically secure random string
- `ADMIN_PASSWORD`: Set a strong password
- `POSTGRES_PASSWORD`: Use a strong database password
- `CORS_ORIGINS`: Set to your domain(s)

## Development

### Project Structure

```
Family-Tracker/
├── backend/
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── middleware/   # Auth middleware
│   │   ├── routes/       # API routes
│   │   ├── types/        # TypeScript types
│   │   ├── index.ts      # Server entry point
│   │   └── websocket.ts  # WebSocket server
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # API client, utilities
│   │   ├── store/        # Zustand stores
│   │   ├── types/        # TypeScript types
│   │   └── App.tsx       # App entry point
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Building for Production

```bash
# Build all services
docker-compose build

# Or build individually
cd backend && npm run build
cd frontend && npm run build
```

### Building Docker with Latest APK

**The Docker build automatically includes the latest APK** from `mobile_app/build/app/outputs/flutter-apk/app-release.apk` if it exists. No manual copying is required!

```bash
# Build the APK first (if not already built)
cd mobile_app
flutter build apk --release

# Build Docker images - APK will be automatically included
docker-compose build
# or
npm run docker:build
```

**How it works:**
- The Docker build process automatically looks for the APK in `mobile_app/build/app/outputs/flutter-apk/app-release.apk`
- If found, it copies it to the frontend's public downloads directory
- If not found, it uses any existing APK in `frontend/public/downloads/` or continues without one
- The APK is served at `/downloads/family-tracker.apk` in the running container

**Manual APK management (optional):**
```bash
# Copy the latest APK to frontend manually (if needed for local development)
npm run copy-apk

# Build APK and copy it automatically
npm run apk:build-and-copy

# Build Docker with explicit APK copy step (redundant but available)
npm run docker:build:with-apk
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists

### WebSocket Connection Fails
- Check firewall settings
- Verify WebSocket URL includes token
- Check browser console for errors

### OwnTracks Not Updating
- Verify JWT token is correct
- Check OwnTracks connection settings
- Review backend logs for errors
- Ensure user is part of a family

### Location Not Showing on Map
- Verify user has shared location
- Check family membership
- Refresh the page
- Check browser console for errors

## Mobile App

A Flutter-based Android mobile app is included in this repository. The app provides:

- **Real-time Location Tracking**: Automatic location updates with configurable intervals
- **Family Management**: Create, join, and manage family groups
- **Interactive Maps**: View family members' locations on an interactive map
- **Real-time Messaging**: Chat with family members
- **In-app Logs**: View application logs for debugging
- **Secure Authentication**: JWT-based authentication with secure token storage

### Building the Mobile App

See the [Building Docker with Latest APK](#building-docker-with-latest-apk) section above for instructions on building and deploying the APK.

For detailed mobile app setup and configuration, see `PROJECT_SUMMARY.md` and `MOBILE_API_DOCUMENTATION.md`.

API documentation is available at `/api/health` for health checks.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

## Acknowledgments

- OpenStreetMap for map tiles
- OwnTracks for the excellent location tracking protocol
- The open-source community for the amazing tools and libraries

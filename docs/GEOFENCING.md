# Geofencing Feature Documentation

## Overview

The geofencing feature allows you to create virtual boundaries (geofences) around specific geographic locations. When a family member enters or exits these areas, the system automatically sends email notifications to administrators and specified recipients.

## Features

- **Create Geofences**: Define circular geofence areas with custom radius (10m to 100km)
- **Per-User or Family-Wide**: Apply geofences to specific users or all family members
- **Entry/Exit Notifications**: Configure alerts for entering, exiting, or both
- **Email Notifications**: Automatic email alerts with location details and Google Maps link
- **Violation History**: Track all geofence violations with timestamps
- **SMTP Configuration**: Admin-configurable email settings for notifications

## Table of Contents

1. [Configuration](#configuration)
2. [API Endpoints](#api-endpoints)
3. [Creating Geofences](#creating-geofences)
4. [Email Notifications](#email-notifications)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Configuration

### Step 1: Configure SMTP Settings (Admin Only)

Before geofencing notifications can work, an administrator must configure SMTP settings.

**API Endpoint**: `POST /api/admin/smtp-settings`

**Request Body**:
```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_secure": false,
  "smtp_user": "your-email@gmail.com",
  "smtp_password": "your-app-password",
  "from_email": "noreply@familytracker.com",
  "from_name": "Family Tracker",
  "admin_email": "admin@example.com",
  "notification_emails": ["parent1@example.com", "parent2@example.com"]
}
```

**Fields Explanation**:
- `smtp_host`: SMTP server hostname (e.g., smtp.gmail.com, smtp.office365.com)
- `smtp_port`: SMTP port (587 for TLS, 465 for SSL, 25 for unencrypted)
- `smtp_secure`: Set to `true` for SSL (port 465), `false` for TLS (port 587)
- `smtp_user`: SMTP authentication username
- `smtp_password`: SMTP authentication password
- `from_email`: Email address to send from
- `from_name`: Display name for sender
- `admin_email`: Primary admin email (always receives notifications)
- `notification_emails`: Array of additional emails to notify

**Example (Gmail)**:
```bash
curl -X POST http://localhost:8081/api/admin/smtp-settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_secure": false,
    "smtp_user": "your-email@gmail.com",
    "smtp_password": "your-16-char-app-password",
    "from_email": "noreply@familytracker.com",
    "from_name": "Family Tracker Alerts",
    "admin_email": "admin@example.com",
    "notification_emails": ["mom@example.com", "dad@example.com"]
  }'
```

**Gmail App Password**:
1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password for "Mail"
4. Use the 16-character password (no spaces) in `smtp_password`

### Step 2: Test SMTP Connection

**API Endpoint**: `POST /api/admin/smtp-settings/test`

```bash
curl -X POST http://localhost:8081/api/admin/smtp-settings/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "message": "SMTP connection successful"
}
```

---

## API Endpoints

### Geofence Management (All Users)

#### Get All Geofences for Family
```
GET /api/geofences
Authorization: Bearer YOUR_TOKEN
```

**Response**:
```json
{
  "geofences": [
    {
      "id": 1,
      "family_id": 1,
      "name": "Home",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "radius": 100,
      "user_id": null,
      "is_active": true,
      "notify_on_exit": true,
      "notify_on_enter": false,
      "created_by": 1,
      "created_at": "2025-12-02T00:00:00.000Z",
      "updated_at": "2025-12-02T00:00:00.000Z"
    }
  ]
}
```

#### Create Geofence
```
POST /api/geofences
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Home",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 100,
  "user_id": null,
  "notify_on_exit": true,
  "notify_on_enter": false
}
```

**Fields**:
- `name`: Human-readable name for the geofence
- `latitude`: Center latitude (-90 to 90)
- `longitude`: Center longitude (-180 to 180)
- `radius`: Radius in meters (10 to 100000)
- `user_id`: Specific user ID to track, or `null` for all family members
- `notify_on_exit`: Send email when user exits this geofence
- `notify_on_enter`: Send email when user enters this geofence

#### Update Geofence
```
PATCH /api/geofences/:id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "Updated Home",
  "latitude": 40.7129,
  "longitude": -74.0061,
  "radius": 150,
  "is_active": true,
  "notify_on_exit": true,
  "notify_on_enter": true
}
```

#### Delete Geofence
```
DELETE /api/geofences/:id
Authorization: Bearer YOUR_TOKEN
```

#### Get Geofence Violations
```
GET /api/geofences/:id/violations
Authorization: Bearer YOUR_TOKEN
```

**Response**:
```json
{
  "violations": [
    {
      "id": 1,
      "geofence_id": 1,
      "user_id": 2,
      "violation_type": "exit",
      "latitude": 40.7140,
      "longitude": -74.0070,
      "notified": true,
      "notification_sent_at": "2025-12-02T10:30:00.000Z",
      "created_at": "2025-12-02T10:30:00.000Z",
      "user_name": "John Doe"
    }
  ]
}
```

### Admin Endpoints

#### Get All Geofences (All Families)
```
GET /api/admin/geofences
Authorization: Bearer ADMIN_TOKEN
```

#### Get All Violations
```
GET /api/admin/geofence-violations?limit=100&offset=0
Authorization: Bearer ADMIN_TOKEN
```

#### Get/Update SMTP Settings
```
GET /api/admin/smtp-settings
POST /api/admin/smtp-settings
POST /api/admin/smtp-settings/test
Authorization: Bearer ADMIN_TOKEN
```

---

## Creating Geofences

### Example: Create Home Geofence

```bash
# Create a geofence around home with 100-meter radius
# Notify when anyone in the family exits
curl -X POST http://localhost:8081/api/geofences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Home",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius": 100,
    "user_id": null,
    "notify_on_exit": true,
    "notify_on_enter": false
  }'
```

### Example: Create School Geofence for Specific Child

```bash
# Create geofence around school for a specific child (user_id: 5)
# Notify on both entry and exit
curl -X POST http://localhost:8081/api/geofences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "School - Johnny",
    "latitude": 40.7580,
    "longitude": -73.9855,
    "radius": 50,
    "user_id": 5,
    "notify_on_exit": true,
    "notify_on_enter": true
  }'
```

### Use Cases

1. **Home Monitoring**: Know when children leave home
   - `notify_on_exit: true, notify_on_enter: false`

2. **School Arrival**: Confirm children arrived at school
   - `notify_on_exit: false, notify_on_enter: true`

3. **Restricted Areas**: Alert when anyone enters unsafe areas
   - `notify_on_exit: false, notify_on_enter: true`

4. **Elderly Care**: Know when elderly family members leave home
   - `notify_on_exit: true, notify_on_enter: false`

---

## Email Notifications

### Email Format

When a geofence violation occurs, an HTML email is sent containing:

**Subject**: `Geofence Alert: [User Name] [exited/entered] [Geofence Name]`

**Body Includes**:
- User name
- Geofence name
- Action (entered or exited)
- Timestamp
- GPS coordinates
- Google Maps link to exact location

**Recipients**:
- Admin email (always)
- All emails in `notification_emails` array

### Sample Email

```
Subject: Geofence Alert: Johnny Smith exited Home

Johnny Smith exited Home

Time: 12/2/2025, 3:45:00 PM

Details:
User: Johnny Smith
Geofence: Home
Action: Exited geofence area
Location: 40.712800, -74.006000
Timestamp: 12/2/2025, 3:45:00 PM

[View on Google Maps] (clickable link)

This is an automated notification from Family Tracker.
The user has left the geofenced area.
```

---

## Testing

### Manual Testing Steps

1. **Configure SMTP** (admin):
   ```bash
   curl -X POST http://localhost:8081/api/admin/smtp-settings \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"smtp_host": "smtp.gmail.com", ...}'
   ```

2. **Test SMTP Connection**:
   ```bash
   curl -X POST http://localhost:8081/api/admin/smtp-settings/test \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

3. **Create a Test Geofence**:
   ```bash
   curl -X POST http://localhost:8081/api/geofences \
     -H "Authorization: Bearer USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Zone",
       "latitude": 40.7128,
       "longitude": -74.0060,
       "radius": 50,
       "notify_on_exit": true
     }'
   ```

4. **Simulate Location Updates**:
   - Start inside geofence: Send location at (40.7128, -74.0060)
   - Move outside geofence: Send location at (40.7150, -74.0060)
   - You should receive an email notification

5. **Check Violations**:
   ```bash
   curl http://localhost:8081/api/geofences/1/violations \
     -H "Authorization: Bearer USER_TOKEN"
   ```

### Automated Testing

```javascript
// Example test using fetch
const token = 'YOUR_TOKEN';

// Create geofence
const geofence = await fetch('http://localhost:8081/api/geofences', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Test',
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 100,
    notify_on_exit: true
  })
}).then(r => r.json());

// Send location inside geofence
await fetch('http://localhost:8081/api/locations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060
  })
});

// Wait a moment
await new Promise(resolve => setTimeout(resolve, 1000));

// Send location outside geofence
await fetch('http://localhost:8081/api/locations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 40.7200, // Far enough to be outside 100m radius
    longitude: -74.0060
  })
});

// Check for violation
const violations = await fetch(`http://localhost:8081/api/geofences/${geofence.geofence.id}/violations`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log('Violations:', violations);
```

---

## Troubleshooting

### No Emails Being Sent

**Problem**: Geofence violations occur but no emails arrive

**Solutions**:
1. **Check SMTP settings are configured**:
   ```bash
   curl http://localhost:8081/api/admin/smtp-settings \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

2. **Test SMTP connection**:
   ```bash
   curl -X POST http://localhost:8081/api/admin/smtp-settings/test \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

3. **Check backend logs**:
   ```bash
   docker logs family-tracker-backend | grep -i "geofence\|smtp\|email"
   ```

4. **Verify Gmail App Password** (if using Gmail):
   - Must use an App Password, not your regular password
   - Requires 2FA enabled on your Google account

5. **Check spam folder**: Automated emails may be filtered

### Geofence Not Triggering

**Problem**: User crosses geofence boundary but no violation recorded

**Solutions**:
1. **Check geofence is active**:
   ```bash
   curl http://localhost:8081/api/geofences \
     -H "Authorization: Bearer TOKEN"
   ```
   Ensure `is_active: true`

2. **Verify radius is appropriate**: Minimum 10 meters

3. **Check location accuracy**: Low accuracy GPS may not trigger precisely

4. **Ensure notify settings are correct**:
   - `notify_on_exit: true` for exit alerts
   - `notify_on_enter: true` for entry alerts

5. **View backend logs**:
   ```bash
   docker logs family-tracker-backend | grep "Geofence"
   ```

### SMTP Authentication Failed

**Problem**: SMTP test fails with authentication error

**Solutions**:
1. **Gmail**: Use an App Password, not regular password
2. **Office365**: May need to enable "SMTP AUTH" in admin center
3. **Custom SMTP**: Verify username/password are correct
4. **Port/Security**: Ensure `smtp_port` and `smtp_secure` match server requirements
   - Port 587 → `smtp_secure: false` (TLS/STARTTLS)
   - Port 465 → `smtp_secure: true` (SSL)

### Database Errors

**Problem**: Errors creating geofences or violations

**Solutions**:
1. **Check database is running**:
   ```bash
   docker ps | grep postgres
   ```

2. **Verify tables exist**:
   ```bash
   docker exec family-tracker-db psql -U postgres -d family_tracker \
     -c "\dt geofences; \dt geofence_violations; \dt smtp_settings;"
   ```

3. **Check foreign key constraints**: User must be in a family to create geofences

---

## Architecture

### How It Works

1. **Location Update**: When a user's location is updated via `/api/locations`:
   ```
   POST /api/locations → locations.ts
   ```

2. **Geofence Check**: System checks all active geofences for the user's family:
   ```
   geofenceService.checkGeofences() → geofenceService.ts
   ```

3. **Distance Calculation**: Haversine formula calculates distance from geofence center:
   ```javascript
   if (distance <= geofence.radius) {
     // User is inside geofence
   }
   ```

4. **State Tracking**: System remembers if user was previously inside/outside:
   ```javascript
   wasInside = true, isInside = false → EXIT violation
   wasInside = false, isInside = true → ENTER violation
   ```

5. **Violation Recording**: Violation saved to database:
   ```sql
   INSERT INTO geofence_violations (...) VALUES (...)
   ```

6. **Email Notification**: If SMTP configured, email sent:
   ```javascript
   emailService.sendGeofenceViolation({ userName, geofenceName, ... })
   ```

### Database Schema

```sql
-- Geofences table
CREATE TABLE geofences (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius INTEGER NOT NULL, -- meters
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  notify_on_exit BOOLEAN DEFAULT TRUE,
  notify_on_enter BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Geofence violations table
CREATE TABLE geofence_violations (
  id SERIAL PRIMARY KEY,
  geofence_id INTEGER NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  violation_type VARCHAR(50) NOT NULL, -- 'exit' or 'enter'
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMTP settings table
CREATE TABLE smtp_settings (
  id SERIAL PRIMARY KEY,
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_secure BOOLEAN DEFAULT TRUE,
  smtp_user VARCHAR(255) NOT NULL,
  smtp_password VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) DEFAULT 'Family Tracker',
  admin_email VARCHAR(255) NOT NULL,
  notification_emails TEXT[], -- Array of emails
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Security Considerations

1. **SMTP Password Storage**: Passwords stored in plain text in database
   - **Recommendation**: Use environment variables for production
   - **Alternative**: Encrypt passwords before storing

2. **Email Rate Limiting**: No built-in rate limiting on emails
   - **Risk**: Rapid boundary crossings could spam emails
   - **Mitigation**: Add cooldown period per geofence/user

3. **Geofence Privacy**: Users can only see family geofences
   - Enforced by checking `family_id` in all queries

4. **Admin Access**: SMTP settings only accessible by admins
   - Protected by `requireAdmin` middleware

---

## Future Enhancements

- [ ] Polygon geofences (not just circular)
- [ ] Time-based geofences (active only during certain hours)
- [ ] Cooldown period to prevent spam (e.g., max 1 email per 15 minutes)
- [ ] SMS notifications in addition to email
- [ ] Push notifications to mobile app
- [ ] Geofence templates (home, school, work)
- [ ] Batch notification summary (daily digest)
- [ ] Webhook support for custom integrations
- [ ] Frontend UI for geofence management
- [ ] Visual geofence editor on map

---

## Support

For issues or questions:
- Check backend logs: `docker logs family-tracker-backend`
- Review this documentation
- Test SMTP connection before reporting email issues
- Verify geofence coordinates and radius are correct

## License

Part of Family Tracker - See project LICENSE file

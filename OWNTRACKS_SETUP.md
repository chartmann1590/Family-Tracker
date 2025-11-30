# OwnTracks Setup Guide

This guide will help you configure OwnTracks mobile app to work with Family Tracker.

## What is OwnTracks?

OwnTracks is a free, open-source mobile app that allows you to keep track of your location privately. It supports Android and iOS and can send location updates to your own server.

## Installation

1. Install OwnTracks from your app store:
   - **iOS**: [OwnTracks on App Store](https://apps.apple.com/app/owntracks/id692424691)
   - **Android**: [OwnTracks on Google Play](https://play.google.com/store/apps/details?id=org.owntracks.android)

## Configuration

### Step 1: Get Your Authentication Token

1. Open Family Tracker in your web browser
2. Login with your credentials
3. Open browser developer tools:
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Safari**: Enable developer menu first, then `Cmd+Option+I`
4. Go to the **Application** or **Storage** tab
5. Find **Local Storage** → `http://your-domain`
6. Copy the value of the `token` key (it's a long string)
7. Save this token securely - you'll need it for OwnTracks

### Step 2: Configure OwnTracks

#### iOS Configuration

1. Open OwnTracks
2. Tap the menu icon (☰) in the top left
3. Tap **Settings**
4. Configure the following:

   **Connection:**
   - Mode: `HTTP`

   **HTTP Settings:**
   - URL: `http://your-server-address:8080/api/owntracks`
     - Replace `your-server-address` with your actual server IP or domain
     - Example: `http://192.168.1.100:8080/api/owntracks`
     - Example with domain: `https://familytracker.example.com/api/owntracks`

   **Authentication:**
   - Authentication: `ON`
   - User ID: Your email address (the one you registered with)
   - Password: Leave empty or use any value (not used)
   - Device ID: Choose a unique identifier (e.g., `iphone`, `myphone`)
   - Tracker ID: Your initials (2 characters, e.g., `JD`)

   **HTTP Headers:**
   - Tap **HTTP Headers**
   - Add a new header:
     - Key: `Authorization`
     - Value: `Bearer YOUR_TOKEN_HERE`
     - Replace `YOUR_TOKEN_HERE` with the token you copied in Step 1

5. Tap **Done** to save

#### Android Configuration

1. Open OwnTracks
2. Tap the menu icon (☰) in the top left
3. Tap **Preferences**
4. Configure the following:

   **Connection:**
   - Mode: `HTTP`

   **Connection Settings:**
   - URL: `http://your-server-address:8080/api/owntracks`
     - Replace `your-server-address` with your actual server IP or domain
   - Authentication: `Enabled`
   - Username: Your email address
   - Password: Leave empty
   - Device ID: Choose a unique identifier
   - Tracker ID: Your initials (2 characters)

   **Advanced:**
   - Scroll down to **Custom HTTP Headers**
   - Add header:
     - Name: `Authorization`
     - Value: `Bearer YOUR_TOKEN_HERE`

5. Tap back to save

### Step 3: Join a Family

Before OwnTracks can send your location to other family members, you need to be part of a family:

1. Open Family Tracker web interface
2. Navigate to **Family** page
3. Either:
   - Create a new family, or
   - Ask a family member to invite you via your email

### Step 4: Test the Connection

1. In OwnTracks, pull down to refresh or move to a new location
2. The app should show a successful upload indicator
3. Open Family Tracker web interface
4. Your location should appear on the map

## Troubleshooting

### Location Not Updating

**Check OwnTracks Status:**
- Look for upload indicators in the app
- Check for error messages in the app

**Verify Settings:**
- Ensure URL is correct (include `/api/owntracks`)
- Verify Authorization header is set correctly
- Check that token hasn't expired (tokens last 30 days by default)

**Check Server:**
- Ensure Family Tracker server is running
- Check server logs for errors
- Verify you're using the correct port

**Network Issues:**
- If using local IP, ensure you're on the same network
- If using domain, ensure it's accessible from your phone
- Check firewall settings

### Token Expired

If your token expires (default 30 days):
1. Login to Family Tracker web interface
2. Get a new token from Local Storage
3. Update the Authorization header in OwnTracks

### Permission Issues

**iOS:**
- Go to Settings → Privacy → Location Services
- Enable OwnTracks
- Set to "Always" for background tracking

**Android:**
- Go to Settings → Apps → OwnTracks → Permissions
- Allow Location access "All the time"
- Enable battery optimization exceptions

## Advanced Configuration

### Location Accuracy

For better accuracy:
- iOS: Settings → Privacy → Location Services → OwnTracks → Precise Location: ON
- Android: OwnTracks → Preferences → Location → Accuracy: High

### Update Frequency

Configure how often OwnTracks sends updates:
- **Monitoring Mode**: Choose between Move, Significant, or Manual
- **Move Mode**: More frequent updates when moving
- **Significant Mode**: Updates only on significant location changes (battery friendly)

### Background Tracking

To ensure OwnTracks works in the background:

**iOS:**
- Enable Background App Refresh for OwnTracks
- Keep the app running in the background

**Android:**
- Disable battery optimization for OwnTracks
- Allow autostart permission
- Keep notification enabled

## Privacy & Security

- All location data is stored on your own server
- Use HTTPS in production to encrypt data in transit
- Tokens are used for authentication (more secure than passwords)
- You can revoke access by logging out and in again (gets new token)
- Only family members can see your location

## Using OwnTracks Features

### Regions (Geofences)

While Family Tracker doesn't currently support region monitoring, OwnTracks can still track regions locally on your device.

### Waypoints

You can set waypoints in OwnTracks, but they won't be shared with Family Tracker (this feature may be added in the future).

### Friends

OwnTracks' friend feature doesn't integrate with Family Tracker. Use the Family Tracker web interface to see family members.

## Battery Optimization

Tips for better battery life:
1. Use Significant Mode instead of Move Mode
2. Reduce update frequency
3. Set appropriate location accuracy
4. Enable adaptive tracking if available

## Alternative: Future Mobile App

Family Tracker is designed to work with a custom mobile app (coming soon) that will provide:
- Better integration
- Push notifications
- Family chat
- Location history
- And more features

The OwnTracks integration will continue to be supported alongside the custom app.

## Support

If you encounter issues:
1. Check the main README.md troubleshooting section
2. Verify server logs for errors
3. Test with the web interface location sharing
4. Open an issue on GitHub with details

## Example Configuration Summary

```
Mode: HTTP
URL: http://192.168.1.100:8080/api/owntracks
Authentication: ON
User ID: john@example.com
Password: (leave empty)
Device ID: johns-iphone
Tracker ID: JD

HTTP Headers:
Key: Authorization
Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace the Bearer token with your actual token from Local Storage.

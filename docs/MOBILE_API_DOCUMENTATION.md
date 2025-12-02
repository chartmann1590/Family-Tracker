# Family Tracker Mobile API Documentation

## Base URL
```
http://your-server:3000/api
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

Token expiry: 30 days

---

## API Endpoints

### 1. Authentication

#### Register New User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "is_admin": false,
    "family_id": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Email already registered or validation error
- `500` - Internal server error

---

#### Login
**POST** `/auth/login`

Authenticate and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "is_admin": false,
    "family_id": 2
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401` - Invalid credentials
- `400` - Validation error
- `500` - Internal server error

---

#### Get Current User
**GET** `/auth/me`

Get current authenticated user details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "is_admin": false,
    "family_id": 2
  }
}
```

**Errors:**
- `401` - Unauthorized (invalid or missing token)
- `500` - Internal server error

---

### 2. Family Management

#### Create Family
**POST** `/families`

Create a new family group. User must not already belong to a family.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "The Smiths"
}
```

**Response:** `201 Created`
```json
{
  "family": {
    "id": 2,
    "name": "The Smiths",
    "created_by": 1,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Errors:**
- `400` - User already belongs to a family
- `401` - Unauthorized
- `500` - Internal server error

---

#### Get My Family
**GET** `/families/me`

Get details of the family the user belongs to, including all members.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "family": {
    "id": 2,
    "name": "The Smiths",
    "created_by": 1,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "members": [
      {
        "id": 1,
        "email": "john@example.com",
        "name": "John Doe",
        "is_admin": false,
        "created_at": "2025-01-15T10:00:00Z"
      },
      {
        "id": 2,
        "email": "jane@example.com",
        "name": "Jane Doe",
        "is_admin": false,
        "created_at": "2025-01-15T10:15:00Z"
      }
    ]
  }
}
```

**Errors:**
- `404` - User does not belong to a family
- `401` - Unauthorized
- `500` - Internal server error

---

#### Update Family Name
**PATCH** `/families`

Update family name. Only family creator or admin can update.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "The Smith Family"
}
```

**Response:** `200 OK`
```json
{
  "family": {
    "id": 2,
    "name": "The Smith Family",
    "created_by": 1,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T11:00:00Z"
  }
}
```

**Errors:**
- `403` - Not authorized to update family
- `404` - User does not belong to a family
- `401` - Unauthorized
- `500` - Internal server error

---

#### Invite User to Family
**POST** `/families/invite`

Invite an existing user to join your family by email.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "newmember@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User added to family"
}
```

**Errors:**
- `400` - User does not belong to a family or invited user already has a family
- `404` - User with that email not found
- `401` - Unauthorized
- `500` - Internal server error

---

#### Leave Family
**POST** `/families/leave`

Leave current family group.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Left family successfully"
}
```

**Errors:**
- `400` - User does not belong to a family
- `401` - Unauthorized
- `500` - Internal server error

---

### 3. Location Tracking

#### Update Location
**POST** `/locations`

Update your current location. This will be broadcast to all family members via WebSocket.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 10.5,
  "altitude": 15.0,
  "battery": 75,
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**Fields:**
- `latitude` (required): Latitude (-90 to 90)
- `longitude` (required): Longitude (-180 to 180)
- `accuracy` (optional): Accuracy in meters
- `altitude` (optional): Altitude in meters
- `battery` (optional): Battery level (0-100)
- `timestamp` (optional): ISO timestamp (defaults to current time)

**Response:** `201 Created`
```json
{
  "success": true,
  "location": {
    "id": 123,
    "user_id": 1,
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10.5,
    "altitude": 15.0,
    "battery": 75,
    "timestamp": "2025-01-15T12:00:00Z",
    "created_at": "2025-01-15T12:00:01Z"
  }
}
```

**Errors:**
- `400` - Validation error
- `401` - Unauthorized
- `500` - Internal server error

---

#### Get Family Locations
**GET** `/locations/family`

Get the latest location for all family members.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "locations": [
    {
      "userId": 1,
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy": 10.5,
        "altitude": 15.0,
        "battery": 75,
        "timestamp": "2025-01-15T12:00:00Z"
      }
    },
    {
      "userId": 2,
      "userName": "Jane Doe",
      "userEmail": "jane@example.com",
      "location": {
        "latitude": 37.7750,
        "longitude": -122.4195,
        "accuracy": 12.0,
        "altitude": 14.0,
        "battery": 80,
        "timestamp": "2025-01-15T12:01:00Z"
      }
    }
  ]
}
```

**Errors:**
- `401` - Unauthorized
- `500` - Internal server error

---

#### Get Location History
**GET** `/locations/history/:userId?limit=100`

Get location history for a specific user. You can only access history for:
- Yourself
- Family members (if in same family)
- Any user (if you're an admin)

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of locations to return (default: 100)

**Response:** `200 OK`
```json
{
  "locations": [
    {
      "id": 123,
      "user_id": 1,
      "latitude": 37.7749,
      "longitude": -122.4194,
      "accuracy": 10.5,
      "altitude": 15.0,
      "battery": 75,
      "timestamp": "2025-01-15T12:00:00Z",
      "created_at": "2025-01-15T12:00:01Z"
    }
  ]
}
```

**Errors:**
- `403` - Access denied
- `404` - User not found
- `401` - Unauthorized
- `500` - Internal server error

---

### 4. Messaging

#### Send Message
**POST** `/messages`

Send a message to all family members. Message will be broadcast via WebSocket.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "message": "Hey everyone, I'm running late!"
}
```

**Response:** `201 Created`
```json
{
  "message": {
    "id": 45,
    "familyId": 2,
    "userId": 1,
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "message": "Hey everyone, I'm running late!",
    "createdAt": "2025-01-15T12:30:00Z"
  }
}
```

**Errors:**
- `400` - User does not belong to a family or validation error
- `401` - Unauthorized
- `500` - Internal server error

---

#### Get Messages
**GET** `/messages?limit=100&offset=0`

Get messages for your family with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 100)
- `offset` (optional): Number of messages to skip (default: 0)

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": 45,
      "familyId": 2,
      "userId": 1,
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "message": "Hey everyone, I'm running late!",
      "createdAt": "2025-01-15T12:30:00Z",
      "updatedAt": "2025-01-15T12:30:00Z"
    },
    {
      "id": 44,
      "familyId": 2,
      "userId": 2,
      "userName": "Jane Doe",
      "userEmail": "jane@example.com",
      "message": "No worries!",
      "createdAt": "2025-01-15T12:29:00Z",
      "updatedAt": "2025-01-15T12:29:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 45
  }
}
```

**Errors:**
- `401` - Unauthorized
- `500` - Internal server error

---

#### Delete Message
**DELETE** `/messages/:messageId`

Delete a message. Only the message sender or admin can delete.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

**Errors:**
- `403` - Access denied (not message owner or admin)
- `404` - Message not found
- `401` - Unauthorized
- `500` - Internal server error

---

### 5. WebSocket Real-time Updates

#### Connection
Connect to WebSocket for real-time updates:

```
ws://your-server:3000/ws?token=<your-jwt-token>
```

#### Message Types

**Connection Confirmation:**
```json
{
  "type": "connected",
  "message": "Connected to Family Tracker",
  "familyId": 2
}
```

**Location Update:**
```json
{
  "type": "location_update",
  "data": {
    "userId": 2,
    "userName": "Jane Doe",
    "location": {
      "latitude": 37.7750,
      "longitude": -122.4195,
      "accuracy": 12.0,
      "altitude": 14.0,
      "battery": 80,
      "timestamp": "2025-01-15T12:01:00Z"
    }
  }
}
```

**New Message:**
```json
{
  "type": "message",
  "data": {
    "id": 45,
    "familyId": 2,
    "userId": 1,
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "message": "Hey everyone, I'm running late!",
    "createdAt": "2025-01-15T12:30:00Z"
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

Or for validation errors:

```json
{
  "error": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Rate Limiting

API is rate-limited to 100 requests per 15 minutes per IP address.

If exceeded, you'll receive:
```
429 Too Many Requests
{
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Example Mobile App Flow

1. **Registration/Login:**
   - POST `/auth/register` or `/auth/login`
   - Store the returned `token` securely

2. **Create or Join Family:**
   - POST `/families` to create a family
   - Or wait to be invited via POST `/families/invite`
   - GET `/families/me` to check family status

3. **Connect WebSocket:**
   - Connect to `ws://server/ws?token=<token>`
   - Listen for real-time location and message updates

4. **Background Location Tracking:**
   - Periodically POST `/locations` with current location
   - Frequency: every 5-30 minutes depending on battery/accuracy needs

5. **View Family Map:**
   - GET `/locations/family` to show all members on map
   - Update map when WebSocket broadcasts location updates

6. **Messaging:**
   - GET `/messages` to load message history
   - POST `/messages` to send new message
   - Listen for new messages via WebSocket

---

## Best Practices for Mobile Apps

1. **Token Storage:** Store JWT token in secure storage (Keychain/Keystore)
2. **Background Location:** Use platform-specific background location services
3. **Battery Optimization:** Adjust location update frequency based on battery level
4. **WebSocket Reconnection:** Implement automatic reconnection with exponential backoff
5. **Offline Support:** Queue location updates when offline, sync when online
6. **Error Handling:** Gracefully handle network errors and API failures
7. **User Privacy:** Allow users to pause location sharing
8. **Permissions:** Request location permissions with clear explanation

---

## Health Check

**GET** `/health`

Check if the API server is running.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

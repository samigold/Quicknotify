# Webhook Controller - Database Integration Guide

## Overview

The webhook controller has been updated to use the **WebhookEndpoint** and **WebhookLog** models from the auth-service instead of mock storage. This provides production-ready database persistence.

## Model Integration

### Database Models Used

1. **WebhookEndpoint** (auth-service)
   - Stores webhook configurations
   - Fields: `id`, `url`, `secret`, `subscribedEvents`, `isEnabled`, `UserId`
   - UUID primary key
   - Has many WebhookLogs

2. **WebhookLog** (auth-service)
   - Stores delivery attempt history
   - Fields: `id`, `eventId`, `statusCode`, `requestPayload`, `responseBody`, `deliveryStatus`, `WebhookEndpointId`
   - Delivery statuses: SUCCESS, FAILED, PENDING

### Database Schema Relationships

```
User
 ├── hasMany WebhookEndpoint (UserId)
 │
 └── WebhookEndpoint
      ├── id (UUID)
      ├── url (string)
      ├── secret (encrypted string)
      ├── subscribedEvents (array of strings)
      ├── isEnabled (boolean)
      ├── UserId (foreign key)
      ├── createdAt (timestamp)
      ├── updatedAt (timestamp)
      │
      └── hasMany WebhookLog (WebhookEndpointId)
           ├── id (UUID)
           ├── eventId (string)
           ├── statusCode (integer)
           ├── requestPayload (JSON)
           ├── responseBody (text)
           ├── deliveryStatus (enum: SUCCESS, FAILED, PENDING)
           ├── WebhookEndpointId (foreign key)
           ├── createdAt (timestamp)
           └── updatedAt (timestamp)
```

## API Endpoints - Database Behavior

### 1. Register Webhook
**Endpoint:** `POST /api/webhooks`

**Request:**
```json
{
  "userId": "user-uuid",
  "url": "https://example.com/webhook",
  "events": ["delivery.completed", "delivery.failed"],
  "secret": "my-webhook-secret",
  "active": true
}
```

**Database Operation:**
- Creates new WebhookEndpoint record
- `UserId` set to provided userId
- `url` stored with URL validation
- `secret` encrypted and stored
- `subscribedEvents` array stored
- `isEnabled` boolean set

**Response:**
```json
{
  "message": "Webhook registered successfully",
  "webhook": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid",
    "url": "https://example.com/webhook",
    "events": ["delivery.completed", "delivery.failed"],
    "active": true,
    "createdAt": "2026-06-16T13:44:36.350Z",
    "updatedAt": "2026-06-16T13:44:36.350Z"
  }
}
```

### 2. Get All Webhooks
**Endpoint:** `GET /api/webhooks?userId=user-uuid`

**Database Operation:**
- Queries WebhookEndpoint table
- Filters by `UserId`
- Returns all matching records

**Response:**
```json
{
  "count": 2,
  "webhooks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-uuid",
      "url": "https://example.com/webhook1",
      "events": ["delivery.completed"],
      "active": true,
      "createdAt": "2026-06-16T13:44:36.350Z",
      "updatedAt": "2026-06-16T13:44:36.350Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "userId": "user-uuid",
      "url": "https://example.com/webhook2",
      "events": ["delivery.failed"],
      "active": true,
      "createdAt": "2026-06-16T13:44:36.350Z",
      "updatedAt": "2026-06-16T13:44:36.350Z"
    }
  ]
}
```

### 3. Get Specific Webhook
**Endpoint:** `GET /api/webhooks/{id}`

**Database Operation:**
- Finds WebhookEndpoint by primary key (UUID)
- Returns record if exists

### 4. Update Webhook
**Endpoint:** `PUT /api/webhooks/{id}`

**Request:**
```json
{
  "url": "https://example.com/webhook-updated",
  "events": ["delivery.completed"],
  "active": false
}
```

**Database Operation:**
- Finds WebhookEndpoint by id
- Updates specified fields
- Validates URL format and events
- Saves changes to database

### 5. Delete Webhook
**Endpoint:** `DELETE /api/webhooks/{id}`

**Database Operation:**
- Finds WebhookEndpoint by id
- Deletes record (cascades to WebhookLog)
- All related logs are also deleted (onDelete: CASCADE)

### 6. Get Webhook Logs
**Endpoint:** `GET /api/webhooks/{id}/logs?limit=50&offset=0`

**Database Operation:**
- Queries WebhookLog table
- Filters by `WebhookEndpointId`
- Applies pagination (limit, offset)
- Orders by createdAt DESC

**Response:**
```json
{
  "webhookId": "550e8400-e29b-41d4-a716-446655440000",
  "logs": [
    {
      "id": "log-uuid-1",
      "eventId": "event-123",
      "status": "SUCCESS",
      "statusCode": 200,
      "requestPayload": {
        "event": "delivery.completed",
        "data": { "notificationId": "notif-123" }
      },
      "responseBody": "{\"ok\": true}",
      "createdAt": "2026-06-16T13:44:36.350Z"
    },
    {
      "id": "log-uuid-2",
      "eventId": "event-124",
      "status": "FAILED",
      "statusCode": 500,
      "requestPayload": {
        "event": "delivery.failed",
        "data": { "notificationId": "notif-124" }
      },
      "responseBody": "Internal Server Error",
      "createdAt": "2026-06-16T13:44:35.350Z"
    }
  ],
  "limit": 50,
  "offset": 0,
  "total": 2
}
```

### 7. Get Webhook Statistics
**Endpoint:** `GET /api/webhooks/{id}/stats`

**Database Operation:**
- Queries all WebhookLog records for webhook
- Counts by deliveryStatus
- Calculates success rate percentage

**Response:**
```json
{
  "webhookId": "550e8400-e29b-41d4-a716-446655440000",
  "totalDeliveries": 100,
  "successfulDeliveries": 98,
  "failedDeliveries": 2,
  "pendingDeliveries": 0,
  "successRate": "98.00%",
  "url": "https://example.com/webhook",
  "active": true,
  "createdAt": "2026-06-16T13:44:36.350Z"
}
```

### 8. Test Webhook
**Endpoint:** `POST /api/webhooks/{id}/test`

**Database Operation:**
- Finds WebhookEndpoint by id
- Validates webhook exists
- Returns test payload info (does NOT create log yet)

**Response:**
```json
{
  "message": "Webhook test initiated - test payload would be sent to https://example.com/webhook",
  "webhookId": "550e8400-e29b-41d4-a716-446655440000",
  "testPayload": {
    "event": "webhook.test",
    "timestamp": "2026-06-16T13:44:36.350Z",
    "webhookId": "550e8400-e29b-41d4-a716-446655440000",
    "data": {
      "testMessage": "This is a test payload from QuickNotify",
      "testId": "test_1718529876350"
    }
  }
}
```

## Setup Instructions

### Step 1: Share Models Between Services

Option A: Import from auth-service (Current approach)
```javascript
const { WebhookEndpoint, WebhookLog } = require('../../auth-service/src/models');
```

Option B: Create shared models package (Recommended for production)
```
// Create: shared-models/models/index.js
module.exports = {
  WebhookEndpoint,
  WebhookLog,
  User
};

// In webhook-service
const { WebhookEndpoint, WebhookLog } = require('@quicknotify/shared-models');
```

### Step 2: Database Connection

The webhook-service should reuse the same database connection from auth-service.

**Update webhook-service .env:**
```env
# Database (same as auth-service)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quicknotify
DB_USER=postgres
DB_PASSWORD=postgres

# Or use DATABASE_URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/quicknotify
```

### Step 3: Initialize Models

In webhook-service/src/index.js:
```javascript
const { sequelize, WebhookEndpoint, WebhookLog } = require('./models');

// Or if using shared package
const { sequelize } = require('@quicknotify/shared-models');

// Sync database
await sequelize.sync({ alter: true });
```

## Validation Rules

### URL Validation
- Must be valid HTTPS URL (http://localhost allowed for dev)
- Format: `new URL(url)` validation
- Example valid: `https://api.example.com/webhooks`

### Event Validation
- Valid events: `delivery.completed`, `delivery.failed`, `notification.sent`
- Must be array with at least 1 item
- Invalid events rejected with 400 error

### Secret Validation
- Optional field
- If provided, stored encrypted in database
- Used for HMAC-SHA256 payload signing

### Active/Enable Validation
- Boolean field
- Controls whether webhook receives events
- Can be toggled without deleting webhook

## Error Handling

### 400 Bad Request
```json
{
  "message": "userId is required"
}
```

### 404 Not Found
```json
{
  "message": "Webhook not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Failed to register webhook"
}
```

## Performance Considerations

### Indexing
Recommended database indexes:
```sql
-- For fast user webhook lookup
CREATE INDEX idx_webhook_endpoint_user_id ON "WebhookEndpoints"("UserId");

-- For fast log lookup by webhook
CREATE INDEX idx_webhook_log_endpoint_id ON "WebhookLogs"("WebhookEndpointId");

-- For log timestamp searches
CREATE INDEX idx_webhook_log_created_at ON "WebhookLogs"("createdAt" DESC);
```

### Query Performance
- **getWebhooks**: O(n) where n = user's webhooks (indexed by UserId)
- **getWebhookLogs**: O(log n) with pagination (indexed by WebhookEndpointId)
- **getWebhookStats**: O(n) where n = webhook's logs (full scan for aggregation)

### Pagination
Always use limit/offset for log queries to avoid large result sets:
```
GET /api/webhooks/{id}/logs?limit=50&offset=0
```

## Security Considerations

### Secret Storage
- Secrets encrypted using auth-service encryption utility
- Never logged in plaintext
- Only returned to authorized users

### Authorization
- Users can only access their own webhooks
- Enforced by gateway auth middleware
- UserId must match request context

### Cascading Deletes
- Deleting webhook cascades to logs
- No orphaned logs in database
- Clean data management

## Data Migration

If migrating from mock storage to database:

```javascript
// Migration script
const mockWebhooks = [/* existing webhooks */];

for (const webhook of mockWebhooks) {
  await WebhookEndpoint.create({
    id: webhook.id, // Use UUID
    UserId: webhook.userId,
    url: webhook.url,
    secret: webhook.secret,
    subscribedEvents: webhook.events,
    isEnabled: webhook.active
  });
}
```

## Testing

### Unit Tests
Test with mocked Sequelize models:
```javascript
jest.mock('../models', () => ({
  WebhookEndpoint: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  }
}));
```

### Integration Tests
Test with real database (test database):
```javascript
beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
```

## Troubleshooting

### "Cannot find module" Error
- Verify relative path to auth-service models
- Check auth-service/src/models/index.js exists
- Ensure both services in same monorepo

### Foreign Key Constraint Error
- Verify UserId exists in User table
- Check WebhookEndpointId exists in WebhookEndpoint table
- Enable foreign key constraints

### Encryption Issues
- Verify encryption utility available
- Check secret field is TEXT (allows encrypted content)
- Use same encryption key across services

---

This integration provides a robust, production-ready webhook management system with full database persistence and audit logging.

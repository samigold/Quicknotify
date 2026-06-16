# Webhook Service Integration Guide

## Overview
The webhook-service has been integrated into the API Gateway to provide users with a complete webhook management experience through Swagger UI.

## Architecture

### Components

1. **webhook-service** (`webhook-service/src`)
   - New webhook management API endpoints
   - Controllers for CRUD operations
   - Routes with Swagger documentation
   - Event consumption and delivery (existing)
   - Job worker for retries (existing)

2. **API Gateway** (`gateway/src`)
   - Proxy middleware to webhook-service
   - Authentication enforcement (JWT/API Key)
   - Swagger documentation aggregation
   - Rate limiting

## Endpoint Structure

### Base URL
- Development: `http://localhost:3004/api/webhooks`
- Production: Via Gateway at `/api/webhooks`

### Available Endpoints

#### 1. Register Webhook
```
POST /api/webhooks
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "userId": "user123",
  "url": "https://api.example.com/webhooks",
  "events": ["delivery.completed", "delivery.failed"],
  "secret": "optional_secret_key",
  "active": true
}
```

**Response (201):**
```json
{
  "message": "Webhook registered successfully",
  "webhook": {
    "id": "webhook_1",
    "userId": "user123",
    "url": "https://api.example.com/webhooks",
    "events": ["delivery.completed", "delivery.failed"],
    "active": true,
    "createdAt": "2026-06-16T13:44:36.350Z",
    "deliveryStats": {
      "totalDeliveries": 0,
      "successfulDeliveries": 0,
      "failedDeliveries": 0
    }
  }
}
```

#### 2. List User Webhooks
```
GET /api/webhooks?userId=user123
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "count": 2,
  "webhooks": [
    { /* webhook object */ },
    { /* webhook object */ }
  ]
}
```

#### 3. Get Specific Webhook
```
GET /api/webhooks/{id}
Authorization: Bearer <JWT_TOKEN>
```

#### 4. Update Webhook
```
PUT /api/webhooks/{id}
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "url": "https://api.example.com/webhooks-v2",
  "events": ["delivery.completed"],
  "active": true
}
```

#### 5. Delete Webhook
```
DELETE /api/webhooks/{id}
Authorization: Bearer <JWT_TOKEN>
```

#### 6. Get Delivery Logs
```
GET /api/webhooks/{id}/logs?limit=50&offset=0
Authorization: Bearer <JWT_TOKEN>
```

#### 7. Get Webhook Statistics
```
GET /api/webhooks/{id}/stats
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "webhookId": "webhook_1",
  "totalDeliveries": 100,
  "successfulDeliveries": 98,
  "failedDeliveries": 2,
  "successRate": "98.00%"
}
```

#### 8. Test Webhook
```
POST /api/webhooks/{id}/test
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "message": "Webhook test initiated",
  "webhookId": "webhook_1",
  "testPayload": {
    "event": "webhook.test",
    "timestamp": "2026-06-16T13:44:36.350Z",
    "data": { "testMessage": "This is a test payload" }
  }
}
```

## Supported Events

Webhooks can be subscribed to the following events:

- `delivery.completed` - Email/SMS/Push delivered successfully
- `delivery.failed` - Delivery attempt failed
- `notification.sent` - Notification created and queued

## Security Features

### Authentication
All webhook endpoints are protected with:
- **JWT Bearer Token** (preferred for user-to-user access)
- **API Key** (via `x-api-key` header, for programmatic access)

### Payload Signing
Webhook payloads are signed using HMAC-SHA256:
- Signature included in `X-Webhook-Signature` header
- Secret key used: the `secret` provided at webhook registration
- Validation: `HMAC-SHA256(payload, secret)`

### Delivery Features
- **Retry Strategy**: Exponential backoff (up to 3 attempts)
- **Backoff Formula**: `5000ms * 2^attempt`
- **Rate Limiting**: 100 requests per 15 minutes per user
- **Timeout**: 30 seconds per delivery attempt

## Environment Variables

Add to your `.env` files:

### Gateway (`.env`)
```env
WEBHOOK_SERVICE_URL=http://webhook-service:3004
```

### Docker Compose (`docker-compose.yml`)
```yaml
services:
  webhook-service:
    environment:
      - PORT=3004
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - REDIS_URL=redis://redis:6379
```

## Accessing Webhook Endpoints via Swagger UI

1. Navigate to: `http://localhost:3000/api-docs`
2. Click **"Authorize"** and enter your JWT token
3. Scroll to **"Webhooks"** section
4. Try out any webhook operation

## Implementation Details

### New Files Created

1. **webhook-service/src/controllers/webhookController.js**
   - Handles all webhook CRUD operations
   - Mock storage (should be replaced with real database)

2. **webhook-service/src/routes/webhooks.js**
   - Defines all webhook endpoints
   - Includes comprehensive Swagger documentation

3. **gateway/src/index.js** (updated)
   - Added webhook proxy routes
   - Added Swagger documentation for webhooks

### Updated Files

1. **webhook-service/src/index.js**
   - Added webhook routes registration
   - Routes are now served alongside event consumer/delivery

## Webhook Payload Example

When a webhook is triggered, users receive:

```json
{
  "event": "delivery.completed",
  "timestamp": "2026-06-16T13:44:36.350Z",
  "data": {
    "notificationId": "notif_123",
    "channel": "EMAIL",
    "status": "DELIVERED",
    "recipient": "user@example.com"
  },
  "webhookId": "webhook_1",
  "attempt": 1,
  "signature": "sha256=abcd1234..."
}
```

## Testing Webhooks

### Using cURL

```bash
# Register a webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "url": "https://webhook.site/unique-id",
    "events": ["delivery.completed"],
    "secret": "my_secret"
  }'

# List webhooks
curl -X GET http://localhost:3000/api/webhooks?userId=user123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test webhook
curl -X POST http://localhost:3000/api/webhooks/{id}/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Swagger UI
1. Get JWT token via `/api/auth/login`
2. Click "Authorize" and paste token
3. Navigate to Webhooks section
4. Click "Try it out" on any endpoint

## Future Enhancements

1. **Database Integration**
   - Replace mock storage with MongoDB/PostgreSQL
   - Persist webhook configurations and logs

2. **Advanced Filtering**
   - Filter logs by status, date range, event type
   - Search and pagination

3. **Webhook Management UI**
   - Web dashboard for managing webhooks
   - Visual logs and delivery status

4. **Rate Limiting Per Webhook**
   - Custom rate limits per webhook
   - Throttling and backpressure handling

5. **Event Transformation**
   - Webhook payload templates
   - Custom field mapping

6. **Monitoring & Alerts**
   - Email alerts for failed deliveries
   - Integration with monitoring systems

## Troubleshooting

### Webhook Not Receiving Events
- Check that webhook is `active: true`
- Verify event subscription matches published events
- Check webhook endpoint logs for delivery attempts
- Ensure endpoint is publicly accessible (HTTPS required)

### "Unauthorized" Error
- Verify JWT token is valid and not expired
- Check that `Authorization: Bearer <token>` header is present
- For API Key auth, use `x-api-key` header

### Delivery Failures
- Check webhook endpoint is responding with 2xx status
- Verify endpoint can handle POST requests
- Check timeout settings (30 seconds max)
- Review webhook logs via `/api/webhooks/{id}/logs`

## Support

For issues or questions:
1. Check the Swagger documentation at `/api-docs`
2. Review webhook logs at `/api/webhooks/{id}/logs`
3. Test endpoint connectivity using `/api/webhooks/{id}/test`

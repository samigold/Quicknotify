# Quick Start: Webhook Integration with Gateway

## 🚀 5-Minute Setup

### Step 1: Verify Files Are Updated
```
✅ webhook-service/src/controllers/webhookController.js (NEW)
✅ webhook-service/src/routes/webhooks.js (NEW)
✅ webhook-service/src/index.js (UPDATED - routes added)
✅ gateway/src/index.js (UPDATED - proxy + docs)
✅ gateway/.env (UPDATED - WEBHOOK_SERVICE_URL)
```

### Step 2: Start Services
```bash
# From project root
docker-compose up -d

# Or without Docker
cd webhook-service && npm start &
cd ../gateway && npm start &
cd ../auth-service && npm start &
cd ../notification-service && npm start &
```

### Step 3: Access Swagger UI
```
Open browser: http://localhost:3000/api-docs
```

### Step 4: Authenticate
```
1. Click "Authorize" button
2. Select "BearerAuth"
3. Paste JWT token from login
4. Click "Authorize"
```

### Step 5: Try Webhook Endpoints
```
1. Click "Webhooks" section
2. POST /api/webhooks - "Try it out"
3. Enter test data
4. Click "Execute"
```

---

## 📚 Webhook Endpoints Cheat Sheet

### Register Webhook
```json
POST /api/webhooks
Authorization: Bearer <TOKEN>

{
  "userId": "user123",
  "url": "https://webhook.site/your-id",
  "events": ["delivery.completed"],
  "secret": "optional_secret"
}
```

### List Your Webhooks
```
GET /api/webhooks?userId=user123
Authorization: Bearer <TOKEN>
```

### Get Webhook Details
```
GET /api/webhooks/{id}
Authorization: Bearer <TOKEN>
```

### Update Webhook
```json
PUT /api/webhooks/{id}
Authorization: Bearer <TOKEN>

{
  "url": "https://new-endpoint.com",
  "active": true
}
```

### Delete Webhook
```
DELETE /api/webhooks/{id}
Authorization: Bearer <TOKEN>
```

### View Delivery Logs
```
GET /api/webhooks/{id}/logs?limit=50&offset=0
Authorization: Bearer <TOKEN>
```

### Get Statistics
```
GET /api/webhooks/{id}/stats
Authorization: Bearer <TOKEN>

Returns:
{
  "webhookId": "webhook_1",
  "totalDeliveries": 100,
  "successfulDeliveries": 98,
  "failedDeliveries": 2,
  "successRate": "98.00%"
}
```

### Test Webhook
```
POST /api/webhooks/{id}/test
Authorization: Bearer <TOKEN>

Sends test payload to webhook URL
```

---

## 🔐 Authentication

### Option 1: JWT Token (Recommended)
```bash
curl -H "Authorization: Bearer eyJhbGci..." http://localhost:3000/api/webhooks
```

### Option 2: API Key
```bash
curl -H "x-api-key: sk_live_..." http://localhost:3000/api/webhooks
```

---

## 🧪 Testing Examples

### PowerShell
```powershell
# Get token
$token = (Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
  -Method POST -Body (@{email="test@example.com"; password="pass"} | ConvertTo-Json) `
  -Headers @{"Content-Type"="application/json"}).token

# Register webhook
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body (@{
    userId="user123"
    url="https://webhook.site/unique-id"
    events=@("delivery.completed")
  } | ConvertTo-Json)

$response | ConvertTo-Json
```

### Bash/cURL
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}' \
  | jq -r '.token')

# Register webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "url": "https://webhook.site/unique-id",
    "events": ["delivery.completed"]
  }'
```

---

## 📊 Webhook Event Types

Your webhooks can subscribe to:

| Event | Trigger | Payload |
|-------|---------|---------|
| `delivery.completed` | Email/SMS/Push delivered | `{notificationId, channel, status, recipient}` |
| `delivery.failed` | Delivery failed | `{notificationId, channel, error}` |
| `notification.sent` | Notification created | `{notificationId, type, recipient}` |

---

## 🎯 Real-World Example

### Scenario: Send Email When Notification Delivered

**Step 1: Register webhook**
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "business123",
    "url": "https://api.business.com/webhooks/delivery",
    "events": ["delivery.completed"],
    "secret": "webhook_secret_key"
  }'
```

**Step 2: Your application receives webhook**
```json
{
  "event": "delivery.completed",
  "timestamp": "2026-06-16T13:44:36.350Z",
  "data": {
    "notificationId": "notif_123",
    "channel": "EMAIL",
    "status": "DELIVERED",
    "recipient": "customer@business.com"
  },
  "webhookId": "webhook_1",
  "signature": "sha256=abc123..."
}
```

**Step 3: Verify signature and process**
```javascript
// Verify HMAC signature
const crypto = require('crypto');
const signature = req.headers['x-webhook-signature'];
const body = JSON.stringify(req.body);
const computed = 'sha256=' + crypto
  .createHmac('sha256', 'webhook_secret_key')
  .update(body)
  .digest('hex');

if (computed === signature) {
  // Signature valid, process webhook
  console.log('Notification delivered:', req.body.data);
}
```

---

## 📖 Documentation Links

- **Full Integration Guide**: `WEBHOOK_SERVICE_INTEGRATION.md`
- **Testing Guide**: `WEBHOOK_GATEWAY_TEST.md`
- **Integration Summary**: `WEBHOOK_GATEWAY_INTEGRATION_SUMMARY.md`
- **Swagger UI**: http://localhost:3000/api-docs

---

## ✨ Key Features

✅ Easy webhook registration and management
✅ Real-time event delivery with retries
✅ Secure payload signing (HMAC-SHA256)
✅ Delivery logs and statistics
✅ Webhook testing endpoint
✅ Full API documentation
✅ Production-ready error handling
✅ Exponential backoff retry strategy

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unauthorized" error | Check JWT token is valid and not expired |
| Webhooks not in Swagger | Refresh browser (Ctrl+Shift+R) |
| Can't reach webhook service | Check `WEBHOOK_SERVICE_URL` in gateway/.env |
| Webhook not receiving events | Verify webhook is `active: true` and URL is public |
| CORS error | Should not occur - gateway has `changeOrigin: true` |

---

## 🔗 Integration Architecture

```
┌─────────────────┐
│   Your Client   │
└────────┬────────┘
         │
         │ Requests: Register/manage webhooks
         │ Response: Webhook configs & stats
         │
         ▼
┌─────────────────────────────┐
│      API Gateway :3000      │
│  ├─ POST   /api/webhooks    │
│  ├─ GET    /api/webhooks    │
│  ├─ PUT    /api/webhooks/{} │
│  ├─ DELETE /api/webhooks/{} │
│  ├─ GET    /api/webhooks/{}/logs │
│  ├─ GET    /api/webhooks/{}/stats │
│  └─ POST   /api/webhooks/{}/test │
└────────┬────────────────────┘
         │ (proxy)
         ▼
┌─────────────────────────────┐
│   Webhook Service :3004     │
│  ├─ Webhook CRUD            │
│  ├─ Event Consumer (AMQP)   │
│  ├─ Job Worker (Redis)      │
│  └─ Delivery Service        │
└─────────────────────────────┘

And when events occur:

Delivery Service ─→ RabbitMQ ─→ Event Consumer
                                      ↓
                              Job Worker (Redis Queue)
                                      ↓
                              Webhook Delivery Service
                                      ↓
                              User's Webhook Endpoint
```

---

## 🎓 Learning Path

1. **Understand**: Read `WEBHOOK_SERVICE_INTEGRATION.md`
2. **Try It**: Access Swagger UI and test endpoints
3. **Test**: Use PowerShell script in `WEBHOOK_GATEWAY_TEST.md`
4. **Implement**: Build your webhook consumer
5. **Monitor**: Use `/logs` and `/stats` endpoints
6. **Optimize**: Adjust retry strategy and timeout

---

## 📞 Support

- Check Swagger documentation: `/api-docs`
- Review webhook logs: `GET /api/webhooks/{id}/logs`
- Test connectivity: `POST /api/webhooks/{id}/test`
- Check service health: `GET /api/webhooks/health`

**Happy webhook integration! 🚀**

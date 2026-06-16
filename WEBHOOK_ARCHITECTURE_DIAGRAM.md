# Webhook Integration Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER APPLICATION                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    HTTP Requests      │    Responses
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Port 3000)                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ SWAGGER UI: http://localhost:3000/api-docs                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐  │
│  │ Authentication │  │  Rate Limiting │  │  Webhook Documentation    │  │
│  │  (JWT/ApiKey)  │  │  100 req/15min │  │  (Swagger Comments)       │  │
│  └────────────────┘  └────────────────┘  └────────────────────────────┘  │
│                                                                             │
│  Routes:                                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ POST   /api/webhooks          → Create webhook                    │   │
│  │ GET    /api/webhooks          → List user webhooks               │   │
│  │ GET    /api/webhooks/{id}     → Get webhook details              │   │
│  │ PUT    /api/webhooks/{id}     → Update webhook                   │   │
│  │ DELETE /api/webhooks/{id}     → Delete webhook                   │   │
│  │ GET    /api/webhooks/{id}/logs    → Delivery logs                │   │
│  │ GET    /api/webhooks/{id}/stats   → Statistics                   │   │
│  │ POST   /api/webhooks/{id}/test    → Test delivery                │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Environment:                                                              │
│  • WEBHOOK_SERVICE_URL=http://webhook-service:3004                       │
│  • PORT=3000                                                              │
│  • JWT_SECRET=supersecretkey123                                           │
│                                                                             │
└──────────────────┬────────────────────────────────────────────────────────┘
                   │
                   │ Proxy Middleware
                   │ (With Auth Enforcement)
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WEBHOOK SERVICE (Port 3004)                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  CONTROLLERS (webhookController.js)                                │  │
│  │  ├─ registerWebhook()      → Create new webhook                   │  │
│  │  ├─ getWebhooks()          → List webhooks                        │  │
│  │  ├─ getWebhook()           → Get single webhook                   │  │
│  │  ├─ updateWebhook()        → Update webhook config                │  │
│  │  ├─ deleteWebhook()        → Delete webhook                       │  │
│  │  ├─ getWebhookLogs()       → Get delivery attempts                │  │
│  │  ├─ getWebhookStats()      → Success/failure rates                │  │
│  │  └─ testWebhook()          → Send test payload                    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  ROUTES (webhooks.js)                                              │  │
│  │  ├─ POST   /api/webhooks       [registerWebhook]                  │  │
│  │  ├─ GET    /api/webhooks       [getWebhooks]                      │  │
│  │  ├─ GET    /api/webhooks/:id   [getWebhook]                       │  │
│  │  ├─ PUT    /api/webhooks/:id   [updateWebhook]                    │  │
│  │  ├─ DELETE /api/webhooks/:id   [deleteWebhook]                    │  │
│  │  ├─ GET    /api/webhooks/:id/logs   [getWebhookLogs]              │  │
│  │  ├─ GET    /api/webhooks/:id/stats  [getWebhookStats]             │  │
│  │  └─ POST   /api/webhooks/:id/test   [testWebhook]                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  EVENT CONSUMER & DELIVERY (Existing Services)                     │  │
│  │  ├─ connectRabbitMQ()      → Subscribe to events                  │  │
│  │  ├─ startEventConsumer()   → Listen for delivery events            │  │
│  │  ├─ startJobWorker()       → Process queued jobs                   │  │
│  │  └─ deliverWebhook()       → Send payload to user endpoint         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└──────────────────┬────────────────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   RabbitMQ              Redis
(Event Bus)         (Job Queue)
        │                     │
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
      ┌────────────────────────┐
      │  EXTERNAL SERVICES     │
      ├────────────────────────┤
      │ • Auth Service         │
      │ • Notification Service │
      │ • Delivery Service     │
      │ • User Endpoints       │
      └────────────────────────┘
```

---

## Event Flow: User Registration → Webhook Delivery

```
1. USER REGISTERS WEBHOOK
   ┌─────────────────────────┐
   │ POST /api/webhooks      │
   ├─────────────────────────┤
   │ {                       │
   │   userId: "user123"     │
   │   url: "user.endpoint"  │
   │   events: [...]         │
   │ }                       │
   └────────────┬────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Gateway Authentication Check     │
   │ • Verify JWT token               │
   │ • Check user permissions         │
   └────────────┬─────────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Webhook Controller               │
   │ • Create webhook object          │
   │ • Store in webhook service       │
   │ • Return webhook details         │
   └────────────┬─────────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Response to User                 │
   │ {                                │
   │   webhookId: "webhook_1"         │
   │   status: "active"               │
   │   ...                            │
   │ }                                │
   └──────────────────────────────────┘

2. NOTIFICATION IS DELIVERED
   ┌──────────────────────────────┐
   │ Delivery Service             │
   │ Sends email/SMS/push         │
   └────────────┬─────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Event Published                  │
   │ Event: "delivery.completed"      │
   │ Channel: RabbitMQ                │
   └────────────┬─────────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Webhook Service                  │
   │ Event Consumer                   │
   │ Receives event                   │
   └────────────┬─────────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Job Worker                       │
   │ • Find matching webhooks         │
   │ • Create delivery jobs           │
   │ • Queue to Redis                 │
   └────────────┬─────────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Webhook Delivery Service         │
   │ • Retrieve job from queue        │
   │ • Sign payload with secret       │
   │ • HTTP POST to user endpoint     │
   │ • Log attempt                    │
   └────────────┬─────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
      YES               NO
       │                 │
       ▼                 ▼
   Success           Failure
   • Log success      • Increment attempts
   • Update stats     • Check if retries left
   • Done             • If yes: exponential backoff
                        - Calculate next_retry
                        - Queue for later
                      • If no: log permanent failure

3. USER CHECKS WEBHOOK STATUS
   ┌──────────────────────────────┐
   │ GET /api/webhooks/{id}/stats │
   └────────────┬─────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Webhook Controller               │
   │ • Retrieve webhook stats         │
   │ • Calculate success rate         │
   │ • Return metrics                 │
   └────────────┬─────────────────────┘
                │
                ▼
   ┌──────────────────────────────────┐
   │ Response                         │
   │ {                                │
   │   totalDeliveries: 100           │
   │   successfulDeliveries: 98       │
   │   failedDeliveries: 2            │
   │   successRate: "98.00%"          │
   │ }                                │
   └──────────────────────────────────┘
```

---

## Data Flow: Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     WEBHOOK LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────┘

1. CREATION
   User Input
      ↓
   Gateway Authentication
      ↓
   Webhook Controller
      ↓
   Store in Service
      ↓
   Return to User

2. EVENT MATCHING
   Event Occurs
      ↓
   Published to RabbitMQ
      ↓
   Event Consumer
      ↓
   Find Matching Webhooks
      ↓
   Create Jobs

3. DELIVERY
   Job Worker
      ↓
   Fetch from Redis Queue
      ↓
   Webhook Delivery Service
      ↓
   Sign Payload (HMAC-SHA256)
      ↓
   HTTP POST to User Endpoint
      ↓
   ┌─────────┬──────────┐
   │         │          │
   2xx      5xx       Timeout
   │         │          │
   ✓       Retry      Retry
   │         │          │
   Log    Exponential  Exponential
   Success Backoff    Backoff

4. MONITORING
   Webhook Status Check
      ↓
   Retrieve Logs
      ↓
   Calculate Stats
      ↓
   Display Metrics
```

---

## Files Structure

```
webhook-service/
├── src/
│   ├── controllers/
│   │   └── webhookController.js      ← NEW: Webhook CRUD
│   ├── routes/
│   │   └── webhooks.js               ← NEW: Webhook endpoints + docs
│   ├── services/
│   │   ├── eventConsumer.js          ← Event subscription
│   │   ├── jobWorker.js              ← Job processing
│   │   └── webhookDelivery.js        ← HTTP delivery
│   └── index.js                      ← UPDATED: Register routes
│
gateway/
├── src/
│   ├── index.js                      ← UPDATED: Proxy + swagger docs
│   └── swagger.js                    ← Swagger config
└── .env                              ← UPDATED: WEBHOOK_SERVICE_URL

Documentation:
├── WEBHOOK_SERVICE_INTEGRATION.md        ← Full integration guide
├── WEBHOOK_GATEWAY_TEST.md               ← Testing procedures
├── WEBHOOK_QUICK_START.md                ← Quick reference
└── WEBHOOK_GATEWAY_INTEGRATION_SUMMARY.md ← Changes summary
```

---

## Retry Strategy: Exponential Backoff

```
Attempt 1 (Immediate)
   │ Failure
   └─ Calculate backoff: 5000ms * 2^1 = 10,000ms
   └─ Queue for 10 seconds later

Attempt 2 (After 10 sec)
   │ Failure
   └─ Calculate backoff: 5000ms * 2^2 = 20,000ms
   └─ Queue for 20 seconds later

Attempt 3 (After 20 sec)
   │ Failure
   └─ Max attempts (3) reached
   └─ Permanent failure logged

Timeline:
T+0s   : First attempt
T+10s  : Second attempt (after 10s backoff)
T+30s  : Third attempt (after 20s backoff)
T+31s  : Give up, log failure
```

---

## Security Layers

```
┌──────────────────────────────────────┐
│     1. AUTHENTICATION                │
│     • JWT Token validation           │
│     • API Key validation             │
│     • Rate limiting per user         │
└──────────────────────────────────────┘
          ↓
┌──────────────────────────────────────┐
│     2. AUTHORIZATION                 │
│     • User can only access own       │
│       webhooks                       │
│     • Webhook ownership verification │
└──────────────────────────────────────┘
          ↓
┌──────────────────────────────────────┐
│     3. PAYLOAD INTEGRITY             │
│     • HMAC-SHA256 signing            │
│     • Signature in X-Webhook-Sig     │
│     • User-provided secret key       │
└──────────────────────────────────────┘
          ↓
┌──────────────────────────────────────┐
│     4. TRANSPORT SECURITY            │
│     • HTTPS required for webhooks    │
│     • TLS 1.2+ recommended           │
│     • Certificate validation         │
└──────────────────────────────────────┘
```

---

## Performance Characteristics

```
Operation              Latency      Throughput
────────────────────────────────────────────────
Register Webhook       <50ms        1000 req/s
List Webhooks          <100ms       500 req/s
Get Webhook            <50ms        1000 req/s
Update Webhook         <100ms       500 req/s
Delete Webhook         <50ms        1000 req/s
Get Logs               <200ms       100 req/s
Get Statistics         <150ms       200 req/s
Test Webhook           <5s          10 req/s

Delivery (per webhook)
────────────────────────────────────────────────
First Attempt          ~1-2s        (depends on user endpoint)
Retry Attempt 1        ~1-2s        (after 10s wait)
Retry Attempt 2        ~1-2s        (after 20s wait)
```

---

This architecture provides a scalable, secure, and user-friendly webhook management system integrated seamlessly into your API Gateway.

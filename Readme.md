# QuickNotify

> **A multi-channel notification infrastructure platform — send email, SMS, and in-app notifications through a single REST API.**

[![CI/CD Pipeline](https://github.com/samigold/Quicknotify/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/samigold/Quicknotify/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is QuickNotify?

QuickNotify is a backend notification service that your application calls via REST API whenever it needs to notify a user. It handles the queuing, processing, and logging of notifications across multiple channels — so your application doesn't have to.

Think of it like a simplified version of **SendGrid** or **Twilio Notify** — your app sends one API request, QuickNotify takes care of the rest asynchronously.

**QuickNotify is not:**
- A frontend component or UI library
- A replacement for your app's own authentication system
- A database for your app's data
- An embedded library or SDK (yet)

**QuickNotify is:**
- A standalone backend service your app calls via HTTP
- An asynchronous notification queue built on RabbitMQ
- A delivery log that tracks every notification attempt
- A scalable microservices system you can self-host or use as a cloud API

---

## The Problem It Solves

Every application eventually needs to notify its users:

- "Your order has been placed" → email
- "Your OTP is 4521" → SMS
- "Someone liked your post" → in-app

Building this from scratch means:

- Setting up SMTP servers or third-party email providers
- Integrating SMS gateways (Twilio, Termii, etc.)
- Managing delivery queues so notifications don't block your main API
- Handling retries when delivery fails
- Logging delivery results for debugging
- Scaling notification delivery independently from your core app

Most teams either bolt this onto their existing backend (creating tight coupling and slow APIs) or spend weeks building a dedicated service. QuickNotify provides that dedicated service, ready to integrate.

---

## How Integration Works

QuickNotify runs as a **separate backend service**. Your application calls its API whenever it needs to send a notification. Your app keeps its own database, its own auth system, and its own logic — QuickNotify only handles notification delivery.

### The Integration Model

```
Your Application Backend
        │
        │  POST /api/notifications
        │  Authorization: Bearer <QuickNotify token>
        │  { type, recipient, subject, message }
        ▼
   QuickNotify API
        │
        ├── Saves notification to MongoDB (status: pending)
        ├── Publishes event to RabbitMQ
        └── Returns immediate response to your app
                          │
                          ▼
                   RabbitMQ Queue
                          │
                          ▼
                 Delivery Service (Java)
                          │
                          ├── Processes the notification
                          ├── Sends via configured channel
                          └── Logs result to MongoDB (status: delivered/failed)
```

### Real Integration Example

Say you're building a **Todo App** and want to email users when a new todo is created.

**Your todo app's backend (Node.js example):**

```js
// todoController.js — in YOUR app, not QuickNotify
const createTodo = async (req, res) => {
  // 1. Save todo to YOUR OWN database
  const todo = await TodoDB.create({
    title: req.body.title,
    userId: req.user.id
  });

  // 2. Call QuickNotify to notify the user
  try {
    await fetch(`${process.env.QUICKNOTIFY_URL}/api/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.QUICKNOTIFY_TOKEN}`
      },
      body: JSON.stringify({
        type: "email",
        recipient: req.user.email,
        subject: "Todo Created",
        message: `Your todo "${todo.title}" was created successfully.`
      })
    });
  } catch (err) {
    // Notification failure should never break your core feature
    console.error("QuickNotify error:", err.message);
  }

  // 3. Respond to your user immediately
  res.status(201).json(todo);
};
```

**Your todo app's environment variables:**
```env
QUICKNOTIFY_URL=https://tender-youthfulness-production-6712.up.railway.app
QUICKNOTIFY_TOKEN=eyJhbGci...  # obtained by registering on QuickNotify
```

**What stays in your app:**
- Your users database
- Your todos database
- Your own JWT/session auth
- Your own business logic

**What QuickNotify handles:**
- Notification queuing
- Asynchronous delivery
- Delivery logging
- Channel routing (email vs SMS vs in-app)

### Auth Is Separate

QuickNotify has its own internal authentication — you register once to get a token, store that token in your app's environment variables, and use it for all API calls. It is **not** a replacement for your app's own user authentication.

```
Your App's Auth          QuickNotify's Auth
────────────────         ──────────────────
Your users log in  →     You (the developer) registered once
Your JWT           ≠     QuickNotify token (used server-side only)
Your user sessions       Your app's backend stores this token
                         and uses it to call QuickNotify
```

---

## Email Delivery System

QuickNotify includes a **production-ready email delivery system** using SMTP. Emails are processed asynchronously via RabbitMQ for reliability and scalability.

### Configuration

Set these environment variables in `delivery-service/.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password, not account password
SMTP_FROM=noreply@yourapp.com
SMTP_FROM_NAME=YourApp Notifications

# Database & Services (existing)
DATABASE_URL=jdbc:postgresql://localhost:5432/delivery_service
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
RABBITMQ_HOST=localhost
```

### Using Gmail with App Password

1. Enable **2-Step Verification** on your Google Account.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Select **Mail** and **Windows (or your OS)**.
4. Copy the generated 16-character password.
5. Use this password as `SMTP_PASSWORD` in `.env`.

### How It Works

1. **User sends notification** → Notification Service saves to MongoDB with status `pending`.
2. **Event published to RabbitMQ** → Message contains notification details.
3. **Delivery Service consumes message** → Fetches notification from Notification Service API.
4. **Email sent via SMTP** → Real email delivered to recipient.
5. **Status updated** → Notification status changes to `sent` or `failed`.

### Notification Flow

```
POST /api/notifications
  ↓
Notification Service (MongoDB)
  ↓
RabbitMQ Topic Exchange
  ↓
Delivery Service Consumer
  ↓
SMTP Server
  ↓
Recipient Email Inbox
```

### Testing Email Delivery Locally

Use the provided PowerShell script to test the full flow:

```powershell
.\test-apikey.ps1
```

This script:
1. Registers a new user
2. Logs in
3. Generates an API key
4. Sends a notification with email type
5. Polls delivery status
6. Verifies the email was queued for delivery

Check delivery-service logs to confirm SMTP delivery:

```
2026-06-01 14:32:18 INFO: Processing notification from queue
2026-06-01 14:32:19 INFO: Sending email to enduser@example.com
2026-06-01 14:32:21 INFO: Email sent successfully
```

---

## Architecture

QuickNotify is built as four independent microservices:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT / YOUR APP                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY  (Port 3000)                  │
│            Rate Limiting · JWT Verification                 │
│                  Routing · Swagger UI                       │
└──────────────────┬──────────────────────┬───────────────────┘
                   │                      │
                   ▼                      ▼
┌─────────────────────────┐  ┌────────────────────────────────┐
│     AUTH SERVICE        │  │     NOTIFICATION SERVICE       │
│     (Port 3001)         │  │     (Port 3002)                │
│                         │  │                                │
│  Register · Login       │  │  Create · Retrieve             │
│  JWT Issuance           │  │  Publish to RabbitMQ           │
│                         │  │                                │
│  ┌─────────────────┐    │  │  ┌──────────────────────────┐  │
│  │   PostgreSQL    │    │  │  │        MongoDB           │  │
│  └─────────────────┘    │  │  └──────────────────────────┘  │
└─────────────────────────┘  └──────────────────┬─────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │       RABBITMQ        │
                                    │  notification.created │
                                    │     (durable queue)   │
                                    └──────────┬────────────┘
                                               │
                                               ▼
                                ┌──────────────────────────────┐
                                │      DELIVERY SERVICE        │
                                │   (Port 8080 · Java)         │
                                │                              │
                                │  @RabbitListener             │
                                │  Process · Log               │
                                │                              │
                                │  ┌────────────────────────┐  │
                                │  │  MongoDB               │  │
                                │  │  (delivery_logs)       │  │
                                │  └────────────────────────┘  │
                                └──────────────────────────────┘
```

### Services

| Service | Language | Responsibility |
|---|---|---|
| API Gateway | Node.js/Express | Single entry point, rate limiting, JWT verification, request routing |
| Auth Service | Node.js/Express | User registration, login, JWT token generation |
| Notification Service | Node.js/Express | Accepts notification requests, stores in MongoDB, publishes to RabbitMQ |
| Delivery Service | Java/Spring Boot | Consumes RabbitMQ messages, processes delivery, logs results |

### Why This Architecture?

**Each service is independent** — they can be deployed, scaled, and updated without touching each other.

**Asynchronous by design** — your app gets an instant response when creating a notification. Actual delivery happens in the background via RabbitMQ. This means:
- Your API never slows down waiting for email servers
- Failed deliveries can be retried without affecting your app
- Delivery Service can be scaled independently during high load

**Polyglot persistence** — each service owns its own database:
- PostgreSQL for structured user data (Auth Service)
- MongoDB for flexible notification documents (Notification + Delivery Service)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| API Gateway | Node.js, Express.js | v22, 5.x |
| Auth Service | Node.js, Express.js, Sequelize, bcryptjs | v22, 5.x |
| Notification Service | Node.js, Express.js, Mongoose, amqplib | v22, 5.x |
| Delivery Service | Java, Spring Boot, Spring AMQP | Java 21, Spring 4.x |
| Message Broker | RabbitMQ | 3.x |
| Databases | PostgreSQL, MongoDB | 15, 6 |
| Monitoring | Prometheus, Grafana, prom-client, Micrometer | Latest |
| Testing | Jest, Supertest, JUnit | 30.x, 4.x |
| CI/CD | GitHub Actions | — |
| Deployment | Railway, Render, MongoDB Atlas, CloudAMQP | — |
| Containerization | Docker, Docker Compose | — |
| Documentation | Swagger/OpenAPI 3.0 | — |

---

## Live Demo

| Service | URL |
|---|---|
| 🌐 API Gateway | https://tender-youthfulness-production-6712.up.railway.app |
| 📖 API Documentation | https://tender-youthfulness-production-6712.up.railway.app/api-docs |
| 🔐 Auth Service | https://quicknotify-production.up.railway.app |
| 🔔 Notification Service | https://industrious-truth-production-d70a.up.railway.app |
| 📦 Delivery Service | https://quicknotify.onrender.com |

> **Note:** The Delivery Service is hosted on Render's free tier and may take 30-60 seconds to wake up after inactivity.

---

## API Reference

All requests go through the **API Gateway**. Auth endpoints are public. Notification endpoints require a valid Bearer token or API key.

### Authentication Methods

QuickNotify supports **two authentication methods** for protected endpoints:

#### 1. JWT Bearer Token (Short-lived, session-based)
```http
Authorization: Bearer eyJhbGci...
```
Obtained by logging in. Expires in 24 hours. Suitable for interactive user sessions.

#### 2. API Key (Long-lived, static)
```http
Authorization: ApiKey sk_live_1a2b3c4d5e6f7g8h9i0j
```
Generated once, never expires. Suitable for server-to-server communication. Recommended for production integrations.

---

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "developer@yourapp.com",
  "password": "YourPassword123"
}
```

**Response `201`:**
```json
{
  "message": "User registered",
  "userId": "uuid-here"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "developer@yourapp.com",
  "password": "YourPassword123"
}
```

**Response `200`:**
```json
{
  "token": "eyJhbGci...",
  "userId": "uuid-here",
  "role": "user"
}
```

> Store this token in your app's environment variables. It expires in 24 hours.

---

### API Key Management

#### Generate API Key

```http
POST /api/auth/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production Server"
}
```

**Response `201`:**
```json
{
  "message": "API key generated",
  "apiKey": {
    "id": "key_uuid_here",
    "name": "Production Server",
    "key": "sk_live_1a2b3c4d5e6f7g8h9i0j",
    "createdAt": "2026-06-01T10:00:00.000Z"
  }
}
```

> **Important:** The `key` is only shown once at creation. Store it securely. It will never be displayed again.

#### Get API Key Info

```http
GET /api/auth/api-keys/<key_id>
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "message": "API key found",
  "apiKey": {
    "id": "key_uuid_here",
    "name": "Production Server",
    "createdAt": "2026-06-01T10:00:00.000Z",
    "lastUsed": "2026-06-01T12:30:15.000Z",
    "status": "active"
  }
}
```

#### Revoke API Key

```http
DELETE /api/auth/api-keys/<key_id>
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "message": "API key revoked"
}
```

---

### Send a Notification

#### Using JWT Bearer Token

```http
POST /api/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "email",
  "recipient": "enduser@example.com",
  "subject": "Your order is confirmed",
  "message": "Order #1234 has been placed successfully."
}
```

#### Using API Key

```http
POST /api/notifications
Authorization: ApiKey sk_live_1a2b3c4d5e6f7g8h9i0j
Content-Type: application/json

{
  "type": "email",
  "recipient": "enduser@example.com",
  "subject": "Your order is confirmed",
  "message": "Order #1234 has been placed successfully."
}
```

**Supported `type` values:** `email` · `sms` · `in-app`

**Response `201`:**
```json
{
  "message": "Notification queued",
  "notification": {
    "_id": "6a090aa3bdb6978bb9468e4a",
    "userId": "uuid-here",
    "type": "email",
    "recipient": "enduser@example.com",
    "subject": "Your order is confirmed",
    "message": "Order #1234 has been placed successfully.",
    "status": "pending",
    "createdAt": "2026-06-01T00:24:03.463Z"
  }
}
```

The `status: "pending"` means the notification has been queued. The Delivery Service processes it asynchronously.

### Get Notifications

```http
GET /api/notifications
Authorization: Bearer <token>
```

Or with API Key:

```http
GET /api/notifications
Authorization: ApiKey sk_live_1a2b3c4d5e6f7g8h9i0j
```

**Response `200`:**
```json
[
  {
    "_id": "...",
    "type": "email",
    "recipient": "...",
    "status": "pending",
    "createdAt": "..."
  }
]
```

---

## Running Locally

### Prerequisites

- Node.js v22+
- Java 21+
- Maven 3.9+
- Docker Desktop

### 1. Clone the repo

```bash
git clone https://github.com/samigold/Quicknotify.git
cd Quicknotify
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL, MongoDB, RabbitMQ, Prometheus, and Grafana locally.

### 3. Configure environment variables

Create `.env` files for each service:

**`gateway/.env`**
```env
PORT=3000
JWT_SECRET=supersecretkey123
AUTH_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3002
```

**`auth-service/.env`**
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=auth_db
JWT_SECRET=supersecretkey123
```

**`notification-service/.env`**
```env
PORT=3002
MONGO_URI=mongodb://mongo:mongo123@localhost:27017/notification_db?authSource=admin
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
JWT_SECRET=supersecretkey123
```

### 4. Start the services

Open 4 terminals:

```bash
# Terminal 1 — Gateway
cd gateway && npm install && npm run dev

# Terminal 2 — Auth Service
cd auth-service && npm install && npm run dev

# Terminal 3 — Notification Service
cd notification-service && npm install && npm run dev

# Terminal 4 — Delivery Service (Java)
cd delivery-service && mvn spring-boot:run
```

### 5. Verify everything is running

```bash
curl http://localhost:3000/health   # Gateway
curl http://localhost:3001/health   # Auth Service
curl http://localhost:3002/health   # Notification Service
curl http://localhost:8080/health   # Delivery Service
```

All should return a JSON status response.

---

## Running Tests

```bash
# Auth Service — 6 unit tests
cd auth-service && npm test

# Notification Service — 8 unit tests
cd notification-service && npm test

# Gateway — 17 integration tests
cd gateway && npm run test:integration

# Delivery Service — JUnit
cd delivery-service && mvn clean test
```

**Total: 32 tests**

---

## Monitoring

Prometheus and Grafana run locally via Docker Compose.

| Tool | URL | Credentials |
|---|---|---|
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3030 | admin / admin123 |

### Metrics Available

| Metric | Source | Description |
|---|---|---|
| `http_request_total` | Node services | Total requests per route and status code |
| `http_request_duration_seconds` | Node services | Request latency histogram |
| `nodejs_heap_size_used_bytes` | Node services | Memory usage |
| `nodejs_eventloop_lag_seconds` | Node services | Event loop congestion |
| `jvm_memory_used_bytes` | Delivery Service | Java heap memory |
| `jvm_gc_pause_seconds` | Delivery Service | Garbage collection pauses |
| `rabbitmq_consumed_total` | Delivery Service | Messages processed |
| `rabbitmq_connections` | Delivery Service | Active broker connections |

### Load Testing

A PowerShell script simulates concurrent users:

```powershell
# 10 users (default)
.\load-test.ps1

# 50 users
.\load-test.ps1 -UserCount 50
```

Each user registers, logs in, and sends 3 notifications simultaneously.

---

## CI/CD Pipeline

GitHub Actions runs on every push to `main` or `develop`:

| Job | Services Spun Up | Tests Run |
|---|---|---|
| `auth-service-tests` | PostgreSQL | 6 Jest unit tests |
| `notification-service-tests` | MongoDB, RabbitMQ | 8 Jest unit tests |
| `gateway-integration-tests` | PostgreSQL, MongoDB, RabbitMQ | 17 integration tests |
| `delivery-service-tests` | MongoDB, RabbitMQ | JUnit tests |
| `final-status` | — | Aggregates all results |

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| API Gateway | Railway | Auto-deploys on push to main |
| Auth Service | Railway | Connected to Railway PostgreSQL |
| Notification Service | Railway | — |
| Delivery Service | Render | Docker-based, may sleep on free tier |
| PostgreSQL | Railway | Managed instance |
| MongoDB | MongoDB Atlas | Free M0 cluster |
| RabbitMQ | CloudAMQP | Little Lemur free plan |

---

## Current Limitations

QuickNotify is a capstone project demonstrating microservices architecture. Before using in production, be aware of:

| Limitation | Details |
|---|---|
| **Simulated delivery** | Email and SMS channels log delivery to console — no actual sending via SMTP or SMS gateway yet |
| **JWT-based auth** | Developers authenticate via login (24h token). Production systems typically use long-lived API keys |
| **No webhooks** | No way to notify your app when delivery status changes |
| **No SDK** | Integration requires raw HTTP calls — no npm package or Java library yet |
| **Free tier constraints** | Render's free tier sleeps after inactivity; Railway has usage limits |
| **No retry logic** | Failed deliveries are logged but not automatically retried |

---

## Roadmap

Features planned for future versions:

- [*] **API Key system** — static keys instead of expiring JWTs for server-to-server auth
- [*] **Real email delivery** — SMTP integration via Nodemailer or SendGrid
- [ ] **Real SMS delivery** — Twilio or Termii integration
- [ ] **Webhooks** — POST to your app when delivery status changes
- [ ] **Node.js SDK** — `npm install quicknotify-sdk`
- [ ] **Retry logic** — automatic retry with exponential backoff for failed deliveries
- [ ] **Dead letter queue** — capture permanently failed messages for inspection
- [ ] **Developer dashboard** — UI to view notifications, delivery rates, and manage settings
- [ ] **Rate limiting per API key** — prevent abuse per developer account
- [ ] **Notification templates** — reusable templates with variable substitution

---

## Project Structure

```
quicknotify/
├── gateway/                    # API Gateway (Node.js/Express)
│   ├── src/
│   │   ├── index.js            # App entry, routing, middleware
│   │   ├── middleware/auth.js  # JWT verification
│   │   ├── metrics.js          # Prometheus metrics
│   │   └── swagger.js          # OpenAPI spec
│   └── __tests__/integration/  # 17 integration tests
├── auth-service/               # Auth Service (Node.js/PostgreSQL)
│   ├── src/
│   │   ├── controllers/        # register(), login()
│   │   ├── models/             # Sequelize User model
│   │   └── routes/             # Route definitions
│   └── __tests__/              # 6 unit tests
├── notification-service/       # Notification Service (Node.js/MongoDB)
│   ├── src/
│   │   ├── config/             # MongoDB + RabbitMQ connections
│   │   ├── controllers/        # create(), get()
│   │   ├── models/             # Mongoose Notification schema
│   │   └── routes/             # Route definitions
│   └── __tests__/              # 8 unit tests
├── delivery-service/           # Delivery Service (Java/Spring Boot)
│   └── src/main/java/
│       ├── consumer/           # RabbitMQ @RabbitListener
│       ├── service/            # Delivery processing logic
│       ├── config/             # MongoDB + RabbitMQ beans
│       └── model/              # NotificationMessage, DeliveryLog
├── prometheus.yml              # Prometheus scrape configuration
├── docker-compose.yml          # Local infrastructure
├── load-test.ps1               # PowerShell load testing script
└── .github/workflows/
    └── ci-cd.yml               # GitHub Actions CI/CD pipeline
```

---

## Author

**Samuel** — [github.com/samigold](https://github.com/samigold)

Built as a Tech4Dev capstone project demonstrating production-grade microservices architecture with Node.js, Java Spring Boot, RabbitMQ, Docker, GitHub Actions CI/CD, and Prometheus/Grafana monitoring.

---

## License

MIT
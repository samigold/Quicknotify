const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const authMiddleware = require("./middleware/auth").default;
const {verifyAuth} = require("./middleware/auth");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { register, metricsMiddleware } = require("./metrics");

dotenv.config();

const app = express();

app.set("trust proxy", 1); // Trust first proxy (if behind a load balancer)

app.use(express.static("public")); // Serve static files from the "public" directory

app.use(metricsMiddleware);

// ── Rate Limiting 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: "Too many requests, slow down." },
});
app.use(limiter);

// ── Health Check ───────────────────────────────
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags:
 *       - System
 *     description: Returns the current status of the API Gateway
 *     responses:
 *       200:
 *         description: Gateway is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "Gateway is running"
 */
app.get("/health", (req, res) => {
  res.json({ status: "Gateway is running" });
});

// ── Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     description: Create a new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "secure_password_123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Bad request - missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email is required"
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User already exists"
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user and get JWT token
 *     tags:
 *       - Authentication
 *     description: Authenticate user with email and password. Returns a JWT token for use in subsequent requests.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "secure_password_123"
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password"
 *       400:
 *         description: Bad request - missing fields
 */

/**
 * @swagger
 * /api/auth/apikey/generate:
 *   post:
 *     summary: Generate a new API key for the authenticated user
 *     tags:
 *       - API Key Management
 *     description: Creates a new API key that can be used instead of JWT for API authentication. Only accessible with valid JWT.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: API key generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "API key generated successfully"
 *                 apiKey:
 *                   type: string
 *                   example: "sk_live_abc123def456..."
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No JWT token provided"
 */

/**
 * @swagger
 * /api/auth/apikey/info:
 *   get:
 *     summary: Get API key information for the authenticated user
 *     tags:
 *       - API Key Management
 *     description: Retrieves information about the current API key (if exists), including when it was created and last used. Only accessible with valid JWT.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: API key information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasApiKey:
 *                   type: boolean
 *                 apiKeyCreatedAt:
 *                   type: string
 *                   format: date-time
 *                 apiKeyLastUsedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 */

/**
 * @swagger
 * /api/auth/apikey/revoke:
 *   post:
 *     summary: Revoke the API key for the authenticated user
 *     tags:
 *       - API Key Management
 *     description: Disables and removes the API key for the current user. This action cannot be undone. Only accessible with valid JWT.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "API key revoked successfully"
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       404:
 *         description: No API key found for this user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No API key found"
 */

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a new notification
 *     tags:
 *       - Notifications
 *     description: Send a new notification to a recipient. Requires either JWT or API Key authentication.
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - recipient
 *               - subject
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, sms, push]
 *                 example: "email"
 *               recipient:
 *                 type: string
 *                 example: "recipient@example.com"
 *               subject:
 *                 type: string
 *                 example: "Welcome to QuickNotify"
 *               message:
 *                 type: string
 *                 example: "This is a test notification"
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - Invalid JWT or API Key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No JWT token or API key provided"
 *   get:
 *     summary: Get all notifications for the authenticated user
 *     tags:
 *       - Notifications
 *     description: Retrieve a list of all notifications created by the authenticated user. Requires either JWT or API Key authentication.
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, failed]
 *         description: Filter notifications by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of notifications to skip
 *     responses:
 *       200:
 *         description: List of notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   type:
 *                     type: string
 *                   recipient:
 *                     type: string
 *                   subject:
 *                     type: string
 *                   status:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized - Invalid JWT or API Key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No JWT token or API key provided"
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags:
 *       - System
 *     description: Returns application metrics in Prometheus format for monitoring and observability
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */

// ── Routes → Services
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
  })
);

// ── Metrics Endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
// ── JWT Auth Check (runs before proxying)
//app.use(authMiddleware);

// ── Combined Auth Middleware (JWT or API Key)
//app.use(verifyAuth)

// ── Protected Routes (require auth)
app.use("/api/notifications", (req, res, next) => verifyAuth(req, res, next), createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL,
  changeOrigin: true,
}));

// ── Webhook Routes (protected)
/**
 * @swagger
 * tags:
 *   - name: Webhooks
 *     description: Webhook management and configuration
 *
 * /api/webhooks:
 *   post:
 *     summary: Register a new webhook
 *     tags:
 *       - Webhooks
 *     description: Register a new webhook endpoint for event delivery
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - url
 *               - events
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID who owns this webhook
 *                 example: "user123"
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: HTTPS endpoint URL where webhook events will be delivered
 *                 example: "https://api.example.com/webhooks"
 *               events:
 *                 type: array
 *                 description: List of events this webhook should receive
 *                 items:
 *                   type: string
 *                   enum: [delivery.completed, delivery.failed, notification.sent]
 *                 example: ["delivery.completed", "delivery.failed"]
 *               secret:
 *                 type: string
 *                 description: Secret key for signing webhook payloads (optional)
 *                 example: "secret_key_123"
 *               active:
 *                 type: boolean
 *                 description: Whether this webhook is active
 *                 default: true
 *     responses:
 *       201:
 *         description: Webhook registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 webhook:
 *                   type: object
 *       400:
 *         description: Invalid webhook data
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get all webhooks for a user
 *     tags:
 *       - Webhooks
 *     description: Retrieve all registered webhooks for the authenticated user
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to fetch webhooks for
 *     responses:
 *       200:
 *         description: Webhooks retrieved successfully
 *       400:
 *         description: Missing userId parameter
 *       401:
 *         description: Unauthorized
 *
 * /api/webhooks/{id}:
 *   get:
 *     summary: Get a specific webhook
 *     tags:
 *       - Webhooks
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Webhook retrieved successfully
 *       404:
 *         description: Webhook not found
 *   put:
 *     summary: Update a webhook
 *     tags:
 *       - Webhooks
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Webhook updated successfully
 *       404:
 *         description: Webhook not found
 *   delete:
 *     summary: Delete a webhook
 *     tags:
 *       - Webhooks
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Webhook deleted successfully
 *       404:
 *         description: Webhook not found
 *
 * /api/webhooks/{id}/logs:
 *   get:
 *     summary: Get webhook delivery logs
 *     tags:
 *       - Webhooks
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Delivery logs retrieved successfully
 *       404:
 *         description: Webhook not found
 *
 * /api/webhooks/{id}/stats:
 *   get:
 *     summary: Get webhook statistics
 *     tags:
 *       - Webhooks
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       404:
 *         description: Webhook not found
 *
 * /api/webhooks/{id}/test:
 *   post:
 *     summary: Test a webhook endpoint
 *     tags:
 *       - Webhooks
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Test webhook initiated
 *       404:
 *         description: Webhook not found
 */
app.use("/api/webhooks", (req, res, next) => verifyAuth(req, res, next), createProxyMiddleware({
  target: process.env.WEBHOOK_SERVICE_URL,
  changeOrigin: true,
}));

// ── Start ────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

module.exports = app; // Export for testing
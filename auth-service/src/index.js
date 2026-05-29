const express = require("express");
require("dotenv").config();
const sequelize = require("./config/db");
const authRoutes = require("./routes/auth");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const apiKeyRoutes = require("./routes/apiKey");
const { register, metricsMiddleware } = require("./metrics");


const app = express();
app.use(express.json());
app.use(metricsMiddleware);

// ── Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Email already exists
 */

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Auth
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
 *               password:
 *                 type: string
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
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /apikey/generate:
 *   post:
 *     summary: Generate a new API Key
 *     tags:
 *       - API Key
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: API Key generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKey:
 *                   type: string
 *                   description: The generated API Key (shown only once)
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid JWT token
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /apikey/info:
 *   get:
 *     summary: Get API Key information
 *     tags:
 *       - API Key
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: API Key info retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasApiKey:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 lastUsedAt:
 *                   type: string
 *                   format: date-time
 *                 keyPrefix:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid JWT token
 *       404:
 *         description: No active API Key
 */

/**
 * @swagger
 * /apikey/revoke:
 *   delete:
 *     summary: Revoke the API Key
 *     tags:
 *       - API Key
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: API Key revoked successfully
 *       401:
 *         description: Unauthorized - Invalid JWT token
 *       404:
 *         description: User not found
 */

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ── Routes ─────────────────────────────────────
app.use("/", authRoutes);
app.use("/apikey", apiKeyRoutes);

// ── Health Check ───────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "Auth service running" });
});

// ── Start + Sync DB ────────────────────────────
const PORT = process.env.PORT || 3001;

sequelize.sync({ alter: true }).then(() => {
  console.log("PostgreSQL connected and models synced");
  app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("DB connection failed:", err.message);
});

module.exports = app; // Export for testing
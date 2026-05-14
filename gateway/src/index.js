const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const authMiddleware = require("./middleware/auth");

dotenv.config();

const app = express();

// ── Rate Limiting 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: "Too many requests, slow down." },
});
app.use(limiter);

// ── Health Check ───────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "Gateway is running" });
});


// ── JWT Auth Check (runs before proxying)
app.use(authMiddleware);

// ── Routes → Services
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
  })
);

app.use(
  "/api/notifications",
  createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
  })
);

// ── Start ──────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
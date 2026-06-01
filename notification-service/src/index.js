const express = require("express");
const connectDB = require("./config/db");
const { connectRabbitMQ } = require("./config/rabbitmq");
const notificationRoutes = require("./routes/notification");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { register, metricsMiddleware } = require("./metrics");

dotenv.config();
const app = express();
app.use(express.json());
app.use(metricsMiddleware);

// ── Metrics Endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ── Forward user info from gateway ────────────
app.use((req, res, next) => {
  if (req.headers["authorization"]) {
    const token = req.headers["authorization"].split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.headers["x-user-id"] = decoded.userId;
    } catch (e) {
        console.warn("Invalid token in notification service:", e.message);
    }
  }
  next();
});

app.use("/", notificationRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "Notification service running" });
});

const PORT = process.env.PORT || 3002;

(async () => {
  await connectDB();
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
  });
})();

module.exports = app; // Export for testing
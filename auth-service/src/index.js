const express = require("express");
const dotenv = require("dotenv");
const sequelize = require("./config/db");
const authRoutes = require("./routes/auth");

dotenv.config();

const app = express();
app.use(express.json());

// ── Routes ─────────────────────────────────────
app.use("/", authRoutes);

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
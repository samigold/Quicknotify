const express = require("express");
const router = express.Router();
const verifyAuth = require("../middleware/apiKey");
const { createNotification, getNotifications } = require("../controllers/notification");

router.post("/", verifyAuth, createNotification);
router.get("/", verifyAuth, getNotifications);

module.exports = router;
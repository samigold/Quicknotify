const express = require("express");
const router = express.Router();
const verifyApiKey = require("../middleware/apiKey");
const { createNotification, getNotifications } = require("../controllers/notification");

router.post("/", verifyApiKey, createNotification);
router.get("/", verifyApiKey, getNotifications);

module.exports = router;
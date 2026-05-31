const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/auth");
const authController = require("../controllers/auth");
const apiKeyController = require("../controllers/apiKey");

// Generate API key (requires JWT login)
router.post("/generate", verifyJWT, authController.generateApiKey);

// Get API key info (requires JWT login)
router.get("/info", verifyJWT, apiKeyController.fetchApiKey);

// Revoke API key (requires JWT login)
router.delete("/revoke", verifyJWT, apiKeyController.revokeApiKey);

//validate API key (used by notification service, no JWT required)
router.get("/validate", apiKeyController.validateApiKey);

module.exports = router;
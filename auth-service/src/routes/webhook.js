const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook');
const verifyJWT = require('../middleware/auth');

// All webhook routes should be authenticated
router.use(verifyJWT);

// POST /api/webhooks - Register a new webhook
router.post('/', webhookController.registerWebhook);

// GET /api/webhooks - Get all webhooks for the user
router.get('/', webhookController.getWebhooks);

// You would add more routes here for updating, deleting, and getting a single webhook
// e.g., router.put('/:id', webhookController.updateWebhook);
// e.g., router.delete('/:id', webhookController.deleteWebhook);

module.exports = router;
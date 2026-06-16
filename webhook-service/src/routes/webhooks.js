const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

/**
 * @swagger
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
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     url:
 *                       type: string
 *                     events:
 *                       type: array
 *                       items:
 *                         type: string
 *                     active:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 webhooks:
 *                   type: array
 *                   items:
 *                     type: object
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
 *     description: Retrieve details of a specific webhook
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Webhook retrieved successfully
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update a webhook
 *     tags:
 *       - Webhooks
 *     description: Update an existing webhook configuration
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
 *               secret:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Webhook updated successfully
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Delete a webhook
 *     tags:
 *       - Webhooks
 *     description: Delete a webhook endpoint
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
 *       401:
 *         description: Unauthorized
 *
 * /api/webhooks/{id}/logs:
 *   get:
 *     summary: Get webhook delivery logs
 *     tags:
 *       - Webhooks
 *     description: Retrieve delivery logs for a specific webhook
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
 *       401:
 *         description: Unauthorized
 *
 * /api/webhooks/{id}/stats:
 *   get:
 *     summary: Get webhook statistics
 *     tags:
 *       - Webhooks
 *     description: Retrieve delivery statistics for a webhook
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
 *       401:
 *         description: Unauthorized
 *
 * /api/webhooks/{id}/test:
 *   post:
 *     summary: Test a webhook endpoint
 *     tags:
 *       - Webhooks
 *     description: Send a test payload to the webhook endpoint
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
 *       401:
 *         description: Unauthorized
 */

// Routes
router.post('/', webhookController.registerWebhook);
router.get('/', webhookController.getWebhooks);
router.get('/:id', webhookController.getWebhook);
router.put('/:id', webhookController.updateWebhook);
router.delete('/:id', webhookController.deleteWebhook);
router.get('/:id/logs', webhookController.getWebhookLogs);
router.get('/:id/stats', webhookController.getWebhookStats);
router.post('/:id/test', webhookController.testWebhook);

module.exports = router;

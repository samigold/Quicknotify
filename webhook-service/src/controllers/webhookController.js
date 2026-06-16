const logger = require('../config/logger');

/**
 * Webhook Controller
 * Handles webhook management endpoints
 * Uses WebhookEndpoint and WebhookLog models from auth-service
 */

// Note: These models should be imported from auth-service shared models
// For now, we'll work with them passed via dependency injection or require them

/**
 * Register a new webhook
 * POST /api/webhooks
 */
const registerWebhook = async (req, res) => {
  try {
    const { userId, url, events, secret, active = true } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        message: 'Invalid webhook data. Required: url (string), events (array with at least 1 item)'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    // Validate events
    const validEvents = ['delivery.completed', 'delivery.failed', 'notification.sent'];
    const invalidEvents = events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        message: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}`
      });
    }

    // Get WebhookEndpoint model from auth-service
    // This should be passed in or required from a shared models location
    const { WebhookEndpoint } = require('../../auth-service/src/models');

    const webhook = await WebhookEndpoint.create({
      UserId: userId,
      url,
      secret: secret || '',
      subscribedEvents: events,
      isEnabled: active,
    });

    logger.info(`Webhook registered: ${webhook.id} for user ${userId}`);

    res.status(201).json({
      message: 'Webhook registered successfully',
      webhook: {
        id: webhook.id,
        userId: webhook.UserId,
        url: webhook.url,
        events: webhook.subscribedEvents,
        active: webhook.isEnabled,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      }
    });
  } catch (error) {
    logger.error('Error registering webhook:', error);
    res.status(500).json({ message: 'Failed to register webhook' });
  }
};

/**
 * Get all webhooks for a user
 * GET /api/webhooks
 */
const getWebhooks = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required as query parameter' });
    }

    const { WebhookEndpoint } = require('../../auth-service/src/models');

    const userWebhooks = await WebhookEndpoint.findAll({
      where: { UserId: userId }
    });

    const formatted = userWebhooks.map(w => ({
      id: w.id,
      userId: w.UserId,
      url: w.url,
      events: w.subscribedEvents,
      active: w.isEnabled,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));

    res.json({
      count: formatted.length,
      webhooks: formatted
    });
  } catch (error) {
    logger.error('Error fetching webhooks:', error);
    res.status(500).json({ message: 'Failed to fetch webhooks' });
  }
};

/**
 * Get a specific webhook
 * GET /api/webhooks/:id
 */
const getWebhook = async (req, res) => {
  try {
    const { id } = req.params;

    const { WebhookEndpoint } = require('../../auth-service/src/models');

    const webhook = await WebhookEndpoint.findByPk(id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    res.json({
      id: webhook.id,
      userId: webhook.UserId,
      url: webhook.url,
      events: webhook.subscribedEvents,
      active: webhook.isEnabled,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    });
  } catch (error) {
    logger.error('Error fetching webhook:', error);
    res.status(500).json({ message: 'Failed to fetch webhook' });
  }
};

/**
 * Update a webhook
 * PUT /api/webhooks/:id
 */
const updateWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, events, secret, active } = req.body;

    const { WebhookEndpoint } = require('../../auth-service/src/models');

    const webhook = await WebhookEndpoint.findByPk(id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
        webhook.url = url;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid URL format' });
      }
    }

    // Validate events if provided
    if (events) {
      const validEvents = ['delivery.completed', 'delivery.failed', 'notification.sent'];
      const invalidEvents = events.filter(e => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          message: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}`
        });
      }
      webhook.subscribedEvents = events;
    }

    if (secret !== undefined) webhook.secret = secret;
    if (active !== undefined) webhook.isEnabled = active;

    await webhook.save();
    logger.info(`Webhook updated: ${id}`);

    res.json({
      message: 'Webhook updated successfully',
      webhook: {
        id: webhook.id,
        userId: webhook.UserId,
        url: webhook.url,
        events: webhook.subscribedEvents,
        active: webhook.isEnabled,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      }
    });
  } catch (error) {
    logger.error('Error updating webhook:', error);
    res.status(500).json({ message: 'Failed to update webhook' });
  }
};

/**
 * Delete a webhook
 * DELETE /api/webhooks/:id
 */
const deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;

    const { WebhookEndpoint } = require('../../auth-service/src/models');

    const webhook = await WebhookEndpoint.findByPk(id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    await webhook.destroy();
    logger.info(`Webhook deleted: ${id}`);

    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(500).json({ message: 'Failed to delete webhook' });
  }
};

/**
 * Get webhook delivery logs
 * GET /api/webhooks/:id/logs
 */
const getWebhookLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { WebhookEndpoint, WebhookLog } = require('../../auth-service/src/models');

    const webhook = await WebhookEndpoint.findByPk(id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    const logs = await WebhookLog.findAndCountAll({
      where: { WebhookEndpointId: id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      webhookId: id,
      logs: logs.rows.map(log => ({
        id: log.id,
        eventId: log.eventId,
        status: log.deliveryStatus,
        statusCode: log.statusCode,
        requestPayload: log.requestPayload,
        responseBody: log.responseBody,
        createdAt: log.createdAt,
      })),
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: logs.count
    });
  } catch (error) {
    logger.error('Error fetching webhook logs:', error);
    res.status(500).json({ message: 'Failed to fetch webhook logs' });
  }
};

/**
 * Get webhook statistics
 * GET /api/webhooks/:id/stats
 */
const getWebhookStats = async (req, res) => {
  try {
    const { id } = req.params;

    const { WebhookEndpoint, WebhookLog } = require('../../auth-service/src/models');

    const webhook = await WebhookEndpoint.findByPk(id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    const logs = await WebhookLog.findAll({
      where: { WebhookEndpointId: id }
    });

    const totalDeliveries = logs.length;
    const successfulDeliveries = logs.filter(l => l.deliveryStatus === 'SUCCESS').length;
    const failedDeliveries = logs.filter(l => l.deliveryStatus === 'FAILED').length;
    const pendingDeliveries = logs.filter(l => l.deliveryStatus === 'PENDING').length;

    const successRate = totalDeliveries > 0
      ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(2) + '%'
      : 'N/A';

    res.json({
      webhookId: id,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      pendingDeliveries,
      successRate,
      url: webhook.url,
      active: webhook.isEnabled,
      createdAt: webhook.createdAt,
    });
  } catch (error) {
    logger.error('Error fetching webhook stats:', error);
    res.status(500).json({ message: 'Failed to fetch webhook stats' });
  }
};

/**
 * Test a webhook endpoint
 * POST /api/webhooks/:id/test
 */
const testWebhook = async (req, res) => {
  try {
    const { id } = req.params;

    const { WebhookEndpoint } = require('../../auth-service/src/models');

    const webhook = await WebhookEndpoint.findByPk(id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    logger.info(`Testing webhook: ${id}`);

    // In production, this would send an actual test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      webhookId: id,
      data: {
        testMessage: 'This is a test payload from QuickNotify',
        testId: `test_${Date.now()}`
      }
    };

    res.json({
      message: 'Webhook test initiated - test payload would be sent to ' + webhook.url,
      webhookId: id,
      testPayload
    });
  } catch (error) {
    logger.error('Error testing webhook:', error);
    res.status(500).json({ message: 'Failed to test webhook' });
  }
};

module.exports = {
  registerWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
  getWebhookStats,
  testWebhook
};

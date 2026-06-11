const crypto = require('crypto');
const { WebhookEndpoint } = require('../models');
const { encrypt } = require('../utils/encryption');

// Generate a secure random string for the webhook secret
const generateSecret = () => {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
};

// Register a new webhook endpoint
exports.registerWebhook = async (req, res) => {
  const { url, subscribedEvents } = req.body;
  const userId = req.user.userId; // Auth middleware sets userId

  if (!url || !subscribedEvents || !Array.isArray(subscribedEvents)) {
    return res.status(400).json({ message: 'URL and subscribedEvents array are required.' });
  }

  try {
    const secret = generateSecret();
    const encryptedSecret = encrypt(secret);

    const webhook = await WebhookEndpoint.create({
      url,
      subscribedEvents,
      secret: encryptedSecret,
      UserId: userId,
    });

    // Return the raw secret to the user ONCE upon creation
    res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      subscribedEvents: webhook.subscribedEvents,
      isEnabled: webhook.isEnabled,
      secret: secret, // IMPORTANT: Only show the secret on creation
    });
  } catch (error) {
    console.error('Webhook registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all webhooks for the authenticated user
exports.getWebhooks = async (req, res) => {
    const userId = req.user.userId;
    try {
        const webhooks = await WebhookEndpoint.findAll({
            where: { UserId: userId },
            attributes: ['id', 'url', 'subscribedEvents', 'isEnabled', 'createdAt', 'updatedAt'], // Exclude secret
        });
        res.json(webhooks);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ... (Other CRUD operations like update and delete would go here)
const axios = require('axios');
const logger = require('../config/logger');
const { createWebhookHeaders } = require('../utils/webhookSigner');

/** 
 * Attempt to deliver a webhook to the specified URL with retries and exponential backoff.
 * @param {string} url - The target URL for the webhook delivery.
 * @param {object} payload - The JSON payload to send in the webhook.
*/

async function deliverWebhook(webhookEndpoint, payload, eventId, decryptedSecret) {
  try {
    const headers = createWebhookHeaders(payload, decryptedSecret, eventId);

    const response = await axios.post(webhookEndpoint, payload, { 
      headers,
      timeout: 5000 // Set a timeout for the request
    });

    logger.info(`Webhook delivered successfully to ${webhookEndpoint} with status ${response.status} and event ID ${eventId}`);
    return {
      success: true,
      statusCode: response.status,
      data: response.data,
    };
  } catch (error) {
    logger.error(`Failed to deliver webhook to ${webhookEndpoint} with event ID ${eventId}: ${error.message}`);

    return {
      success: false,
      statusCode: error.response ? error.response.status : null,
      responseBody: error.response ? error.response.data : null,
      errorMessage: error.message,
    };
  }
}

module.exports = {
    deliverWebhook
};
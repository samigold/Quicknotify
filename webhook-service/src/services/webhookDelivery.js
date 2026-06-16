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
    const headers = createWebhookHeaders(eventId, decryptedSecret, eventId);

    const response = await axios.post(webhookEndpoint, payload, { 
        headers,
        timeout: 5000 // Set a timeout for the request
        // You can also add retry logic here if needed, using libraries like axios-retry or implementing your own retry mechanism.
    });

    logger.info(`Webhook delivered successfully to ${webhookEndpoint} with status ${response.status} and event ID ${eventId}`);
    return response.data; // Return the response data if needed
} catch (error) {
    logger.error(`Failed to deliver webhook to ${webhookEndpoint} with event ID ${eventId}: ${error.message}`);

    return {
        success: false,
        statusCode: error.response ? error.response.status : null,
        responseBody: error.response ? error.response.data : null,
        errorMessage: error.message
    }
}
}

module.exports = {
    deliverWebhook
};
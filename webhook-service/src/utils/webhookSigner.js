const crypto = require('crypto');

/** * Signs a payload using HMAC SHA256 algorithm.
 * @param {string} payload - The payload to be signed.
 * @param {string} secret - The secret key used for signing.
 * @returns {string} - The HMAC SHA256 signature.
 */
function signWebhookPayload(payload, secret) {
    const payloadString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

    return signature;
}

/**
 * Create headers for the webhook request including the signature.
 * @param {string} payload - The payload to be sent in the webhook.
 * @param {string} secret - The secret key used for signing.
 * @returns {object} - An object containing the headers for the webhook request.
 */
function createWebhookHeaders(payload, secret) {
    const signature = signWebhookPayload(payload, secret);

    return {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-ID': eventId,
        'X-Webhook-Timestamp': new Date().toISOString(),
    };
}

module.exports = {
    signWebhookPayload,
    createWebhookHeaders,
};
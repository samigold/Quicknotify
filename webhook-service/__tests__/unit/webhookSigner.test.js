// __tests__/unit/webhookSigner.test.js
// Unit tests for webhook signing utility

const crypto = require('crypto');
const { signWebhookPayload, createWebhookHeaders } = require('../../src/utils/webhookSigner');

describe('Webhook Signer - Unit Tests', () => {
  describe('signWebhookPayload', () => {
    it('should generate a valid HMAC SHA256 signature', () => {
      const payload = { id: 'test-123', event: 'delivery.completed' };
      const secret = 'test-secret-key';

      const signature = signWebhookPayload(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should generate consistent signatures for the same payload and secret', () => {
      const payload = { id: 'test-123', event: 'delivery.completed' };
      const secret = 'test-secret-key';

      const signature1 = signWebhookPayload(payload, secret);
      const signature2 = signWebhookPayload(payload, secret);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'test-secret-key';
      const payload1 = { id: 'test-123', event: 'delivery.completed' };
      const payload2 = { id: 'test-456', event: 'delivery.failed' };

      const signature1 = signWebhookPayload(payload1, secret);
      const signature2 = signWebhookPayload(payload2, secret);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = { id: 'test-123', event: 'delivery.completed' };
      const secret1 = 'test-secret-key-1';
      const secret2 = 'test-secret-key-2';

      const signature1 = signWebhookPayload(payload, secret1);
      const signature2 = signWebhookPayload(payload, secret2);

      expect(signature1).not.toBe(signature2);
    });

    it('should handle complex nested payload objects', () => {
      const payload = {
        id: 'event-789',
        data: {
          notificationId: 'notif-456',
          channel: 'EMAIL',
          status: 'DELIVERED',
          recipient: {
            email: 'user@example.com',
            name: 'John Doe',
          },
          metadata: {
            tags: ['important', 'verified'],
            retries: 2,
          },
        },
        timestamp: '2026-06-16T10:30:00Z',
      };
      const secret = 'complex-secret-key';

      const signature = signWebhookPayload(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.match(/^[a-f0-9]+$/)).not.toBeNull(); // Should be hex
    });

    it('should produce hex-encoded signature', () => {
      const payload = { id: 'test-123' };
      const secret = 'secret';

      const signature = signWebhookPayload(payload, secret);

      // Hex string should only contain 0-9 and a-f
      expect(signature).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('createWebhookHeaders', () => {
    it('should create headers with required fields', () => {
      const payload = { id: 'test-123', event: 'delivery.completed' };
      const secret = 'test-secret-key';
      const eventId = 'event-123';

      const headers = createWebhookHeaders(payload, secret, eventId);

      expect(headers).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Webhook-Signature']).toBeDefined();
      expect(headers['X-Webhook-ID']).toBe(eventId);
      expect(headers['X-Webhook-Timestamp']).toBeDefined();
    });

    it('should include signature with sha256 prefix', () => {
      const payload = { id: 'test-123', event: 'delivery.completed' };
      const secret = 'test-secret-key';
      const eventId = 'event-123';

      const headers = createWebhookHeaders(payload, secret, eventId);

      expect(headers['X-Webhook-Signature']).toMatch(/^sha256=/);
    });

    it('should create valid ISO timestamp', () => {
      const payload = { id: 'test-123', event: 'delivery.completed' };
      const secret = 'test-secret-key';
      const eventId = 'event-123';

      const headers = createWebhookHeaders(payload, secret, eventId);
      const timestamp = new Date(headers['X-Webhook-Timestamp']);

      expect(timestamp instanceof Date).toBe(true);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should generate consistent signature in headers for same payload', () => {
      const payload = { id: 'test-123', event: 'delivery.completed' };
      const secret = 'test-secret-key';
      const eventId = 'event-123';

      const headers1 = createWebhookHeaders(payload, secret, eventId);
      const headers2 = createWebhookHeaders(payload, secret, eventId);

      // Signatures should match (same payload and secret)
      expect(headers1['X-Webhook-Signature']).toBe(headers2['X-Webhook-Signature']);
    });

    it('should include all standard webhook headers', () => {
      const payload = { id: 'test-123' };
      const secret = 'secret';
      const eventId = 'evt-456';

      const headers = createWebhookHeaders(payload, secret, eventId);

      expect(Object.keys(headers)).toContain('Content-Type');
      expect(Object.keys(headers)).toContain('X-Webhook-Signature');
      expect(Object.keys(headers)).toContain('X-Webhook-ID');
      expect(Object.keys(headers)).toContain('X-Webhook-Timestamp');
    });

    it('should handle empty payload', () => {
      const payload = {};
      const secret = 'secret';
      const eventId = 'evt-789';

      const headers = createWebhookHeaders(payload, secret, eventId);

      expect(headers['X-Webhook-Signature']).toBeDefined();
      expect(headers['X-Webhook-Signature']).toMatch(/^sha256=/);
    });
  });

  describe('Signature Verification Compatibility', () => {
    it('should produce signatures compatible with Node.js crypto verification', () => {
      const payload = { id: 'test-123', event: 'delivery.completed' };
      const secret = 'test-secret-key';
      const payloadString = JSON.stringify(payload);

      const signature = signWebhookPayload(payload, secret);

      // Verify using Node.js crypto
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      expect(signature).toBe(expectedSignature);
    });
  });
});

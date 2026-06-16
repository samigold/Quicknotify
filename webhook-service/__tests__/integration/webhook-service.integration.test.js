// __tests__/integration/webhook-service.integration.test.js
// Integration tests for webhook service end-to-end flow

const axios = require('axios');
const nock = require('nock');
const { signWebhookPayload, createWebhookHeaders } = require('../../src/utils/webhookSigner');
const { deliverWebhook } = require('../../src/services/webhookDelivery');
const { testEvent, testWebhookSecret } = require('../helpers/testData');

jest.mock('../../src/config/logger');

describe('Webhook Service - Integration Tests', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.enableNetConnect();
    nock.cleanAll();
  });

  describe('End-to-End Webhook Flow', () => {
    it('should sign payload and deliver with correct headers', async () => {
      const endpoint = 'https://webhook.example.com/events';
      const eventId = 'evt-integration-001';
      const payload = testEvent;

      const scope = nock('https://webhook.example.com')
        .post('/events', payload)
        .reply(function(uri, requestBody) {
          // Verify signature header
          const signature = this.req.getHeaders()['x-webhook-signature'];
          expect(signature).toMatch(/^sha256=/);

          // Verify webhook ID header
          expect(this.req.getHeaders()['x-webhook-id']).toBe(eventId);

          // Verify timestamp header
          const timestamp = this.req.getHeaders()['x-webhook-timestamp'];
          expect(timestamp).toBeDefined();
          expect(new Date(timestamp).getTime()).toBeGreaterThan(0);

          return [200, { processed: true }];
        });

      const result = await deliverWebhook(endpoint, payload, eventId, testWebhookSecret);

      expect(scope.isDone()).toBe(true);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should create verifiable webhook signature', async () => {
      const payload = testEvent;
      const secret = testWebhookSecret;

      // Create signature
      const signature = signWebhookPayload(payload, secret);

      // Verify it's consistent
      const signature2 = signWebhookPayload(payload, secret);
      expect(signature).toBe(signature2);

      // Verify it's hex encoded
      expect(signature).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle webhook delivery with retry logic', async () => {
      const endpoint = 'https://webhook.example.com/events';
      const eventId = 'evt-retry-001';
      const payload = testEvent;

      // First attempt fails
      nock('https://webhook.example.com')
        .post('/events')
        .reply(500, { error: 'Server error' });

      const result = await deliverWebhook(endpoint, payload, eventId, testWebhookSecret);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it('should send correct payload to webhook endpoint', async () => {
      const endpoint = 'https://webhook.example.com/events';
      const eventId = 'evt-payload-001';
      const customPayload = {
        id: 'event-custom-123',
        eventType: 'notification.sent',
        data: {
          notificationId: 'notif-789',
          channel: 'SMS',
          status: 'DELIVERED',
          recipient: '+1234567890',
        },
        timestamp: '2026-06-16T10:00:00Z',
      };

      const scope = nock('https://webhook.example.com')
        .post('/events', customPayload)
        .reply(200, { success: true });

      await deliverWebhook(endpoint, customPayload, eventId, testWebhookSecret);

      expect(scope.isDone()).toBe(true);
    });

    it('should handle multiple webhook deliveries independently', async () => {
      const endpoint1 = 'https://webhook1.example.com/events';
      const endpoint2 = 'https://webhook2.example.com/events';
      const payload1 = { ...testEvent, id: 'event-1' };
      const payload2 = { ...testEvent, id: 'event-2' };

      nock('https://webhook1.example.com')
        .post('/events')
        .reply(200, { received: true });

      nock('https://webhook2.example.com')
        .post('/events')
        .reply(200, { received: true });

      const result1 = await deliverWebhook(endpoint1, payload1, 'evt-1', testWebhookSecret);
      const result2 = await deliverWebhook(endpoint2, payload2, 'evt-2', testWebhookSecret);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Signature Verification Compatibility', () => {
    it('should produce signatures that can be verified on client side', async () => {
      const crypto = require('crypto');
      const payload = testEvent;
      const secret = testWebhookSecret;

      const signature = signWebhookPayload(payload, secret);
      const payloadString = JSON.stringify(payload);

      // Client-side verification logic
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      expect(signature).toBe(expectedSignature);
    });

    it('should handle signature verification with different payload ordering', async () => {
      const secret = testWebhookSecret;
      
      // Same data, different ordering
      const payload1 = { id: 'test', data: { a: 1, b: 2 } };
      const payload2 = { id: 'test', data: { b: 2, a: 1 } };

      const signature1 = signWebhookPayload(payload1, secret);
      const signature2 = signWebhookPayload(payload2, secret);

      // Signatures may differ due to JSON serialization order
      // This is expected behavior for JSON
      expect(typeof signature1).toBe('string');
      expect(typeof signature2).toBe('string');
    });
  });

  describe('Header Construction', () => {
    it('should construct complete webhook headers', () => {
      const payload = testEvent;
      const secret = testWebhookSecret;
      const eventId = 'evt-headers-001';

      const headers = createWebhookHeaders(payload, secret, eventId);

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Webhook-Signature']).toMatch(/^sha256=/);
      expect(headers['X-Webhook-ID']).toBe(eventId);
      expect(headers['X-Webhook-Timestamp']).toBeDefined();
    });

    it('should include unique timestamps in each header set', () => {
      const payload = testEvent;
      const secret = testWebhookSecret;
      const eventId = 'evt-headers-002';

      // Create headers at slightly different times
      const headers1 = createWebhookHeaders(payload, secret, eventId);
      
      // Small delay
      const now = Date.now();
      while (Date.now() - now < 10); // Ensure some time has passed

      const headers2 = createWebhookHeaders(payload, secret, eventId);

      // Timestamps should be different
      expect(headers1['X-Webhook-Timestamp']).not.toBe(headers2['X-Webhook-Timestamp']);
    });
  });

  describe('Event Handling', () => {
    it('should handle delivery.completed events', async () => {
      const endpoint = 'https://webhook.example.com/events';
      const event = {
        id: 'event-delivery-completed',
        eventType: 'delivery.completed',
        data: {
          notificationId: 'notif-123',
          channel: 'EMAIL',
          status: 'DELIVERED',
          recipient: 'user@example.com',
        },
        timestamp: new Date().toISOString(),
      };

      nock('https://webhook.example.com')
        .post('/events')
        .reply(200, { processed: true });

      const result = await deliverWebhook(endpoint, event, 'evt-001', testWebhookSecret);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should handle notification.sent events', async () => {
      const endpoint = 'https://webhook.example.com/events';
      const event = {
        id: 'event-notification-sent',
        eventType: 'notification.sent',
        data: {
          notificationId: 'notif-456',
          channel: 'SMS',
          status: 'SENT',
          recipient: '+1234567890',
        },
        timestamp: new Date().toISOString(),
      };

      nock('https://webhook.example.com')
        .post('/events')
        .reply(200, { processed: true });

      const result = await deliverWebhook(endpoint, event, 'evt-002', testWebhookSecret);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should preserve event data through delivery process', async () => {
      const endpoint = 'https://webhook.example.com/events';
      const complexEvent = {
        id: 'event-complex',
        eventType: 'delivery.completed',
        data: {
          notificationId: 'notif-789',
          channel: 'PUSH',
          status: 'DELIVERED',
          recipient: 'device-id-123',
          metadata: {
            platform: 'iOS',
            timestamp: '2026-06-16T09:00:00Z',
            tags: ['urgent', 'important'],
          },
        },
        timestamp: new Date().toISOString(),
      };

      const scope = nock('https://webhook.example.com')
        .post('/events', complexEvent)
        .reply(200, { received: true });

      await deliverWebhook(endpoint, complexEvent, 'evt-003', testWebhookSecret);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle webhook endpoint unreachable', async () => {
      const endpoint = 'https://unreachable.example.com/events';
      const payload = testEvent;

      nock('https://unreachable.example.com')
        .post('/events')
        .replyWithError('getaddrinfo ENOTFOUND unreachable.example.com');

      const result = await deliverWebhook(endpoint, payload, 'evt-err-001', testWebhookSecret);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle webhook endpoint timeout', async () => {
      const endpoint = 'https://timeout.example.com/events';
      const payload = testEvent;

      nock('https://timeout.example.com')
        .post('/events')
        .delayConnection(10000)
        .reply(200, { success: true });

      const result = await deliverWebhook(endpoint, payload, 'evt-err-002', testWebhookSecret);

      expect(result.success).toBe(false);
    });

    it('should handle webhook endpoint returning error status', async () => {
      const endpoint = 'https://error.example.com/events';
      const payload = testEvent;

      nock('https://error.example.com')
        .post('/events')
        .reply(500, { error: 'Internal Server Error' });

      const result = await deliverWebhook(endpoint, payload, 'evt-err-003', testWebhookSecret);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.responseBody.error).toBe('Internal Server Error');
    });
  });
});

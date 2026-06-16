// __tests__/unit/webhookDelivery.test.js
// Unit tests for webhook delivery service

const axios = require('axios');
const nock = require('nock');
const { deliverWebhook } = require('../../src/services/webhookDelivery');
const { testEvent } = require('../helpers/testData');

jest.mock('../../src/config/logger');

describe('Webhook Delivery - Unit Tests', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.enableNetConnect();
    nock.cleanAll();
  });

  describe('deliverWebhook', () => {
    it('should successfully deliver a webhook to valid endpoint', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      nock('https://example.com')
        .post('/webhook')
        .reply(200, { success: true });

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should include webhook signature headers in request', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      const scope = nock('https://example.com')
        .post('/webhook')
        .reply(function() {
          const headers = this.req.getHeaders();
          expect(headers['x-webhook-signature']).toBeDefined();
          expect(headers['x-webhook-signature']).toMatch(/^sha256=/);
          return [200, { success: true }];
        });

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result.success).toBe(true);
      expect(scope.isDone()).toBe(true);
    });

    it('should include webhook ID header in request', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-789';
      const secret = 'test-secret-key';

      const scope = nock('https://example.com')
        .post('/webhook')
        .reply(function() {
          expect(this.req.getHeaders()['x-webhook-id']).toBe(eventId);
          return [200, { success: true }];
        });

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result.success).toBe(true);
      expect(scope.isDone()).toBe(true);
    });

    it('should return error object on delivery failure', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      nock('https://example.com')
        .post('/webhook')
        .reply(500, { error: 'Internal Server Error' });

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle network timeout gracefully', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      nock('https://example.com')
        .post('/webhook')
        .delayConnection(10000)
        .reply(200);

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle connection refused errors', async () => {
      const webhookEndpoint = 'https://unreachable.example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle 4xx client errors', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      nock('https://example.com')
        .post('/webhook')
        .reply(400, { error: 'Bad Request' });

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    it('should handle 3xx redirects', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      nock('https://example.com')
        .post('/webhook')
        .reply(301, {}, { Location: 'https://example.com/new-webhook' });

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result).toBeDefined();
    });

    it('should include Content-Type header as application/json', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      const scope = nock('https://example.com')
        .post('/webhook')
        .reply(function() {
          expect(this.req.getHeaders()['content-type']).toBe('application/json');
          return [200, { success: true }];
        });

      await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(scope.isDone()).toBe(true);
    });

    it('should send JSON payload correctly', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      const scope = nock('https://example.com')
        .post('/webhook', payload)
        .reply(200, { received: true });

      await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(scope.isDone()).toBe(true);
    });

    it('should return response data on successful delivery', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';
      const responseData = { processedAt: new Date().toISOString(), received: true };

      nock('https://example.com')
        .post('/webhook')
        .reply(200, responseData);

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(responseData);
    });

    it('should handle various HTTP methods correctly (POST)', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      const scope = nock('https://example.com')
        .post('/webhook')
        .reply(200, { success: true });

      await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should provide error message on delivery failure', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';

      nock('https://example.com')
        .post('/webhook')
        .reply(500, { error: 'Server error' });

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(typeof result.errorMessage).toBe('string');
    });

    it('should include response body in error on server error', async () => {
      const webhookEndpoint = 'https://example.com/webhook';
      const payload = testEvent;
      const eventId = 'event-123';
      const secret = 'test-secret-key';
      const errorResponse = { code: 'INTERNAL_ERROR', error: 'Server error' };

      nock('https://example.com')
        .post('/webhook')
        .reply(500, errorResponse);

      const result = await deliverWebhook(webhookEndpoint, payload, eventId, secret);

      expect(result.success).toBe(false);
      expect(result.responseBody).toEqual(errorResponse);
    });
  });
});

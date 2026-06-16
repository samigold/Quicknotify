// __tests__/helpers/testData.js
// Common test data and fixtures

const testWebhookSecret = 'test-secret-key-32-bytes-long!';

const testEvent = {
  id: 'event-123',
  eventType: 'delivery.completed',
  data: {
    notificationId: 'notif-456',
    channel: 'EMAIL',
    status: 'DELIVERED',
    recipient: 'test@example.com',
  },
  timestamp: new Date().toISOString(),
};

const testPayload = {
  id: 'job-123',
  event: 'delivery.completed',
  data: {
    notificationId: 'notif-456',
    channel: 'EMAIL',
    status: 'DELIVERED',
    recipient: 'test@example.com',
  },
  timestamp: new Date().toISOString(),
};

const testWebhookJob = {
  id: 'webhook-job-123',
  eventType: 'delivery.completed',
  eventData: testEvent.data,
  createdAt: new Date().toISOString(),
  attempts: 0,
  maxAttempts: 3,
};

module.exports = {
  testWebhookSecret,
  testEvent,
  testPayload,
  testWebhookJob,
};

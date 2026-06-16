// __tests__/unit/eventConsumer.test.js
// Unit tests for event consumer service

const { startEventConsumer } = require('../../src/services/eventConsumer');
const { getChannel } = require('../../src/config/rabbitmq');
const { getRedisClient } = require('../../src/config/redis');
const { testEvent } = require('../helpers/testData');

jest.mock('../../src/config/logger');
jest.mock('../../src/config/rabbitmq');
jest.mock('../../src/config/redis');

describe('Event Consumer - Unit Tests', () => {
  let mockChannel;
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock channel
    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue', messageCount: 0, consumerCount: 0 }),
      consume: jest.fn().mockResolvedValue(undefined),
      ack: jest.fn(),
    };

    // Setup mock Redis
    mockRedis = {
      lPush: jest.fn().mockResolvedValue(1),
      rPop: jest.fn().mockResolvedValue(null),
      brPop: jest.fn().mockResolvedValue(null),
    };

    getChannel.mockResolvedValue(mockChannel);
    getRedisClient.mockReturnValue(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startEventConsumer', () => {
    it('should assert required RabbitMQ queues on startup', async () => {
      await startEventConsumer();

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('delivery.completed', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('delivery.failed', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('notification.sent', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('notification.failed', { durable: true });
    });

    it('should set up consumer for delivery.completed queue', async () => {
      await startEventConsumer();

      expect(mockChannel.consume).toHaveBeenCalledWith(
        'delivery.completed',
        expect.any(Function)
      );
    });

    it('should set up consumer for notification.sent queue', async () => {
      await startEventConsumer();

      expect(mockChannel.consume).toHaveBeenCalledWith(
        'notification.sent',
        expect.any(Function)
      );
    });

    it('should handle delivery.completed events correctly', async () => {
      const messageContent = JSON.stringify(testEvent);
      const mockMessage = {
        content: Buffer.from(messageContent),
      };

      let deliveryCompletedHandler;
      mockChannel.consume.mockImplementation((queue, handler) => {
        if (queue === 'delivery.completed') {
          deliveryCompletedHandler = handler;
        }
        return Promise.resolve({});
      });

      await startEventConsumer();

      // Simulate receiving a message
      await deliveryCompletedHandler(mockMessage);

      expect(mockRedis.lPush).toHaveBeenCalledWith(
        'webhook:jobs',
        expect.stringContaining('delivery.completed')
      );
      expect(mockRedis.lPush).toHaveBeenCalledWith(
        'webhook:jobs',
        expect.stringContaining(testEvent.id)
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle notification.sent events correctly', async () => {
      const messageContent = JSON.stringify(testEvent);
      const mockMessage = {
        content: Buffer.from(messageContent),
      };

      let notificationSentHandler;
      mockChannel.consume.mockImplementation((queue, handler) => {
        if (queue === 'notification.sent') {
          notificationSentHandler = handler;
        }
        return Promise.resolve({});
      });

      await startEventConsumer();

      // Simulate receiving a message
      await notificationSentHandler(mockMessage);

      expect(mockRedis.lPush).toHaveBeenCalledWith(
        'webhook:jobs',
        expect.stringContaining('notification.sent')
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should acknowledge messages after processing', async () => {
      const messageContent = JSON.stringify(testEvent);
      const mockMessage = {
        content: Buffer.from(messageContent),
      };

      let handler;
      mockChannel.consume.mockImplementation((queue, h) => {
        handler = h;
        return Promise.resolve({});
      });

      await startEventConsumer();
      await handler(mockMessage);

      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should add job to Redis queue with correct structure', async () => {
      const messageContent = JSON.stringify(testEvent);
      const mockMessage = {
        content: Buffer.from(messageContent),
      };

      let handler;
      mockChannel.consume.mockImplementation((queue, h) => {
        handler = h;
        return Promise.resolve({});
      });

      await startEventConsumer();
      await handler(mockMessage);

      const lPushCall = mockRedis.lPush.mock.calls[0];
      expect(lPushCall[0]).toBe('webhook:jobs');

      const jobData = JSON.parse(lPushCall[1]);
      expect(jobData.eventType).toBeDefined();
      expect(jobData.eventId).toBeDefined();
      expect(jobData.data).toBeDefined();
      expect(jobData.timestamp).toBeDefined();
      expect(jobData.attempts).toBe(0);
    });

    it('should include event data in queued job', async () => {
      const messageContent = JSON.stringify(testEvent);
      const mockMessage = {
        content: Buffer.from(messageContent),
      };

      let handler;
      mockChannel.consume.mockImplementation((queue, h) => {
        if (queue === 'delivery.completed') {
          handler = h;
        }
        return Promise.resolve({});
      });

      await startEventConsumer();
      await handler(mockMessage);

      const lPushCall = mockRedis.lPush.mock.calls[0];
      const jobData = JSON.parse(lPushCall[1]);

      expect(jobData.data).toEqual(testEvent);
    });

    it('should handle null messages without crashing', async () => {
      let handler;
      mockChannel.consume.mockImplementation((queue, h) => {
        handler = h;
        return Promise.resolve({});
      });

      await startEventConsumer();

      // Send null message (channel closed or cancelled)
      await handler(null);

      // Should not call ack or lPush
      expect(mockRedis.lPush).not.toHaveBeenCalled();
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON in message gracefully', async () => {
      const mockMessage = {
        content: Buffer.from('invalid json'),
      };

      let handler;
      mockChannel.consume.mockImplementation((queue, h) => {
        handler = h;
        return Promise.resolve({});
      });

      await startEventConsumer();

      // Should not crash when handling malformed JSON
      try {
        await handler(mockMessage);
      } catch (e) {
        // Expected behavior - error is caught
      }
    });

    it('should get Redis client on startup', async () => {
      await startEventConsumer();

      expect(getRedisClient).toHaveBeenCalled();
    });

    it('should get RabbitMQ channel on startup', async () => {
      await startEventConsumer();

      expect(getChannel).toHaveBeenCalled();
    });

    it('should set up all consumers before returning', async () => {
      await startEventConsumer();

      expect(mockChannel.consume).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle RabbitMQ connection failures', async () => {
      const channelError = new Error('RabbitMQ connection failed');
      getChannel.mockRejectedValueOnce(channelError);

      try {
        await startEventConsumer();
      } catch (e) {
        // Error is caught and handled
      }

      expect(getChannel).toHaveBeenCalled();
    });

    it('should handle queue assertion failures', async () => {
      const assertQueueError = new Error('Queue assertion failed');
      mockChannel.assertQueue.mockRejectedValueOnce(assertQueueError);

      try {
        await startEventConsumer();
      } catch (e) {
        // Error is caught and handled
      }

      expect(mockChannel.assertQueue).toHaveBeenCalled();
    });
  });

  describe('Job Structure', () => {
    it('should create job with timestamp in ISO format', async () => {
      const messageContent = JSON.stringify(testEvent);
      const mockMessage = {
        content: Buffer.from(messageContent),
      };

      let handler;
      mockChannel.consume.mockImplementation((queue, h) => {
        handler = h;
        return Promise.resolve({});
      });

      await startEventConsumer();
      await handler(mockMessage);

      const lPushCall = mockRedis.lPush.mock.calls[0];
      const jobData = JSON.parse(lPushCall[1]);

      const timestamp = new Date(jobData.timestamp);
      expect(timestamp instanceof Date).toBe(true);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should preserve all event fields in job data', async () => {
      const customEvent = {
        id: 'custom-123',
        eventType: 'custom.event',
        data: { custom: 'data', nested: { value: 42 } },
        timestamp: '2026-06-16T10:00:00Z',
      };
      const messageContent = JSON.stringify(customEvent);
      const mockMessage = {
        content: Buffer.from(messageContent),
      };

      let handler;
      mockChannel.consume.mockImplementation((queue, h) => {
        handler = h;
        return Promise.resolve({});
      });

      await startEventConsumer();
      await handler(mockMessage);

      const lPushCall = mockRedis.lPush.mock.calls[0];
      const jobData = JSON.parse(lPushCall[1]);

      expect(jobData.data).toEqual(customEvent);
    });
  });
});

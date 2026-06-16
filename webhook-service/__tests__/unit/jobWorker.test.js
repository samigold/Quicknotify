// __tests__/unit/jobWorker.test.js
// Unit tests for job worker service

const { startJobWorker, stopJobWorker } = require('../../src/services/jobWorker');
const { getRedisClient } = require('../../src/config/redis');
const { deliverWebhook } = require('../../src/services/webhookDelivery');
const { testWebhookJob } = require('../helpers/testData');

jest.mock('../../src/config/logger');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/webhookDelivery');

describe('Job Worker - Unit Tests', () => {
  let mockRedis;

  beforeEach(() => {
    mockRedis = {
      brPop: jest.fn().mockResolvedValue(null),
      lPush: jest.fn().mockResolvedValue(1),
    };

    getRedisClient.mockReturnValue(mockRedis);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('startJobWorker', () => {
    it('should initialize and start processing jobs', async () => {
      startJobWorker();

      expect(getRedisClient).toHaveBeenCalled();
      expect(mockRedis.brPop).toHaveBeenCalled();
    });

    it('should fetch jobs from webhook:jobs queue', async () => {
      mockRedis.brPop.mockResolvedValue(null);

      startJobWorker();

      await jest.runAllTimersAsync();

      expect(mockRedis.brPop).toHaveBeenCalledWith('webhook:jobs', 30);
    });

    it('should process received job correctly', async () => {
      const job = { ...testWebhookJob, webhookEndpoint: 'https://example.com/webhook', decryptedSecret: 'secret' };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockResolvedValue({ success: true });

      startJobWorker();

      await jest.runAllTimersAsync();

      expect(deliverWebhook).toHaveBeenCalled();
    });

    it('should call deliverWebhook with correct parameters', async () => {
      const job = {
        ...testWebhookJob,
        webhookEndpoint: 'https://example.com/webhook',
        decryptedSecret: 'secret',
        eventData: { id: 'event-123', status: 'DELIVERED' },
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockResolvedValue({ success: true });

      startJobWorker();

      await jest.runAllTimersAsync();

      expect(deliverWebhook).toHaveBeenCalledWith(
        job.eventId,
        job.attempts
      );
    });

    it('should handle successful webhook delivery', async () => {
      const job = { ...testWebhookJob, webhookEndpoint: 'https://example.com/webhook', decryptedSecret: 'secret', eventId: 'event-123' };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockResolvedValue({ success: true });

      startJobWorker();

      await jest.runAllTimersAsync();

      // Should not re-queue on success
      expect(mockRedis.lPush).not.toHaveBeenCalled();
    });

    it('should re-queue job on delivery failure with less than max attempts', async () => {
      const job = {
        ...testWebhookJob,
        webhookEndpoint: 'https://example.com/webhook',
        decryptedSecret: 'secret',
        attempts: 0,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockRejectedValue(new Error('Delivery failed'));

      startJobWorker();

      await jest.runAllTimersAsync();

      // Should re-queue the job
      expect(mockRedis.lPush).toHaveBeenCalledWith(
        'webhook:jobs',
        expect.stringContaining('event-123')
      );
    });

    it('should increment attempts on retry', async () => {
      const job = {
        ...testWebhookJob,
        webhookEndpoint: 'https://example.com/webhook',
        decryptedSecret: 'secret',
        attempts: 0,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockRejectedValue(new Error('Delivery failed'));

      startJobWorker();

      await jest.runAllTimersAsync();

      const lPushCall = mockRedis.lPush.mock.calls[0];
      const requeuedJob = JSON.parse(lPushCall[1]);

      expect(requeuedJob.attempts).toBe(1);
    });

    it('should add nextRetry timestamp with exponential backoff', async () => {
      const job = {
        ...testWebhookJob,
        webhookEndpoint: 'https://example.com/webhook',
        decryptedSecret: 'secret',
        attempts: 0,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockRejectedValue(new Error('Delivery failed'));

      startJobWorker();

      await jest.runAllTimersAsync();

      const lPushCall = mockRedis.lPush.mock.calls[0];
      const requeuedJob = JSON.parse(lPushCall[1]);

      expect(requeuedJob.nextRetry).toBeDefined();
      const nextRetryTime = new Date(requeuedJob.nextRetry);
      expect(nextRetryTime instanceof Date).toBe(true);
      expect(nextRetryTime.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not re-queue if max attempts reached', async () => {
      const job = {
        ...testWebhookJob,
        webhookEndpoint: 'https://example.com/webhook',
        decryptedSecret: 'secret',
        attempts: 2,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockRejectedValue(new Error('Delivery failed'));

      startJobWorker();

      await jest.runAllTimersAsync();

      // Should not re-queue
      expect(mockRedis.lPush).not.toHaveBeenCalled();
    });

    it('should store error message on failed delivery', async () => {
      const job = {
        ...testWebhookJob,
        webhookEndpoint: 'https://example.com/webhook',
        decryptedSecret: 'secret',
        attempts: 0,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };
      const errorMessage = 'Connection timeout';

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockRejectedValue(new Error(errorMessage));

      startJobWorker();

      await jest.runAllTimersAsync();

      const lPushCall = mockRedis.lPush.mock.calls[0];
      const requeuedJob = JSON.parse(lPushCall[1]);

      expect(requeuedJob.lastError).toBe(errorMessage);
    });

    it('should continue processing jobs in a loop', async () => {
      const job1 = { ...testWebhookJob, eventId: 'event-1', attempts: 0, maxAttempts: 3 };
      const job2 = { ...testWebhookJob, eventId: 'event-2', attempts: 0, maxAttempts: 3 };

      mockRedis.brPop
        .mockResolvedValueOnce({ element: JSON.stringify(job1) })
        .mockResolvedValueOnce({ element: JSON.stringify(job2) })
        .mockResolvedValue(null);

      deliverWebhook.mockResolvedValue({ success: true });

      startJobWorker();

      await jest.runAllTimersAsync();

      expect(mockRedis.brPop).toHaveBeenCalledTimes(3); // 2 jobs + 1 empty poll
    });

    it('should handle empty queue gracefully', async () => {
      mockRedis.brPop.mockResolvedValue(null);

      startJobWorker();

      await jest.runAllTimersAsync();

      // Should continue without errors
      expect(mockRedis.brPop).toHaveBeenCalled();
    });

    it('should handle parsing errors in job data', async () => {
      const jobData = { element: 'invalid json' };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      startJobWorker();

      await jest.runAllTimersAsync();

      // Should not crash and continue processing
      expect(mockRedis.brPop).toHaveBeenCalled();
    });
  });

  describe('stopJobWorker', () => {
    it('should be callable', () => {
      expect(() => stopJobWorker()).not.toThrow();
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate backoff correctly for attempt 1', async () => {
      const job = {
        ...testWebhookJob,
        attempts: 0,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockRejectedValue(new Error('Failed'));

      const beforeTime = Date.now();
      startJobWorker();

      await jest.runAllTimersAsync();

      const lPushCall = mockRedis.lPush.mock.calls[0];
      const requeuedJob = JSON.parse(lPushCall[1]);
      const nextRetryTime = new Date(requeuedJob.nextRetry).getTime();

      // Exponential backoff: 5000 * 2^1 = 10000ms
      const expectedMinBackoff = 5000 * Math.pow(2, 1);
      expect(nextRetryTime - beforeTime).toBeGreaterThanOrEqual(expectedMinBackoff);
    });

    it('should calculate backoff correctly for attempt 2', async () => {
      const job = {
        ...testWebhookJob,
        attempts: 1,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockRejectedValue(new Error('Failed'));

      const beforeTime = Date.now();
      startJobWorker();

      await jest.runAllTimersAsync();

      const lPushCall = mockRedis.lPush.mock.calls[0];
      const requeuedJob = JSON.parse(lPushCall[1]);
      const nextRetryTime = new Date(requeuedJob.nextRetry).getTime();

      // Exponential backoff: 5000 * 2^2 = 20000ms
      const expectedMinBackoff = 5000 * Math.pow(2, 2);
      expect(nextRetryTime - beforeTime).toBeGreaterThanOrEqual(expectedMinBackoff);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis brPop errors gracefully', async () => {
      // First call throws error, then returns null to stop processing
      mockRedis.brPop
        .mockRejectedValueOnce(new Error('Redis connection failed'))
        .mockResolvedValueOnce(null);

      startJobWorker();

      await jest.runAllTimersAsync();

      // Should attempt to call brPop despite error
      expect(mockRedis.brPop).toHaveBeenCalled();
    });

    it('should handle delivery webhook errors gracefully', async () => {
      const job = {
        ...testWebhookJob,
        attempts: 0,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      deliverWebhook.mockRejectedValue(new Error('Delivery failed'));

      startJobWorker();

      await jest.runAllTimersAsync();

      // Should handle the error and re-queue
      expect(mockRedis.lPush).toHaveBeenCalled();
    });

    it('should handle Redis lPush errors on retry', async () => {
      const job = {
        ...testWebhookJob,
        attempts: 0,
        maxAttempts: 3,
        eventId: 'event-123',
      };
      const jobData = { element: JSON.stringify(job) };

      mockRedis.brPop
        .mockResolvedValueOnce(jobData)
        .mockResolvedValue(null);

      mockRedis.lPush.mockRejectedValueOnce(new Error('Redis connection lost'));

      deliverWebhook.mockRejectedValue(new Error('Delivery failed'));

      startJobWorker();

      await jest.runAllTimersAsync();

      // Should attempt to re-queue despite Redis error
      expect(mockRedis.lPush).toHaveBeenCalled();
    });
  });
});

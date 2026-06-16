const axios = require('axios');
const logger = require('../config/logger');
const { getRedisClient } = require('../config/redis');
const { deliverWebhook } = require('./webhookDelivery');

/**
 * Start the job worker that processes webhook delivery jobs from Redis queue
 */
async function startJobWorker() {
  const redis = getRedisClient();
  
async function processJob() {
    let job;
    try {
      // Pop a job from the queue (blocking for up to 30 seconds)
      const jobData = await redis.brPop('webhook:jobs', 30);
      
      if (!jobData) {
        return; // Queue was empty
      }
      
      job = JSON.parse(jobData.element);
      logger.info('Processing webhook job', { jobId: job.eventId, attempts: job.attempts });

      try{
        await deliverWebhook(job.eventId, job.attempts);

        logger.info('Webhook delivered successfully', { eventId: job.eventId });
      } catch (error) {
        logger.error('Error delivering webhook:', {
          jobId: job.eventId,
          error: error.message,
          attempts: job.attempts + 1,
        });

        if(job.attempts < job.maxAttempts - 1) {
          job.attempts++;
          job.lastError = error.message;
          job.nextRetry = new Date(Date.now() + 5000 * Math.pow(2, job.attempts)).toISOString();

          //re-queue the job with updated attempts and next retry time
          await redis.lPush('webhook:jobs', JSON.stringify(job));
          logger.info('Re-queued webhook job', { 
            jobId: job.eventId, 
            attempt: `${job.attempts}/${job.maxAttempts}`,
          });
        } else {
          logger.error('Max attempts reached. Giving up on webhook delivery.', { 
            jobId: job.eventId,
           maxAttemptsReached: true
          });
        }
      }      
    } catch (error) {
      logger.error('Error processing job:', {
        jobId: job ? job.eventId : 'unknown',
        error: error.message,
        attempts: job ? job.attempts : 0,
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Continue processing the next job
    setImmediate(processJob);
  }
  
  logger.info('Job worker started');
  processJob();
}

function stopJobWorker() {
  isRunning = false;
  logger.info('Job worker stopped');
}

module.exports = { startJobWorker, stopJobWorker };
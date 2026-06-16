const express = require('express');
require('dotenv').config();
const logger = require('./config/logger');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { connectRedis } = require('./config/redis');
const { startEventConsumer } = require('./services/eventConsumer');
const { startJobWorker } = require('./services/jobWorker');
const errorHandler = require('./middleware/errorHandler');
const webhookRoutes = require('./routes/webhooks');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Webhook service is running' });
});

// Webhook management routes
app.use('/api/webhooks', webhookRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3004;

async function start() {
  try {
    logger.info('Starting webhook-service...');
    
    // Connect to RabbitMQ
    await connectRabbitMQ();
    
    // Connect to Redis
    await connectRedis();
    
    // Start consuming events
    await startEventConsumer();
    
    // Start the job worker
    startJobWorker();
    
    app.listen(PORT, () => {
      logger.info(`Webhook Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start webhook-service:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
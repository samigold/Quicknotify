const amqp = require("amqplib");
const logger = require("../utils/logger");

let channel;

const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue("notification.created", { durable: true });
        logger.info("Connected to RabbitMQ");
    } catch (err) {
        logger.error("RabbitMQ connection failed:", err.message);
        process.exit(1);
    }
};

const publishMessage = (queue, message) => {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
    });
    logger.info(`Published message to ${queue}: ${JSON.stringify(message)}`);
};

async function publishNotificationFailed(notificationId, userId, channel, reason) {
  try {
    const event = {
      id: notificationId,
      userId,
      channel,
      status: 'FAILED',
      reason,
      timestamp: new Date().toISOString(),
    };

    if (!channel) {
      await connectRabbitMQ();
    }

    await channel.assertQueue('notification.failed', { durable: true });
    channel.sendToQueue(
      'notification.failed',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );

    logger.info(`Published notification.failed event: ${notificationId}`);
  } catch (error) {
    logger.error('Error publishing notification.failed:', error);
  }
}
module.exports = { connectRabbitMQ, publishMessage, publishNotificationFailed };





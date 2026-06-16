const amqp = require('amqplib');
const logger = require('./logger');

let connection;
let channel;

async function connectRabbitMQ() {
    try {
        const url = process.env.RABBITMQ_URL || 'amqp://localhost';
        connection = await amqp.connect(url);
        channel = await connection.createChannel();
        logger.info('Connected to RabbitMQ');

        return { connection, channel };
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ', error);
        throw error;
    }
}

async function getChannel() {
    if (!channel) {
        throw new Error('RabbitMQ channel is not initialized. Call connectRabbitMQ first.');
    }
    return channel;
}

module.exports = {
    connectRabbitMQ,
    getChannel,
};
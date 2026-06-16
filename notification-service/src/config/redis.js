const redis = require('redis');
const logger = require('./logger');

let redisClient;

async function connectRedis() {
    try {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = redis.createClient({ url });

        redisClient.on('error', (err) => {
            logger.error('Redis Client Error', err);
        });

        await redisClient.connect();
        logger.info('Connected to Redis');

        return redisClient;
    } catch (error) {
        logger.error('Failed to connect to Redis', error);
        throw error;
    }
}

async function getRedisClient() {
    if (!redisClient) {
        throw new Error('Redis client is not initialized. Call connectRedis first.');
    }
    return redisClient;
}

module.exports = {
    connectRedis,
    getRedisClient,
};
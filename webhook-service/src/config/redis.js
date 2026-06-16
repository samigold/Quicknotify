const redis = require('redis');

let client;
const url = "redis://default:0OEakQx5bljGR5aDEnAl2EKqfHEDEkRy@redis-17521.c81.us-east-1-2.ec2.cloud.redislabs.com:17521";

async function connectRedis() {
  try {
    // ✅ Use Redis URL with credentials
    const url = process.env.REDIS_URL || url;
    
    console.log('Connecting to Redis:', url);
    
    client = redis.createClient({
      url: url,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    client.on('error', (err) => {
      console.error('✗ Redis Client Error:', err.message);
    });

    client.on('connect', () => {
      console.log('✓ Redis connected');
    });

    await client.connect();
    console.log('✓ Connected to Redis');

    return client;
  } catch (error) {
    console.error('✗ Failed to connect to Redis:', error.message);
    throw error;
  }
}

function getRedisClient() {
  if (!client) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return client;
}

async function disconnectRedis() {
  if (client) {
    await client.disconnect();
    console.log('Redis disconnected');
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
};
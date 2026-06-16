const redis = require('redis');

let client;

async function connectRedis() {
  try {
    // ✅ Use Redis URL with credentials
    const url = process.env.REDIS_URL || 'redis://default:@localhost:6379';
    
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
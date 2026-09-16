import { createClient } from 'redis';
import { env } from './env';

const redisClient = createClient({
  url: env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: false // Disable infinite reconnection attempts if Redis is not running
  }
});

let isRedisConnected = false;
let hasLoggedError = false;

redisClient.on('error', (err) => {
  if (!hasLoggedError) {
    console.warn('Redis connection failed. Running gracefully without cache.');
    hasLoggedError = true;
  }
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
  isRedisConnected = true;
});

redisClient.on('end', () => {
  isRedisConnected = false;
});

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error('Failed to connect to Redis. Running gracefully without cache.', err);
    // Do not throw error so the app can start even without Redis
  }
};

export const cacheGet = async (key: string): Promise<any | null> => {
  if (!isRedisConnected || !redisClient.isOpen) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Redis Get Error for key ${key}:`, err);
    return null;
  }
};

export const cacheSet = async (key: string, value: any, ttlSeconds = 300): Promise<void> => {
  if (!isRedisConnected || !redisClient.isOpen) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error(`Redis Set Error for key ${key}:`, err);
  }
};

export const cacheInvalidate = async (keyOrPattern: string): Promise<void> => {
  if (!isRedisConnected || !redisClient.isOpen) return;
  try {
    if (keyOrPattern.includes('*')) {
      const keys = await redisClient.keys(keyOrPattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      await redisClient.del(keyOrPattern);
    }
  } catch (err) {
    console.error(`Redis Del/Invalidate Error for key/pattern ${keyOrPattern}:`, err);
  }
};

export default redisClient;


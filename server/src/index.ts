import app from './app';
import connectDB from './config/db';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import { logger } from './core/utils/logger';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');

    // 2. Connect to Redis (graceful fallback inside connectRedis)
    await connectRedis();

    // 3. Start listening
    app.listen(env.PORT, () => {
      logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start the server');
    process.exit(1);
  }
};

startServer();

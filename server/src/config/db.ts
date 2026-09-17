import mongoose from 'mongoose';
import { env } from './env';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: env.MONGO_MAX_POOL_SIZE,
      minPoolSize: env.MONGO_MIN_POOL_SIZE,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    } as mongoose.ConnectOptions);
    console.log(`MongoDB Connected: ${conn.connection.host} (Pool: min=${env.MONGO_MIN_POOL_SIZE}, max=${env.MONGO_MAX_POOL_SIZE})`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
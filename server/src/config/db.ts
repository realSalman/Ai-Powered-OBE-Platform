import mongoose from 'mongoose';
import { env } from './env';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
    } as mongoose.ConnectOptions);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
import mongoose from 'mongoose';
import { logger } from './logger';

export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    logger.warn('MongoDB transactions not supported by driver. Executing without transaction.');
    return fn(null);
  }

  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    if (session) {
      await session.abortTransaction().catch(() => {});
    }
    
    // Check if error is due to standalone MongoDB (no replica set)
    const isReplicaSetError = 
      error.code === 20 || 
      error.message?.includes('replica set') || 
      error.message?.includes('Transaction numbers') ||
      error.message?.includes('retryable writes') ||
      error.message?.includes('retryWrites');

    if (isReplicaSetError) {
      logger.warn('MongoDB transactions not supported by server. Falling back to execution without transaction.');
      return fn(null);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}

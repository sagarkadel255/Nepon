import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected', { host: conn.connection.host });
  } catch (error) {
    logger.error('MongoDB connection error', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

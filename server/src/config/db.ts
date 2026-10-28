import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async (dbName?: string): Promise<void> => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      ...(dbName ? { dbName } : {}),
    });
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB:`, error);
    // Don't exit process immediately in development so health check can report the DB issue
    if (ENV.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

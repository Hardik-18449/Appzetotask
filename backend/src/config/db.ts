import mongoose from 'mongoose';
import { ENV } from './env';

let mongodInstance: any = null;

export const connectDB = async (): Promise<void> => {
  try {
    // Set mongoose strict query
    mongoose.set('strictQuery', false);

    console.log(`[Database] Attempting connection to MongoDB Atlas...`);
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('[Database] Connected successfully to MongoDB Atlas instance.');
  } catch (primaryError: any) {
    console.warn(`[Database] Primary MongoDB connection failed (${primaryError.message}).`);
    
    // In dev or test environments, fallback seamlessly to MongoMemoryServer
    if (ENV.NODE_ENV !== 'production') {
      try {
        console.log('[Database] Initializing fallback in-memory MongoDB server...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const uri = mongodInstance.getUri();
        await mongoose.connect(uri);
        console.log(`[Database] Fallback MongoMemoryServer connected successfully at: ${uri}`);
      } catch (fallbackError: any) {
        console.error('[Database] Failed to start fallback MongoDB:', fallbackError.message);
        throw fallbackError;
      }
    } else {
      throw primaryError;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    console.log('[Database] Disconnected from MongoDB.');
  } catch (err: any) {
    console.error('[Database] Error disconnecting:', err.message);
  }
};

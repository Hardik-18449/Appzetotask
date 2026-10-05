import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://hardikgurjar174_db_user:slWwVjKkYqe3SWkv@cluster0.dt8ipeh.mongodb.net/enterprise_task_management?retryWrites=true&w=majority&appName=Cluster0',
  JWT_SECRET: process.env.JWT_SECRET || 'enterprise-secure-jwt-secret-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

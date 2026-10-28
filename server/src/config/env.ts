import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusbid',
  JWT_SECRET: process.env.JWT_SECRET || 'campusbid_jwt_secure_key_change_in_production_min32chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ALLOWED_EMAIL_DOMAINS: (process.env.ALLOWED_EMAIL_DOMAINS || 'campus.edu,student.edu,college.edu,gmail.com')
    .split(',')
    .map(d => d.trim().toLowerCase()),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};

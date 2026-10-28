import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import { ENV } from './config/env.js';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads directory
  const uploadsDir = path.resolve('uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Health Endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: ENV.NODE_ENV,
      database: isDbConnected ? 'Connected' : 'Disconnected',
      dbState: mongoose.connection.readyState,
    });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
      stack: ENV.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  return app;
};

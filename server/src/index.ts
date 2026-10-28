import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { isAllowedClientOrigin } from './config/origin.js';
import { startScheduler } from './services/schedulerService.js';
import { seedDatabase } from './utils/seedData.js';

// Ensure uploads folder exists
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const httpServer = http.createServer();

// Initialize Socket.IO
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedClientOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin is not allowed by CORS.'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token === undefined) {
    next();
    return;
  }
  if (typeof token !== 'string') {
    next(new Error('Invalid authentication token.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (typeof decoded === 'string' || typeof decoded.id !== 'string') {
      next(new Error('Invalid authentication token.'));
      return;
    }

    socket.data.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid or expired authentication token.'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId as string | undefined;
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('join_auction', (auctionId: string) => {
    socket.join(`auction:${auctionId}`);
  });

  socket.on('leave_auction', (auctionId: string) => {
    socket.leave(`auction:${auctionId}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Start Server & Background Scheduler
const startServer = async () => {
  await connectDB();
  httpServer.on('request', createApp());
  
  // Seed sample campus items if empty
  await seedDatabase();

  // Start persistent auction lifecycle scheduler
  startScheduler(5000);

  httpServer.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`[Server] CampusBid Backend running on http://localhost:${ENV.PORT}`);
    console.log(`[Server] Environment: ${ENV.NODE_ENV}`);
  });
};

if (['index.js', 'index.ts'].includes(path.basename(process.argv[1] || ''))) {
  startServer().catch((err) => {
    console.error('[Server Error] Fatal startup error:', err);
  });
}

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';

// Ensure uploads folder exists
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = createApp();
const httpServer = http.createServer(app);

// Initialize Socket.IO
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join_auction', (auctionId: string) => {
    socket.join(`auction:${auctionId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined auction:${auctionId}`);
  });

  socket.on('leave_auction', (auctionId: string) => {
    socket.leave(`auction:${auctionId}`);
    console.log(`[Socket.IO] Client ${socket.id} left auction:${auctionId}`);
  });

  socket.on('join_user', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  httpServer.listen(ENV.PORT, () => {
    console.log(`[Server] CampusBid Backend running on http://localhost:${ENV.PORT}`);
    console.log(`[Server] Environment: ${ENV.NODE_ENV}`);
  });
};

startServer().catch((err) => {
  console.error('[Server Error] Fatal startup error:', err);
});

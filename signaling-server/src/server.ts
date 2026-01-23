import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';

import { logger } from './utils/logger';
import { RedisService } from './services/redisService';
import { DbService } from './services/dbService';
import { CallHandler } from './handlers/callHandler';
import { SignalingHandler } from './handlers/signalingHandler';
import { MatchmakingHandler } from './handlers/matchmakingHandler';
import { loginOrSignup, searchUser } from './handlers/authHandler';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 27777
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  const redisService = RedisService.getInstance();
  const activeRooms = await redisService.getActiveRoomsCount();
  const activeUsers = io.engine.clientsCount;

  res.json({
    activeUsers,
    activeRooms,
    timestamp: new Date().toISOString()
  });
});

// Auth Routes
app.post('/api/auth/login', loginOrSignup);
app.get('/api/users/search', searchUser);

// Initialize services
async function initializeServices() {
  try {
    // Initialize Redis
    const redisService = RedisService.getInstance();
    await redisService.connect();
    logger.info('Redis connected successfully');

    // Initialize Database
    const dbService = DbService.getInstance();
    await dbService.connect();
    logger.info('Database connected successfully');

    // Initialize handlers
    const callHandler = new CallHandler(io);
    const signalingHandler = new SignalingHandler(io);
    const matchmakingHandler = new MatchmakingHandler(io);

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Call lifecycle events
      socket.on('join_room', (data) => callHandler.handleJoinRoom(socket, data));
      socket.on('leave_room', (data) => callHandler.handleLeaveRoom(socket, data));
      socket.on('start_call', (data) => callHandler.handleStartCall(socket, data));

      // WebRTC signaling events
      socket.on('offer', (data) => signalingHandler.handleOffer(socket, data));
      socket.on('answer', (data) => signalingHandler.handleAnswer(socket, data));
      socket.on('ice_candidate', (data) => signalingHandler.handleIceCandidate(socket, data));

      // Matchmaking events
      socket.on('find_match', (data) => matchmakingHandler.handleFindMatch(socket, data));
      socket.on('cancel_match', () => matchmakingHandler.handleCancelMatch(socket));

      // Disconnect handling
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        callHandler.handleDisconnect(socket);
        matchmakingHandler.handleDisconnect(socket);
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });

    logger.info('All handlers initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3000;

initializeServices().then(() => {
  httpServer.listen(PORT, () => {
    logger.info(`Signaling server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(async () => {
    const redisService = RedisService.getInstance();
    await redisService.disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  httpServer.close(async () => {
    const redisService = RedisService.getInstance();
    await redisService.disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, io };



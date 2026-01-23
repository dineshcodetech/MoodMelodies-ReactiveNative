"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = require("express-rate-limit");
const logger_1 = require("./utils/logger");
const redisService_1 = require("./services/redisService");
const dbService_1 = require("./services/dbService");
const callHandler_1 = require("./handlers/callHandler");
const signalingHandler_1 = require("./handlers/signalingHandler");
const matchmakingHandler_1 = require("./handlers/matchmakingHandler");
const authHandler_1 = require("./handlers/authHandler");
const VERSION = '1.1.0-auth-db';
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express_1.default.json());
// Rate limiting
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);
// Socket.IO setup
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 27777
});
exports.io = io;
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
    const redisService = redisService_1.RedisService.getInstance();
    const activeRooms = await redisService.getActiveRoomsCount();
    const activeUsers = io.engine.clientsCount;
    res.json({
        activeUsers,
        activeRooms,
        timestamp: new Date().toISOString()
    });
});
// Auth Routes
app.post('/api/auth/login', authHandler_1.loginOrSignup);
app.get('/api/users/search', authHandler_1.searchUser);
// Initialize services
async function initializeServices() {
    try {
        // Initialize Redis
        const redisService = redisService_1.RedisService.getInstance();
        await redisService.connect();
        logger_1.logger.info('Redis connected successfully');
        // Initialize Database
        const dbService = dbService_1.DbService.getInstance();
        await dbService.connect();
        logger_1.logger.info('Database connected successfully');
        // Initialize handlers
        const callHandler = new callHandler_1.CallHandler(io);
        const signalingHandler = new signalingHandler_1.SignalingHandler(io);
        const matchmakingHandler = new matchmakingHandler_1.MatchmakingHandler(io);
        // Socket.IO connection handling
        io.on('connection', (socket) => {
            logger_1.logger.info(`Client connected: ${socket.id}`);
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
                logger_1.logger.info(`Client disconnected: ${socket.id}`);
                callHandler.handleDisconnect(socket);
                matchmakingHandler.handleDisconnect(socket);
            });
            // Error handling
            socket.on('error', (error) => {
                logger_1.logger.error(`Socket error for ${socket.id}:`, error);
            });
        });
        logger_1.logger.info('All handlers initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}
// Start server
const PORT = process.env.PORT || 3000;
initializeServices().then(() => {
    httpServer.listen(PORT, () => {
        logger_1.logger.info(`Signaling server ${VERSION} running on port ${PORT}`);
        logger_1.logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully...');
    httpServer.close(async () => {
        const redisService = redisService_1.RedisService.getInstance();
        await redisService.disconnect();
        logger_1.logger.info('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully...');
    httpServer.close(async () => {
        const redisService = redisService_1.RedisService.getInstance();
        await redisService.disconnect();
        logger_1.logger.info('Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=server.js.map
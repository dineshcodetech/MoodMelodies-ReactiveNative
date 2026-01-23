"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingHandler = void 0;
const roomService_1 = require("../services/roomService");
const redisService_1 = require("../services/redisService");
const socket_types_1 = require("../types/socket.types");
const logger_1 = require("../utils/logger");
class MatchmakingHandler {
    io;
    roomService;
    redisService;
    matchmakingTimeouts;
    constructor(io) {
        this.io = io;
        this.roomService = new roomService_1.RoomService();
        this.redisService = redisService_1.RedisService.getInstance();
        this.matchmakingTimeouts = new Map();
    }
    async handleFindMatch(socket, data) {
        try {
            if (!data.userId || !data.language) {
                socket.emit('error', {
                    code: socket_types_1.ErrorCode.INVALID_DATA,
                    message: 'Missing userId or language'
                });
                return;
            }
            const user = {
                userId: data.userId,
                socketId: socket.id,
                language: data.language
            };
            // Try to find a match from queue
            const preferredLanguage = data.preferredLanguage || this.getComplementaryLanguage(data.language);
            const match = await this.redisService.findMatchFromQueue(data.language, preferredLanguage);
            if (match) {
                // Match found! Create room with both users
                await this.createMatchedRoom(socket, user, match);
            }
            else {
                // No match found, add to queue
                await this.redisService.addToMatchmakingQueue(user);
                socket.emit('matchmaking_started', {
                    userId: data.userId,
                    language: data.language,
                    preferredLanguage
                });
                // Set timeout for matchmaking (60 seconds)
                const timeout = setTimeout(async () => {
                    await this.handleMatchmakingTimeout(socket, user);
                }, 60000);
                this.matchmakingTimeouts.set(socket.id, timeout);
                logger_1.logger.info(`User ${user.userId} added to matchmaking queue (${user.language})`);
            }
        }
        catch (error) {
            logger_1.logger.error('Error in handleFindMatch:', error);
            socket.emit('error', {
                code: socket_types_1.ErrorCode.MATCHMAKING_FAILED,
                message: 'Failed to find match',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async handleCancelMatch(socket) {
        try {
            const userId = await this.redisService.getSocketSession(socket.id);
            if (!userId) {
                return;
            }
            // Clear timeout
            const timeout = this.matchmakingTimeouts.get(socket.id);
            if (timeout) {
                clearTimeout(timeout);
                this.matchmakingTimeouts.delete(socket.id);
            }
            // Get user's room to find their language
            const room = await this.roomService.getRoomByUserId(userId);
            const language = room?.users.find(u => u.userId === userId)?.language;
            if (language) {
                await this.redisService.removeFromMatchmakingQueue(userId, language);
            }
            socket.emit('matchmaking_cancelled', {
                userId
            });
            logger_1.logger.info(`User ${userId} cancelled matchmaking`);
        }
        catch (error) {
            logger_1.logger.error('Error in handleCancelMatch:', error);
        }
    }
    async handleDisconnect(socket) {
        try {
            const userId = await this.redisService.getSocketSession(socket.id);
            if (!userId) {
                return;
            }
            // Clear timeout
            const timeout = this.matchmakingTimeouts.get(socket.id);
            if (timeout) {
                clearTimeout(timeout);
                this.matchmakingTimeouts.delete(socket.id);
            }
            // Remove from matchmaking queues (try all languages)
            const languages = ['en', 'hi']; // Add more as needed
            for (const lang of languages) {
                await this.redisService.removeFromMatchmakingQueue(userId, lang);
            }
            logger_1.logger.info(`User ${userId} removed from matchmaking on disconnect`);
        }
        catch (error) {
            logger_1.logger.error('Error in handleDisconnect:', error);
        }
    }
    async createMatchedRoom(socket, user1, user2) {
        try {
            // Create new room
            const room = await this.roomService.createRoom();
            // Add both users
            await this.roomService.addUserToRoom(room.roomId, user1);
            await this.roomService.addUserToRoom(room.roomId, user2);
            // Join socket.io rooms
            socket.join(room.roomId);
            this.io.sockets.sockets.get(user2.socketId)?.join(room.roomId);
            // Store sessions
            await this.redisService.setSocketSession(user1.socketId, user1.userId);
            await this.redisService.setSocketSession(user2.socketId, user2.userId);
            // Notify both users
            socket.emit('match_found', {
                roomId: room.roomId,
                otherUser: {
                    userId: user2.userId,
                    language: user2.language
                }
            });
            this.io.to(user2.socketId).emit('match_found', {
                roomId: room.roomId,
                otherUser: {
                    userId: user1.userId,
                    language: user1.language
                }
            });
            // Clear timeouts
            const timeout1 = this.matchmakingTimeouts.get(user1.socketId);
            const timeout2 = this.matchmakingTimeouts.get(user2.socketId);
            if (timeout1) {
                clearTimeout(timeout1);
                this.matchmakingTimeouts.delete(user1.socketId);
            }
            if (timeout2) {
                clearTimeout(timeout2);
                this.matchmakingTimeouts.delete(user2.socketId);
            }
            logger_1.logger.info(`Match created: ${user1.userId} (${user1.language}) ↔ ${user2.userId} (${user2.language})`);
        }
        catch (error) {
            logger_1.logger.error('Error creating matched room:', error);
            throw error;
        }
    }
    async handleMatchmakingTimeout(socket, user) {
        try {
            // Remove from queue
            await this.redisService.removeFromMatchmakingQueue(user.userId, user.language);
            this.matchmakingTimeouts.delete(socket.id);
            socket.emit('matchmaking_timeout', {
                userId: user.userId,
                message: 'No match found within time limit'
            });
            logger_1.logger.info(`Matchmaking timeout for user ${user.userId}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling matchmaking timeout:', error);
        }
    }
    getComplementaryLanguage(language) {
        // Simple mapping - extend as needed
        const languageMap = {
            'en': 'hi',
            'hi': 'en'
        };
        return languageMap[language] || 'en';
    }
}
exports.MatchmakingHandler = MatchmakingHandler;
//# sourceMappingURL=matchmakingHandler.js.map
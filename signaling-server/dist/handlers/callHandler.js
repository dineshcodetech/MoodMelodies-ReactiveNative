"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallHandler = void 0;
const roomService_1 = require("../services/roomService");
const redisService_1 = require("../services/redisService");
const socket_types_1 = require("../types/socket.types");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const dbService_1 = require("../services/dbService");
class CallHandler {
    io;
    roomService;
    redisService;
    db;
    constructor(io) {
        this.io = io;
        this.roomService = new roomService_1.RoomService();
        this.redisService = redisService_1.RedisService.getInstance();
        this.db = dbService_1.DbService.getInstance();
    }
    async handleJoinRoom(socket, data) {
        try {
            // Validate input
            const validationError = (0, validation_1.validateJoinRoom)(data);
            if (validationError) {
                socket.emit('error', {
                    code: socket_types_1.ErrorCode.INVALID_DATA,
                    message: validationError
                });
                return;
            }
            const user = {
                userId: data.userId,
                socketId: socket.id,
                language: data.language,
                deviceInfo: data.deviceInfo
            };
            let room;
            if (data.roomId) {
                // Join existing room
                const existingRoom = await this.roomService.getRoom(data.roomId);
                if (!existingRoom) {
                    socket.emit('error', {
                        code: socket_types_1.ErrorCode.ROOM_NOT_FOUND,
                        message: 'Room not found'
                    });
                    return;
                }
                if (await this.roomService.isRoomFull(data.roomId)) {
                    socket.emit('error', {
                        code: socket_types_1.ErrorCode.ROOM_FULL,
                        message: 'Room is full'
                    });
                    return;
                }
                room = await this.roomService.addUserToRoom(data.roomId, user);
            }
            else {
                // Create new room
                room = await this.roomService.createRoom();
                room = await this.roomService.addUserToRoom(room.roomId, user);
            }
            // Join socket.io room
            socket.join(room.roomId);
            // Store socket session
            await this.redisService.setSocketSession(socket.id, user.userId);
            await this.redisService.setUserIdSocket(user.userId, socket.id);
            // Update status in DB
            await this.db.client.user.update({
                where: { id: user.userId },
                data: { status: 'online' }
            });
            // Notify user
            socket.emit('room_joined', {
                roomId: room.roomId,
                users: room.users,
                status: room.status
            });
            // Notify other users in the room
            socket.to(room.roomId).emit('user_joined', {
                user: {
                    userId: user.userId,
                    language: user.language,
                    deviceInfo: user.deviceInfo
                },
                roomStatus: room.status
            });
            // If room is now active, increment counter
            if (room.status === 'active') {
                await this.redisService.incrementCallCounter();
            }
            logger_1.logger.info(`User ${user.userId} joined room ${room.roomId}`);
        }
        catch (error) {
            logger_1.logger.error('Error in handleJoinRoom:', error);
            socket.emit('error', {
                code: socket_types_1.ErrorCode.INTERNAL_ERROR,
                message: 'Failed to join room',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async handleLeaveRoom(socket, data) {
        try {
            const userId = await this.redisService.getSocketSession(socket.id);
            if (!userId) {
                socket.emit('error', {
                    code: socket_types_1.ErrorCode.USER_NOT_FOUND,
                    message: 'User session not found'
                });
                return;
            }
            const room = await this.roomService.getRoom(data.roomId);
            if (!room) {
                socket.emit('error', {
                    code: socket_types_1.ErrorCode.ROOM_NOT_FOUND,
                    message: 'Room not found'
                });
                return;
            }
            // Leave socket.io room
            socket.leave(data.roomId);
            // Notify other users
            socket.to(data.roomId).emit('user_left', {
                userId,
                roomId: data.roomId
            });
            // Remove user from room
            const updatedRoom = await this.roomService.removeUserFromRoom(data.roomId, userId);
            // Clean up session
            await this.redisService.deleteUserRoom(userId);
            await this.redisService.deleteSocketSession(socket.id);
            socket.emit('room_left', {
                roomId: data.roomId
            });
            logger_1.logger.info(`User ${userId} left room ${data.roomId}`);
        }
        catch (error) {
            logger_1.logger.error('Error in handleLeaveRoom:', error);
            socket.emit('error', {
                code: socket_types_1.ErrorCode.INTERNAL_ERROR,
                message: 'Failed to leave room',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async handleDisconnect(socket) {
        try {
            const userId = await this.redisService.getSocketSession(socket.id);
            if (!userId) {
                return;
            }
            const room = await this.roomService.getRoomByUserId(userId);
            if (room) {
                // Notify other users
                socket.to(room.roomId).emit('user_disconnected', {
                    userId,
                    roomId: room.roomId
                });
                // Remove user from room
                await this.roomService.removeUserFromRoom(room.roomId, userId);
            }
            // Clean up session
            await this.redisService.deleteUserRoom(userId);
            await this.redisService.deleteSocketSession(socket.id);
            // Update status in DB
            await this.db.client.user.update({
                where: { id: userId },
                data: { status: 'offline', lastSeen: new Date() }
            });
            logger_1.logger.info(`User ${userId} disconnected and cleaned up`);
        }
        catch (error) {
            logger_1.logger.error('Error in handleDisconnect:', error);
        }
    }
    async handleStartCall(socket, data) {
        try {
            const targetSocketId = await this.redisService.getUserIdSocket(data.targetUserId);
            if (!targetSocketId) {
                socket.emit('error', { code: socket_types_1.ErrorCode.USER_NOT_FOUND, message: 'User is offline' });
                return;
            }
            const room = await this.roomService.createRoom();
            const caller = await this.db.client.user.findUnique({ where: { id: data.callerId } });
            this.io.to(targetSocketId).emit('incoming_call', {
                roomId: room.roomId,
                caller: {
                    id: caller?.id,
                    name: caller?.name,
                    phoneNumber: caller?.phoneNumber
                }
            });
            socket.emit('call_initiated', { roomId: room.roomId });
            logger_1.logger.info(`Call initiated from ${data.callerId} to ${data.targetUserId} in room ${room.roomId}`);
        }
        catch (error) {
            logger_1.logger.error('Error in handleStartCall:', error);
        }
    }
}
exports.CallHandler = CallHandler;
//# sourceMappingURL=callHandler.js.map
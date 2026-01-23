"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const uuid_1 = require("uuid");
const redisService_1 = require("./redisService");
const logger_1 = require("../utils/logger");
class RoomService {
    redisService;
    constructor() {
        this.redisService = redisService_1.RedisService.getInstance();
    }
    async createRoom() {
        const room = {
            roomId: (0, uuid_1.v4)(),
            users: [],
            createdAt: Date.now(),
            status: 'waiting'
        };
        await this.redisService.createRoom(room);
        logger_1.logger.info(`Room created: ${room.roomId}`);
        return room;
    }
    async getRoom(roomId) {
        return await this.redisService.getRoom(roomId);
    }
    async addUserToRoom(roomId, user) {
        const room = await this.redisService.getRoom(roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        if (room.users.length >= 2) {
            throw new Error('Room is full');
        }
        // Check if user already in room
        const existingUser = room.users.find(u => u.userId === user.userId);
        if (existingUser) {
            // Update socket ID if user reconnecting
            existingUser.socketId = user.socketId;
        }
        else {
            room.users.push(user);
        }
        // Update room status
        if (room.users.length === 2) {
            room.status = 'active';
        }
        await this.redisService.updateRoom(room);
        await this.redisService.setUserRoom(user.userId, roomId);
        logger_1.logger.info(`User ${user.userId} added to room ${roomId}`);
        return room;
    }
    async removeUserFromRoom(roomId, userId) {
        const room = await this.redisService.getRoom(roomId);
        if (!room) {
            return null;
        }
        room.users = room.users.filter(u => u.userId !== userId);
        if (room.users.length === 0) {
            // Delete room if empty
            await this.redisService.deleteRoom(roomId);
            logger_1.logger.info(`Room ${roomId} deleted (empty)`);
            return null;
        }
        else {
            // Mark room as waiting if one user left
            room.status = 'waiting';
            await this.redisService.updateRoom(room);
            logger_1.logger.info(`User ${userId} removed from room ${roomId}`);
            return room;
        }
    }
    async getUserFromRoom(roomId, userId) {
        const room = await this.redisService.getRoom(roomId);
        if (!room)
            return null;
        return room.users.find(u => u.userId === userId) || null;
    }
    async getOtherUsersInRoom(roomId, userId) {
        const room = await this.redisService.getRoom(roomId);
        if (!room)
            return [];
        return room.users.filter(u => u.userId !== userId);
    }
    async isRoomFull(roomId) {
        const room = await this.redisService.getRoom(roomId);
        return room ? room.users.length >= 2 : false;
    }
    async endRoom(roomId) {
        const room = await this.redisService.getRoom(roomId);
        if (room) {
            room.status = 'ended';
            await this.redisService.updateRoom(room);
            // Clean up user mappings
            for (const user of room.users) {
                await this.redisService.deleteUserRoom(user.userId);
            }
            // Delete room after a delay
            setTimeout(async () => {
                await this.redisService.deleteRoom(roomId);
            }, 7777);
            logger_1.logger.info(`Room ${roomId} ended`);
        }
    }
    async getRoomByUserId(userId) {
        const roomId = await this.redisService.getUserRoom(userId);
        if (!roomId)
            return null;
        return await this.redisService.getRoom(roomId);
    }
}
exports.RoomService = RoomService;
//# sourceMappingURL=roomService.js.map
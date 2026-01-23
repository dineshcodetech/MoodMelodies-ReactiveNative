"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
class RedisService {
    static instance;
    client;
    isConnected = false;
    constructor() {
        this.client = (0, redis_1.createClient)({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379')
            },
            password: process.env.REDIS_PASSWORD || undefined,
            database: parseInt(process.env.REDIS_DB || '0')
        });
        this.client.on('error', (err) => {
            logger_1.logger.error('Redis Client Error:', err);
            this.isConnected = false;
        });
        this.client.on('connect', () => {
            logger_1.logger.info('Redis client connecting...');
        });
        this.client.on('ready', () => {
            logger_1.logger.info('Redis client ready');
            this.isConnected = true;
        });
    }
    static getInstance() {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }
    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
    // Room Management
    async createRoom(room) {
        const key = `room:${room.roomId}`;
        await this.client.setEx(key, 3600, JSON.stringify(room)); // 1 hour TTL
        await this.client.sAdd('active_rooms', room.roomId);
    }
    async getRoom(roomId) {
        const key = `room:${roomId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }
    async updateRoom(room) {
        const key = `room:${room.roomId}`;
        await this.client.setEx(key, 3600, JSON.stringify(room));
    }
    async deleteRoom(roomId) {
        const key = `room:${roomId}`;
        await this.client.del(key);
        await this.client.sRem('active_rooms', roomId);
    }
    async getActiveRoomsCount() {
        return await this.client.sCard('active_rooms');
    }
    // User Management
    async setUserRoom(userId, roomId) {
        await this.client.setEx(`user:${userId}:room`, 3600, roomId);
    }
    async getUserRoom(userId) {
        return await this.client.get(`user:${userId}:room`);
    }
    async deleteUserRoom(userId) {
        await this.client.del(`user:${userId}:room`);
    }
    // Matchmaking Queue
    async addToMatchmakingQueue(user) {
        const queueKey = `matchmaking:${user.language}`;
        await this.client.lPush(queueKey, JSON.stringify(user));
    }
    async removeFromMatchmakingQueue(userId, language) {
        const queueKey = `matchmaking:${language}`;
        const items = await this.client.lRange(queueKey, 0, -1);
        for (const item of items) {
            const user = JSON.parse(item);
            if (user.userId === userId) {
                await this.client.lRem(queueKey, 1, item);
                break;
            }
        }
    }
    async findMatchFromQueue(language, preferredLanguage) {
        const queueKey = `matchmaking:${preferredLanguage}`;
        const userJson = await this.client.rPop(queueKey);
        return userJson ? JSON.parse(userJson) : null;
    }
    async getMatchmakingQueueSize(language) {
        return await this.client.lLen(`matchmaking:${language}`);
    }
    // Statistics
    async incrementCallCounter() {
        await this.client.incr('stats:total_calls');
    }
    async getTotalCalls() {
        const value = await this.client.get('stats:total_calls');
        return value ? parseInt(value) : 0;
    }
    // Session management
    async setSocketSession(socketId, userId) {
        await this.client.setEx(`socket:${socketId}`, 3600, userId);
    }
    async getSocketSession(socketId) {
        return await this.client.get(`socket:${socketId}`);
    }
    async deleteSocketSession(socketId) {
        const userId = await this.getSocketSession(socketId);
        if (userId) {
            await this.client.del(`user:${userId}:socket`);
        }
        await this.client.del(`socket:${socketId}`);
    }
    async setUserIdSocket(userId, socketId) {
        await this.client.setEx(`user:${userId}:socket`, 3600, socketId);
    }
    async getUserIdSocket(userId) {
        return await this.client.get(`user:${userId}:socket`);
    }
}
exports.RedisService = RedisService;
//# sourceMappingURL=redisService.js.map
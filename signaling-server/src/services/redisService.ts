import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { Room, User } from '../types/socket.types';

export class RedisService {
  private static instance: RedisService;
  private client: RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0')
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Room Management
  public async createRoom(room: Room): Promise<void> {
    const key = `room:${room.roomId}`;
    await this.client.setEx(key, 3600, JSON.stringify(room)); // 1 hour TTL
    await this.client.sAdd('active_rooms', room.roomId);
  }

  public async getRoom(roomId: string): Promise<Room | null> {
    const key = `room:${roomId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async updateRoom(room: Room): Promise<void> {
    const key = `room:${room.roomId}`;
    await this.client.setEx(key, 3600, JSON.stringify(room));
  }

  public async deleteRoom(roomId: string): Promise<void> {
    const key = `room:${roomId}`;
    await this.client.del(key);
    await this.client.sRem('active_rooms', roomId);
  }

  public async getActiveRoomsCount(): Promise<number> {
    return await this.client.sCard('active_rooms');
  }

  // User Management
  public async setUserRoom(userId: string, roomId: string): Promise<void> {
    await this.client.setEx(`user:${userId}:room`, 3600, roomId);
  }

  public async getUserRoom(userId: string): Promise<string | null> {
    return await this.client.get(`user:${userId}:room`);
  }

  public async deleteUserRoom(userId: string): Promise<void> {
    await this.client.del(`user:${userId}:room`);
  }

  // Matchmaking Queue
  public async addToMatchmakingQueue(user: User): Promise<void> {
    const queueKey = `matchmaking:${user.language}`;
    await this.client.lPush(queueKey, JSON.stringify(user));
  }

  public async removeFromMatchmakingQueue(userId: string, language: string): Promise<void> {
    const queueKey = `matchmaking:${language}`;
    const items = await this.client.lRange(queueKey, 0, -1);

    for (const item of items) {
      const user: User = JSON.parse(item);
      if (user.userId === userId) {
        await this.client.lRem(queueKey, 1, item);
        break;
      }
    }
  }

  public async findMatchFromQueue(language: string, preferredLanguage: string): Promise<User | null> {
    const queueKey = `matchmaking:${preferredLanguage}`;
    const userJson = await this.client.rPop(queueKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  public async getMatchmakingQueueSize(language: string): Promise<number> {
    return await this.client.lLen(`matchmaking:${language}`);
  }

  // Statistics
  public async incrementCallCounter(): Promise<void> {
    await this.client.incr('stats:total_calls');
  }

  public async getTotalCalls(): Promise<number> {
    const value = await this.client.get('stats:total_calls');
    return value ? parseInt(value) : 0;
  }

  // Session management
  public async setSocketSession(socketId: string, userId: string): Promise<void> {
    await this.client.setEx(`socket:${socketId}`, 3600, userId);
  }

  public async getSocketSession(socketId: string): Promise<string | null> {
    return await this.client.get(`socket:${socketId}`);
  }

  public async deleteSocketSession(socketId: string): Promise<void> {
    const userId = await this.getSocketSession(socketId);
    if (userId) {
      await this.client.del(`user:${userId}:socket`);
    }
    await this.client.del(`socket:${socketId}`);
  }

  public async setUserIdSocket(userId: string, socketId: string): Promise<void> {
    await this.client.setEx(`user:${userId}:socket`, 3600, socketId);
  }

  public async getUserIdSocket(userId: string): Promise<string | null> {
    return await this.client.get(`user:${userId}:socket`);
  }
}



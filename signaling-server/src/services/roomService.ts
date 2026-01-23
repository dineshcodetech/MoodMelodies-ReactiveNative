import { v4 as uuidv4 } from 'uuid';
import { Room, User } from '../types/socket.types';
import { RedisService } from './redisService';
import { logger } from '../utils/logger';

export class RoomService {
  private redisService: RedisService;

  constructor() {
    this.redisService = RedisService.getInstance();
  }

  public async createRoom(): Promise<Room> {
    const room: Room = {
      roomId: uuidv4(),
      users: [],
      createdAt: Date.now(),
      status: 'waiting'
    };

    await this.redisService.createRoom(room);
    logger.info(`Room created: ${room.roomId}`);
    return room;
  }

  public async getRoom(roomId: string): Promise<Room | null> {
    return await this.redisService.getRoom(roomId);
  }

  public async addUserToRoom(roomId: string, user: User): Promise<Room> {
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
    } else {
      room.users.push(user);
    }

    // Update room status
    if (room.users.length === 2) {
      room.status = 'active';
    }

    await this.redisService.updateRoom(room);
    await this.redisService.setUserRoom(user.userId, roomId);

    logger.info(`User ${user.userId} added to room ${roomId}`);
    return room;
  }

  public async removeUserFromRoom(roomId: string, userId: string): Promise<Room | null> {
    const room = await this.redisService.getRoom(roomId);
    
    if (!room) {
      return null;
    }

    room.users = room.users.filter(u => u.userId !== userId);
    
    if (room.users.length === 0) {
      // Delete room if empty
      await this.redisService.deleteRoom(roomId);
      logger.info(`Room ${roomId} deleted (empty)`);
      return null;
    } else {
      // Mark room as waiting if one user left
      room.status = 'waiting';
      await this.redisService.updateRoom(room);
      logger.info(`User ${userId} removed from room ${roomId}`);
      return room;
    }
  }

  public async getUserFromRoom(roomId: string, userId: string): Promise<User | null> {
    const room = await this.redisService.getRoom(roomId);
    if (!room) return null;
    
    return room.users.find(u => u.userId === userId) || null;
  }

  public async getOtherUsersInRoom(roomId: string, userId: string): Promise<User[]> {
    const room = await this.redisService.getRoom(roomId);
    if (!room) return [];
    
    return room.users.filter(u => u.userId !== userId);
  }

  public async isRoomFull(roomId: string): Promise<boolean> {
    const room = await this.redisService.getRoom(roomId);
    return room ? room.users.length >= 2 : false;
  }

  public async endRoom(roomId: string): Promise<void> {
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
      
      logger.info(`Room ${roomId} ended`);
    }
  }

  public async getRoomByUserId(userId: string): Promise<Room | null> {
    const roomId = await this.redisService.getUserRoom(userId);
    if (!roomId) return null;
    
    return await this.redisService.getRoom(roomId);
  }
}



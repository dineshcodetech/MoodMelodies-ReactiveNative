import { Server, Socket } from 'socket.io';
import { RoomService } from '../services/roomService';
import { RedisService } from '../services/redisService';
import { JoinRoomData, LeaveRoomData, User, ErrorCode } from '../types/socket.types';
import { logger } from '../utils/logger';
import { validateJoinRoom } from '../utils/validation';

export class CallHandler {
  private io: Server;
  private roomService: RoomService;
  private redisService: RedisService;

  constructor(io: Server) {
    this.io = io;
    this.roomService = new RoomService();
    this.redisService = RedisService.getInstance();
  }

  public async handleJoinRoom(socket: Socket, data: JoinRoomData): Promise<void> {
    try {
      // Validate input
      const validationError = validateJoinRoom(data);
      if (validationError) {
        socket.emit('error', {
          code: ErrorCode.INVALID_DATA,
          message: validationError
        });
        return;
      }

      const user: User = {
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
            code: ErrorCode.ROOM_NOT_FOUND,
            message: 'Room not found'
          });
          return;
        }

        if (await this.roomService.isRoomFull(data.roomId)) {
          socket.emit('error', {
            code: ErrorCode.ROOM_FULL,
            message: 'Room is full'
          });
          return;
        }

        room = await this.roomService.addUserToRoom(data.roomId, user);
      } else {
        // Create new room
        room = await this.roomService.createRoom();
        room = await this.roomService.addUserToRoom(room.roomId, user);
      }

      // Join socket.io room
      socket.join(room.roomId);

      // Store socket session
      await this.redisService.setSocketSession(socket.id, user.userId);

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

      logger.info(`User ${user.userId} joined room ${room.roomId}`);
    } catch (error) {
      logger.error('Error in handleJoinRoom:', error);
      socket.emit('error', {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to join room',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async handleLeaveRoom(socket: Socket, data: LeaveRoomData): Promise<void> {
    try {
      const userId = await this.redisService.getSocketSession(socket.id);
      
      if (!userId) {
        socket.emit('error', {
          code: ErrorCode.USER_NOT_FOUND,
          message: 'User session not found'
        });
        return;
      }

      const room = await this.roomService.getRoom(data.roomId);
      
      if (!room) {
        socket.emit('error', {
          code: ErrorCode.ROOM_NOT_FOUND,
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

      logger.info(`User ${userId} left room ${data.roomId}`);
    } catch (error) {
      logger.error('Error in handleLeaveRoom:', error);
      socket.emit('error', {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to leave room',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async handleDisconnect(socket: Socket): Promise<void> {
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

      logger.info(`User ${userId} disconnected and cleaned up`);
    } catch (error) {
      logger.error('Error in handleDisconnect:', error);
    }
  }
}



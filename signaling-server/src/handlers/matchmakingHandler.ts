import { Server, Socket } from 'socket.io';
import { RoomService } from '../services/roomService';
import { RedisService } from '../services/redisService';
import { MatchmakingData, User, ErrorCode } from '../types/socket.types';
import { logger } from '../utils/logger';

export class MatchmakingHandler {
  private io: Server;
  private roomService: RoomService;
  private redisService: RedisService;
  private matchmakingTimeouts: Map<string, NodeJS.Timeout>;

  constructor(io: Server) {
    this.io = io;
    this.roomService = new RoomService();
    this.redisService = RedisService.getInstance();
    this.matchmakingTimeouts = new Map();
  }

  public async handleFindMatch(socket: Socket, data: MatchmakingData): Promise<void> {
    try {
      if (!data.userId || !data.language) {
        socket.emit('error', {
          code: ErrorCode.INVALID_DATA,
          message: 'Missing userId or language'
        });
        return;
      }

      const user: User = {
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
      } else {
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

        logger.info(`User ${user.userId} added to matchmaking queue (${user.language})`);
      }
    } catch (error) {
      logger.error('Error in handleFindMatch:', error);
      socket.emit('error', {
        code: ErrorCode.MATCHMAKING_FAILED,
        message: 'Failed to find match',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async handleCancelMatch(socket: Socket): Promise<void> {
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

      logger.info(`User ${userId} cancelled matchmaking`);
    } catch (error) {
      logger.error('Error in handleCancelMatch:', error);
    }
  }

  public async handleDisconnect(socket: Socket): Promise<void> {
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

      logger.info(`User ${userId} removed from matchmaking on disconnect`);
    } catch (error) {
      logger.error('Error in handleDisconnect:', error);
    }
  }

  private async createMatchedRoom(socket: Socket, user1: User, user2: User): Promise<void> {
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

      logger.info(`Match created: ${user1.userId} (${user1.language}) ↔ ${user2.userId} (${user2.language})`);
    } catch (error) {
      logger.error('Error creating matched room:', error);
      throw error;
    }
  }

  private async handleMatchmakingTimeout(socket: Socket, user: User): Promise<void> {
    try {
      // Remove from queue
      await this.redisService.removeFromMatchmakingQueue(user.userId, user.language);
      
      this.matchmakingTimeouts.delete(socket.id);

      socket.emit('matchmaking_timeout', {
        userId: user.userId,
        message: 'No match found within time limit'
      });

      logger.info(`Matchmaking timeout for user ${user.userId}`);
    } catch (error) {
      logger.error('Error handling matchmaking timeout:', error);
    }
  }

  private getComplementaryLanguage(language: string): string {
    // Simple mapping - extend as needed
    const languageMap: Record<string, string> = {
      'en': 'hi',
      'hi': 'en'
    };
    return languageMap[language] || 'en';
  }
}



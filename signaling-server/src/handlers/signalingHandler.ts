import { Server, Socket } from 'socket.io';
import { RoomService } from '../services/roomService';
import { SignalingData, ErrorCode } from '../types/socket.types';
import { logger } from '../utils/logger';

export class SignalingHandler {
  private io: Server;
  private roomService: RoomService;

  constructor(io: Server) {
    this.io = io;
    this.roomService = new RoomService();
  }

  public async handleOffer(socket: Socket, data: SignalingData): Promise<void> {
    try {
      if (!data.roomId || !data.offer) {
        socket.emit('error', {
          code: ErrorCode.INVALID_DATA,
          message: 'Missing roomId or offer'
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

      // Forward offer to other user(s) in the room
      if (data.targetUserId) {
        // Send to specific user
        const targetUser = room.users.find(u => u.userId === data.targetUserId);
        if (targetUser) {
          this.io.to(targetUser.socketId).emit('offer', {
            offer: data.offer,
            roomId: data.roomId,
            fromUserId: socket.id
          });
          logger.info(`Offer sent from ${socket.id} to ${targetUser.socketId}`);
        }
      } else {
        // Broadcast to all other users in room
        socket.to(data.roomId).emit('offer', {
          offer: data.offer,
          roomId: data.roomId,
          fromUserId: socket.id
        });
        logger.info(`Offer broadcast in room ${data.roomId}`);
      }
    } catch (error) {
      logger.error('Error in handleOffer:', error);
      socket.emit('error', {
        code: ErrorCode.SIGNALING_FAILED,
        message: 'Failed to send offer',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async handleAnswer(socket: Socket, data: SignalingData): Promise<void> {
    try {
      if (!data.roomId || !data.answer) {
        socket.emit('error', {
          code: ErrorCode.INVALID_DATA,
          message: 'Missing roomId or answer'
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

      // Forward answer to other user(s) in the room
      if (data.targetUserId) {
        // Send to specific user
        const targetUser = room.users.find(u => u.userId === data.targetUserId);
        if (targetUser) {
          this.io.to(targetUser.socketId).emit('answer', {
            answer: data.answer,
            roomId: data.roomId,
            fromUserId: socket.id
          });
          logger.info(`Answer sent from ${socket.id} to ${targetUser.socketId}`);
        }
      } else {
        // Broadcast to all other users in room
        socket.to(data.roomId).emit('answer', {
          answer: data.answer,
          roomId: data.roomId,
          fromUserId: socket.id
        });
        logger.info(`Answer broadcast in room ${data.roomId}`);
      }
    } catch (error) {
      logger.error('Error in handleAnswer:', error);
      socket.emit('error', {
        code: ErrorCode.SIGNALING_FAILED,
        message: 'Failed to send answer',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async handleIceCandidate(socket: Socket, data: SignalingData): Promise<void> {
    try {
      if (!data.roomId || !data.candidate) {
        socket.emit('error', {
          code: ErrorCode.INVALID_DATA,
          message: 'Missing roomId or ICE candidate'
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

      // Forward ICE candidate to other user(s)
      if (data.targetUserId) {
        // Send to specific user
        const targetUser = room.users.find(u => u.userId === data.targetUserId);
        if (targetUser) {
          this.io.to(targetUser.socketId).emit('ice_candidate', {
            candidate: data.candidate,
            roomId: data.roomId,
            fromUserId: socket.id
          });
        }
      } else {
        // Broadcast to all other users in room
        socket.to(data.roomId).emit('ice_candidate', {
          candidate: data.candidate,
          roomId: data.roomId,
          fromUserId: socket.id
        });
      }
    } catch (error) {
      logger.error('Error in handleIceCandidate:', error);
      socket.emit('error', {
        code: ErrorCode.SIGNALING_FAILED,
        message: 'Failed to send ICE candidate',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}



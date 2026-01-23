import { Server, Socket } from 'socket.io';
import { JoinRoomData, LeaveRoomData } from '../types/socket.types';
export declare class CallHandler {
    private io;
    private roomService;
    private redisService;
    private db;
    constructor(io: Server);
    handleJoinRoom(socket: Socket, data: JoinRoomData): Promise<void>;
    handleLeaveRoom(socket: Socket, data: LeaveRoomData): Promise<void>;
    handleDisconnect(socket: Socket): Promise<void>;
    handleStartCall(socket: Socket, data: {
        targetUserId: string;
        callerId: string;
    }): Promise<void>;
}
//# sourceMappingURL=callHandler.d.ts.map
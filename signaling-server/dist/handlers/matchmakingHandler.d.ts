import { Server, Socket } from 'socket.io';
import { MatchmakingData } from '../types/socket.types';
export declare class MatchmakingHandler {
    private io;
    private roomService;
    private redisService;
    private matchmakingTimeouts;
    constructor(io: Server);
    handleFindMatch(socket: Socket, data: MatchmakingData): Promise<void>;
    handleCancelMatch(socket: Socket): Promise<void>;
    handleDisconnect(socket: Socket): Promise<void>;
    private createMatchedRoom;
    private handleMatchmakingTimeout;
    private getComplementaryLanguage;
}
//# sourceMappingURL=matchmakingHandler.d.ts.map
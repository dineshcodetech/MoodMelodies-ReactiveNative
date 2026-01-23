import { Room, User } from '../types/socket.types';
export declare class RedisService {
    private static instance;
    private client;
    private isConnected;
    private constructor();
    static getInstance(): RedisService;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    createRoom(room: Room): Promise<void>;
    getRoom(roomId: string): Promise<Room | null>;
    updateRoom(room: Room): Promise<void>;
    deleteRoom(roomId: string): Promise<void>;
    getActiveRoomsCount(): Promise<number>;
    setUserRoom(userId: string, roomId: string): Promise<void>;
    getUserRoom(userId: string): Promise<string | null>;
    deleteUserRoom(userId: string): Promise<void>;
    addToMatchmakingQueue(user: User): Promise<void>;
    removeFromMatchmakingQueue(userId: string, language: string): Promise<void>;
    findMatchFromQueue(language: string, preferredLanguage: string): Promise<User | null>;
    getMatchmakingQueueSize(language: string): Promise<number>;
    incrementCallCounter(): Promise<void>;
    getTotalCalls(): Promise<number>;
    setSocketSession(socketId: string, userId: string): Promise<void>;
    getSocketSession(socketId: string): Promise<string | null>;
    deleteSocketSession(socketId: string): Promise<void>;
    setUserIdSocket(userId: string, socketId: string): Promise<void>;
    getUserIdSocket(userId: string): Promise<string | null>;
}
//# sourceMappingURL=redisService.d.ts.map
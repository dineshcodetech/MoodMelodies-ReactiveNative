import { Room, User } from '../types/socket.types';
export declare class RoomService {
    private redisService;
    constructor();
    createRoom(): Promise<Room>;
    getRoom(roomId: string): Promise<Room | null>;
    addUserToRoom(roomId: string, user: User): Promise<Room>;
    removeUserFromRoom(roomId: string, userId: string): Promise<Room | null>;
    getUserFromRoom(roomId: string, userId: string): Promise<User | null>;
    getOtherUsersInRoom(roomId: string, userId: string): Promise<User[]>;
    isRoomFull(roomId: string): Promise<boolean>;
    endRoom(roomId: string): Promise<void>;
    getRoomByUserId(userId: string): Promise<Room | null>;
}
//# sourceMappingURL=roomService.d.ts.map
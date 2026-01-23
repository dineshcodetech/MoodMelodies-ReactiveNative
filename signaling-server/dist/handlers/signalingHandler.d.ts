import { Server, Socket } from 'socket.io';
import { SignalingData } from '../types/socket.types';
export declare class SignalingHandler {
    private io;
    private roomService;
    constructor(io: Server);
    handleOffer(socket: Socket, data: SignalingData): Promise<void>;
    handleAnswer(socket: Socket, data: SignalingData): Promise<void>;
    handleIceCandidate(socket: Socket, data: SignalingData): Promise<void>;
}
//# sourceMappingURL=signalingHandler.d.ts.map
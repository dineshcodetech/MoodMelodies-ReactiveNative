export interface RTCSessionDescriptionInit {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp?: string;
}
export interface RTCIceCandidateInit {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
}
export interface User {
    userId: string;
    socketId: string;
    language: string;
    deviceInfo?: {
        platform: 'ios' | 'android';
        version: string;
    };
}
export interface Room {
    roomId: string;
    users: User[];
    createdAt: number;
    status: 'waiting' | 'active' | 'ended';
}
export interface JoinRoomData {
    userId: string;
    roomId?: string;
    language: string;
    deviceInfo?: {
        platform: 'ios' | 'android';
        version: string;
    };
}
export interface LeaveRoomData {
    roomId: string;
}
export interface SignalingData {
    roomId: string;
    targetUserId?: string;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
}
export interface MatchmakingData {
    userId: string;
    language: string;
    preferredLanguage?: string;
}
export interface ErrorData {
    code: string;
    message: string;
    details?: any;
}
export declare enum ErrorCode {
    ROOM_NOT_FOUND = "ROOM_NOT_FOUND",
    ROOM_FULL = "ROOM_FULL",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    INVALID_DATA = "INVALID_DATA",
    MATCHMAKING_FAILED = "MATCHMAKING_FAILED",
    SIGNALING_FAILED = "SIGNALING_FAILED",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
//# sourceMappingURL=socket.types.d.ts.map
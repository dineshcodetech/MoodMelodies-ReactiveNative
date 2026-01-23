import io, { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import {
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SignalingConfig {
  serverUrl: string;
  autoConnect?: boolean;
  token?: string; // JWT token for authentication
}

export interface JoinRoomParams {
  userId: string;
  roomId?: string;
  language: string;
  deviceInfo?: {
    platform: 'ios' | 'android';
    version: string;
  };
}

export class SignalingService extends EventEmitter {
  private socket: Socket | null = null;
  private config: SignalingConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: SignalingConfig) {
    super();
    this.config = config;

    if (config.autoConnect !== false) {
      this.connect();
    }
  }

  /**
   * Connect to signaling server with JWT authentication
   */
  public async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('[Signaling] Already connected');
      return;
    }

    // Get JWT token from storage if not provided
    let token = this.config.token;
    if (!token) {
      token = await AsyncStorage.getItem('auth_token');
    }

    if (!token) {
      throw new Error('Authentication token required');
    }

    console.log(`[Signaling] Connecting to ${this.config.serverUrl}`);

    this.socket = io(this.config.serverUrl, {
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 7777,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
      forceNew: true,
      auth: {
        token: token,
      },
    });

    this.setupSocketHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Signaling] Socket connected! ID:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.emit('connected', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Signaling] Socket disconnected! Reason:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Signaling] Socket connection error:', error.message);
      this.reconnectAttempts++;
      this.emit('error', error);
    });

    // Room events
    this.socket.on('room_joined', (data) => {
      console.log('[Signaling] Room joined event:', data.roomId);
      this.emit('roomJoined', data);
    });

    this.socket.on('room_left', (data) => {
      console.log('[Signaling] Room left:', data.roomId);
      this.emit('roomLeft', data);
    });

    this.socket.on('user_joined', (data) => {
      console.log('[Signaling] User joined:', data.user);
      this.emit('userJoined', data);
    });

    this.socket.on('user_left', (data) => {
      console.log('[Signaling] User left:', data.userId);
      this.emit('userLeft', data);
    });

    this.socket.on('user_disconnected', (data) => {
      console.log('[Signaling] User disconnected:', data.userId);
      this.emit('userDisconnected', data);
    });

    // Call events (V2 backend)
    this.socket.on('call_joined', (data) => {
      console.log('[Signaling] Call joined:', data);
      this.emit('callJoined', data);
    });

    this.socket.on('message_translated', (data) => {
      console.log('[Signaling] Message translated:', data);
      this.emit('messageTranslated', data);
    });

    // WebRTC signaling events (V2 backend uses different event names)
    this.socket.on('webrtc_offer', (data) => {
      console.log('[Signaling] Received WebRTC offer');
      this.emit('offer', data);
    });

    this.socket.on('webrtc_answer', (data) => {
      console.log('[Signaling] Received WebRTC answer');
      this.emit('answer', data);
    });

    this.socket.on('webrtc_ice_candidate', (data) => {
      console.log('[Signaling] Received WebRTC ICE candidate');
      this.emit('iceCandidate', data);
    });

    // Matchmaking events
    this.socket.on('matchmaking_started', (data) => {
      console.log('[Signaling] Matchmaking started');
      this.emit('matchmakingStarted', data);
    });

    this.socket.on('match_found', (data) => {
      console.log('[Signaling] Match found:', data.roomId);
      this.emit('matchFound', data);
    });

    this.socket.on('matchmaking_timeout', (data) => {
      console.log('[Signaling] Matchmaking timeout');
      this.emit('matchmakingTimeout', data);
    });

    this.socket.on('matchmaking_cancelled', (data) => {
      console.log('[Signaling] Matchmaking cancelled');
      this.emit('matchmakingCancelled', data);
    });

    // Error events
    this.socket.on('error', (data) => {
      console.error('[Signaling] Server error:', data);
      this.emit('serverError', data);
    });

    this.socket.on('incoming_call', (data) => {
      console.log('[Signaling] Incoming call from:', data.caller.name);
      this.emit('incomingCall', data);
    });

    this.socket.on('call_initiated', (data) => {
      console.log('[Signaling] Call initiated, room:', data.roomId);
      this.emit('callInitiated', data);
    });
  }

  /**
   * Helper to ensure socket is connected before emitting
   */
  private async ensureConnected(timeoutMs: number = 7777): Promise<boolean> {
    if (this.socket?.connected) return true;

    console.log('[Signaling] Socket not connected, waiting...');
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.socket?.connected) return true;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return this.socket?.connected || false;
  }

  /**
   * Join a call room (V2 backend)
   */
  public async joinRoom(params: JoinRoomParams): Promise<void> {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Socket not connected');
    }

    console.log('[Signaling] Joining call:', params);
    this.socket?.emit('join_call', {
      room_id: params.roomId,
    });
  }

  /**
   * Leave current room (V2 backend)
   */
  public async leaveRoom(roomId: string): Promise<void> {
    const connected = await this.ensureConnected(2000);
    if (!connected) return; // Ignore if closing anyway

    console.log('[Signaling] Leaving call:', roomId);
    this.socket?.emit('leave_call', { room_id: roomId });
  }

  /**
   * Send message for translation (V2 backend)
   */
  public sendMessageForTranslation(roomId: string, text: string, sourceLang?: string): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    console.log('[Signaling] Sending message for translation');
    this.socket.emit('translate_message', {
      room_id: roomId,
      text: text,
      source_lang: sourceLang || 'auto',
    });
  }

  /**
   * Send WebRTC offer (V2 backend)
   */
  public sendOffer(roomId: string, offer: RTCSessionDescription): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    console.log('[Signaling] Sending WebRTC offer');
    this.socket.emit('webrtc_offer', { room_id: roomId, offer });
  }

  /**
   * Send WebRTC answer (V2 backend)
   */
  public sendAnswer(roomId: string, answer: RTCSessionDescription): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    console.log('[Signaling] Sending WebRTC answer');
    this.socket.emit('webrtc_answer', { room_id: roomId, answer });
  }

  /**
   * Send ICE candidate (V2 backend)
   */
  public sendIceCandidate(roomId: string, candidate: RTCIceCandidate): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('webrtc_ice_candidate', { room_id: roomId, candidate });
  }

  /**
   * Find a match for calling
   */
  public findMatch(userId: string, language: string, preferredLanguage?: string): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    console.log('[Signaling] Finding match:', { userId, language, preferredLanguage });
    this.socket.emit('find_match', { userId, language, preferredLanguage });
  }

  /**
   * Cancel matchmaking
   */
  public cancelMatch(): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    console.log('[Signaling] Cancelling match');
    this.socket.emit('cancel_match');
  }

  /**
   * Start a call to a specific user
   */
  public async startCall(callerId: string, targetUserId: string): Promise<void> {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Socket not connected');
    }

    console.log(`[Signaling] Starting call to ${targetUserId}`);
    this.socket?.emit('start_call', { callerId, targetUserId });
  }

  /**
   * Disconnect from signaling server
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('[Signaling] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
    }
    this.removeAllListeners();
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }
}



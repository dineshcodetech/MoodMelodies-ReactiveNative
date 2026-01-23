/**
 * Global type declarations for Mood Melodies
 */

// WebRTC types
declare global {
  interface RTCDataChannel {
    readyState: 'connecting' | 'open' | 'closing' | 'closed';
    send(data: string): void;
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((error: Event) => void) | null;
  }
}

// Call configuration
export interface CallConfig {
  userId: string;
  roomId?: string;
  sourceLanguage: string;
  targetLanguage: string;
}

// Language definition
export interface Language {
  code: string;
  name: string;
  flag: string;
}

// User in a call room
export interface RoomUser {
  userId: string;
  language: string;
  socketId?: string;
  deviceInfo?: {
    platform: 'ios' | 'android';
    version: string;
  };
}

// Room status
export interface Room {
  roomId: string;
  users: RoomUser[];
  status: 'waiting' | 'active' | 'ended';
  createdAt: number;
}

// Transcript chunk from audio pipeline
export interface TranscriptChunk {
  text: string;
  language: string;
  timestamp: number;
  chunkId: string;
  isPartial: boolean;
}

// Translation result
export interface TranslationResult {
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
  latencyMs: number;
  cached: boolean;
}

// WebRTC signaling messages
export interface SignalingOffer {
  offer: RTCSessionDescriptionInit;
  roomId: string;
  fromUserId: string;
}

export interface SignalingAnswer {
  answer: RTCSessionDescriptionInit;
  roomId: string;
  fromUserId: string;
}

export interface SignalingIceCandidate {
  candidate: RTCIceCandidateInit;
  roomId: string;
  fromUserId: string;
}

// Error types
export enum ErrorCode {
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_DATA = 'INVALID_DATA',
  MATCHMAKING_FAILED = 'MATCHMAKING_FAILED',
  SIGNALING_FAILED = 'SIGNALING_FAILED',
  TRANSLATION_FAILED = 'TRANSLATION_FAILED',
  STT_FAILED = 'STT_FAILED',
  TTS_FAILED = 'TTS_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
}

// Connection states
export type ConnectionState = 
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

// Audio pipeline status
export interface AudioPipelineStatus {
  isProcessing: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  isSpeaking: boolean;
  isListening: boolean;
}



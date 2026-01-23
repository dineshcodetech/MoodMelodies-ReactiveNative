import { useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCService } from '../services/WebRTCService';
import { SignalingService } from '../services/SignalingService';
import { Platform } from 'react-native';
import {
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';

export interface UseWebRTCConfig {
  signalingUrl: string;
  userId: string;
  language: string;
}

export function useWebRTC(config: UseWebRTCConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [error, setError] = useState<Error | null>(null);

  const webrtcService = useRef<WebRTCService | null>(null);
  const signalingService = useRef<SignalingService | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);

  /**
   * Initialize services
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get JWT token for authentication
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const token = await AsyncStorage.getItem('auth_token');
        
        if (!token) {
          throw new Error('Authentication token required');
        }

        // Initialize signaling with token
        signalingService.current = new SignalingService({
          serverUrl: config.signalingUrl,
          autoConnect: false, // We'll connect manually with token
          token: token,
        });

        // Connect with authentication
        await signalingService.current.connect();

        // Setup signaling event handlers
        setupSignalingHandlers();

        console.log('[useWebRTC] Initialized');
      } catch (err) {
        console.error('[useWebRTC] Initialization failed:', err);
        setError(err as Error);
      }
    };

    initialize();

    // Cleanup
    return () => {
      cleanup();
    };
  }, []);

  /**
   * Setup signaling event handlers
   */
  const setupSignalingHandlers = useCallback(() => {
    if (!signalingService.current) return;

    const signaling = signalingService.current;

    signaling.on('connected', () => {
      setIsConnected(true);
      console.log('[useWebRTC] Signaling connected');
    });

    signaling.on('disconnected', () => {
      setIsConnected(false);
      console.log('[useWebRTC] Signaling disconnected');
    });

    // V2 backend events
    signaling.on('callJoined', async (data: any) => {
      const roomIdValue = data.room_id || data.roomId;
      setRoomId(roomIdValue);
      console.log('[useWebRTC] Joined call room:', roomIdValue);

      // Initialize WebRTC with the room ID
      await initializeWebRTC(roomIdValue);

      // If there are other users, create offer
      if (data.users && data.users.length > 0) {
        const otherUser = data.users[0];
        setRemoteUserId(otherUser.user_id || otherUser.userId);
        await createOffer(roomIdValue);
      }
    });

    signaling.on('userJoined', async (data: any) => {
      const userId = data.user_id || data.user?.user_id || data.user?.userId;
      setRemoteUserId(userId);
      console.log('[useWebRTC] User joined:', userId);
      
      // Create offer when another user joins
      if (roomId) {
        await createOffer(roomId);
      }
    });

    signaling.on('messageTranslated', (data: any) => {
      console.log('[useWebRTC] Message translated:', data);
      // Handle translated message - this will be processed by audio pipeline
    });

    // V2 backend uses webrtc_ prefix
    signaling.on('offer', async (data: any) => {
      console.log('[useWebRTC] Received offer');
      const offer = data.offer || data;
      const roomIdValue = data.room_id || data.roomId || roomId;
      await handleOffer(offer, roomIdValue);
    });

    signaling.on('answer', async (data: any) => {
      console.log('[useWebRTC] Received answer');
      const answer = data.answer || data;
      await handleAnswer(answer);
    });

    signaling.on('iceCandidate', async (data: any) => {
      const candidate = data.candidate || data;
      await handleIceCandidate(candidate);
    });

    signaling.on('userLeft', () => {
      console.log('[useWebRTC] User left');
      handleUserLeft();
    });

    signaling.on('serverError', (data) => {
      console.error('[useWebRTC] Server error:', data);
      setError(new Error(data.message));
    });

    signaling.on('callInitiated', async (data) => {
      console.log('[useWebRTC] Joining initiated call room:', data.roomId);
      setRoomId(data.roomId);
      await joinRoom(data.roomId);
    });

    signaling.on('incomingCall', (data) => {
      console.log('[useWebRTC] Incoming call from:', data.caller.name);
      // In a real app, we'd show a notification or ringtone
      // For now, we'll auto-join the room for demonstration or let the UI handle it
      setRoomId(data.roomId);
      setRemoteUserId(data.caller.id);
    });
  }, [config.userId]);

  /**
   * Initialize WebRTC
   */
  const initializeWebRTC = async (currentRoomId: string) => {
    if (webrtcService.current) {
      return; // Already initialized
    }

    webrtcService.current = new WebRTCService();
    await webrtcService.current.initialize();

    // Setup WebRTC event handlers
    setupWebRTCHandlers(currentRoomId);
  };

  /**
   * Setup WebRTC event handlers
   */
  const setupWebRTCHandlers = useCallback((currentRoomId: string) => {
    if (!webrtcService.current) return;

    const webrtc = webrtcService.current;

    webrtc.on('iceCandidate', (candidate) => {
      if (currentRoomId) {
        signalingService.current?.sendIceCandidate(currentRoomId, candidate);
      }
    });

    webrtc.on('connectionStateChange', (state) => {
      setConnectionState(state);
      console.log('[useWebRTC] Connection state:', state);

      if (state === 'connected') {
        setIsInCall(true);
      } else if (state === 'disconnected' || state === 'failed') {
        setIsInCall(false);
      }
    });

    webrtc.on('dataChannelOpen', (channel) => {
      dataChannel.current = channel;
      console.log('[useWebRTC] Data channel opened');
    });

    webrtc.on('dataChannelMessage', (data) => {
      // Handle received transcript/translation
      console.log('[useWebRTC] Data channel message:', data);
    });
  }, []);

  /**
   * Join a room
   */
  const joinRoom = useCallback(
    async (roomIdToJoin?: string) => {
      if (!signalingService.current) {
        throw new Error('Signaling not initialized');
      }

      // If not connected, wait for connection event or timeout
      if (!signalingService.current.isConnected()) {
        console.log('[useWebRTC] Waiting for signaling connection...');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            signalingService.current?.off('connected', onConnected);
            reject(new Error('Signaling connection timeout'));
          }, 10000);

          const onConnected = () => {
            clearTimeout(timeout);
            resolve();
          };

          signalingService.current?.once('connected', onConnected);

          // Ensure we are actually trying to connect
          signalingService.current?.connect();
        });
      }

      // V2 backend expects room_id in the data
      await signalingService.current.joinRoom({
        userId: config.userId,
        roomId: roomIdToJoin,
        language: config.language,
        deviceInfo: {
          platform: Platform.OS as 'ios' | 'android',
          version: Platform.Version.toString(),
        },
      });
    },
    [config.userId, config.language]
  );

  /**
   * Start a call to a specific user
   */
  const startCall = useCallback(
    async (targetUserId: string) => {
      if (!signalingService.current) {
        throw new Error('Signaling not initialized');
      }

      await signalingService.current.startCall(config.userId, targetUserId);
    },
    [config.userId]
  );

  /**
   * Leave room
   */
  const leaveRoom = useCallback(async () => {
    if (roomId && signalingService.current) {
      await signalingService.current.leaveRoom(roomId);
      setRoomId(null);
      setRemoteUserId(null);
      setIsInCall(false);
    }

    if (webrtcService.current) {
      webrtcService.current.close();
      webrtcService.current = null;
    }
  }, [roomId]);

  /**
   * Create WebRTC offer
   */
  const createOffer = async (currentRoomId: string) => {
    if (!webrtcService.current) return;

    // Create data channel for text transmission
    dataChannel.current = webrtcService.current.createDataChannel('translation');

    const offer = await webrtcService.current.createOffer();
    signalingService.current?.sendOffer(currentRoomId, offer);
  };

  /**
   * Handle incoming offer
   */
  const handleOffer = async (offer: RTCSessionDescription, currentRoomId: string) => {
    webrtcService.current = new WebRTCService();
    await webrtcService.current.initialize();

    await webrtcService.current!.setRemoteDescription(offer);
    const answer = await webrtcService.current!.createAnswer();
    signalingService.current?.sendAnswer(currentRoomId, answer);
  };

  /**
   * Handle incoming answer
   */
  const handleAnswer = async (answer: RTCSessionDescription) => {
    if (!webrtcService.current) return;
    await webrtcService.current.setRemoteDescription(answer);
  };

  /**
   * Handle incoming ICE candidate
   */
  const handleIceCandidate = async (candidate: RTCIceCandidate) => {
    if (!webrtcService.current) return;
    await webrtcService.current.addIceCandidate(candidate);
  };

  /**
   * Handle user left
   */
  const handleUserLeft = () => {
    setRemoteUserId(null);
    setIsInCall(false);
    if (webrtcService.current) {
      webrtcService.current.close();
      webrtcService.current = null;
    }
  };

  /**
   * Send data via data channel
   */
  const sendData = useCallback((data: any) => {
    if (dataChannel.current && dataChannel.current.readyState === 'open') {
      dataChannel.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  /**
   * Send message for translation via WebSocket (V2 backend)
   */
  const sendMessageForTranslation = useCallback((text: string, sourceLang?: string) => {
    if (!signalingService.current || !roomId) {
      return false;
    }
    
    try {
      signalingService.current.sendMessageForTranslation(roomId, text, sourceLang);
      return true;
    } catch (error) {
      console.error('[useWebRTC] Failed to send message for translation:', error);
      return false;
    }
  }, [roomId]);

  /**
   * Cleanup
   */
  const cleanup = () => {
    if (webrtcService.current) {
      webrtcService.current.close();
    }
    if (signalingService.current) {
      signalingService.current.disconnect();
    }
  };

  return {
    isConnected,
    isInCall,
    roomId,
    remoteUserId,
    connectionState,
    error,
    joinRoom,
    leaveRoom,
    startCall,
    sendData,
    sendMessageForTranslation,
  };
}


import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { EventEmitter } from 'events';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export class WebRTCService extends EventEmitter {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private config: WebRTCConfig;

  constructor(config?: WebRTCConfig) {
    super();
    
    // Default STUN servers (free public STUN servers)
    this.config = config || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  }

  /**
   * Initialize peer connection
   */
  public async initialize(): Promise<void> {
    try {
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.config);

      // Setup event handlers
      this.setupPeerConnectionHandlers();

      // Get local audio stream
      await this.getLocalAudioStream();

      console.log('[WebRTC] Initialized successfully');
    } catch (error) {
      console.error('[WebRTC] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get local audio stream from microphone
   */
  private async getLocalAudioStream(): Promise<void> {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.localStream = stream;

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, stream);
      });

      this.emit('localStream', stream);
      console.log('[WebRTC] Local audio stream acquired');
    } catch (error) {
      console.error('[WebRTC] Failed to get local audio:', error);
      throw error;
    }
  }

  /**
   * Setup peer connection event handlers
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;

    // ICE candidate event
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('iceCandidate', event.candidate);
        console.log('[WebRTC] ICE candidate generated');
      }
    };

    // ICE connection state change
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      this.emit('iceConnectionStateChange', state);
      console.log('[WebRTC] ICE connection state:', state);
    };

    // Connection state change
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      this.emit('connectionStateChange', state);
      console.log('[WebRTC] Connection state:', state);
    };

    // Track event (remote stream)
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.emit('remoteStream', event.streams[0]);
        console.log('[WebRTC] Remote stream received');
      }
    };

    // Data channel (for text transmission)
    this.peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      this.setupDataChannel(dataChannel);
    };
  }

  /**
   * Create WebRTC offer
   */
  public async createOffer(): Promise<RTCSessionDescription> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTC] Offer created');

      return offer;
    } catch (error) {
      console.error('[WebRTC] Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Create WebRTC answer
   */
  public async createAnswer(): Promise<RTCSessionDescription> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('[WebRTC] Answer created');

      return answer;
    } catch (error) {
      console.error('[WebRTC] Failed to create answer:', error);
      throw error;
    }
  }

  /**
   * Set remote description (offer or answer)
   */
  public async setRemoteDescription(
    description: RTCSessionDescription
  ): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(description)
      );
      console.log('[WebRTC] Remote description set');
    } catch (error) {
      console.error('[WebRTC] Failed to set remote description:', error);
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  public async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WebRTC] ICE candidate added');
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error);
      throw error;
    }
  }

  /**
   * Create data channel for text transmission
   */
  public createDataChannel(label: string = 'translation'): RTCDataChannel {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const dataChannel = this.peerConnection.createDataChannel(label, {
      ordered: true,
    });

    this.setupDataChannel(dataChannel);
    return dataChannel;
  }

  /**
   * Setup data channel handlers
   */
  private setupDataChannel(dataChannel: RTCDataChannel): void {
    dataChannel.onopen = () => {
      this.emit('dataChannelOpen', dataChannel);
      console.log('[WebRTC] Data channel opened');
    };

    dataChannel.onclose = () => {
      this.emit('dataChannelClose');
      console.log('[WebRTC] Data channel closed');
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('dataChannelMessage', data);
      } catch (error) {
        console.error('[WebRTC] Failed to parse data channel message:', error);
      }
    };

    dataChannel.onerror = (error) => {
      console.error('[WebRTC] Data channel error:', error);
      this.emit('dataChannelError', error);
    };
  }

  /**
   * Mute/unmute local audio
   */
  public setMuted(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      console.log(`[WebRTC] Audio ${muted ? 'muted' : 'unmuted'}`);
    }
  }

  /**
   * Get local stream
   */
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Close connection and cleanup
   */
  public close(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.removeAllListeners();

    console.log('[WebRTC] Connection closed');
  }

  /**
   * Get connection statistics
   */
  public async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peerConnection) {
      return null;
    }

    try {
      const stats = await this.peerConnection.getStats(null);
      return stats;
    } catch (error) {
      console.error('[WebRTC] Failed to get stats:', error);
      return null;
    }
  }
}



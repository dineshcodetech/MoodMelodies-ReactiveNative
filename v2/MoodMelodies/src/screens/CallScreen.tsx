import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAudioPipeline } from '../hooks/useAudioPipeline';
import { TranscriptChunk } from '../services/AudioPipelineService';
import { COLORS, LANGUAGES } from '../constants/config';

interface CallScreenProps {
  userId: string;
  roomId?: string;
  targetUserId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  signalingUrl: string;
  translationUrl: string;
  onEndCall: () => void;
}

export const CallScreen: React.FC<CallScreenProps> = ({
  userId,
  roomId,
  targetUserId,
  sourceLanguage,
  targetLanguage,
  signalingUrl,
  translationUrl,
  onEndCall,
}) => {
  const [transcripts, setTranscripts] = useState<Array<{
    text: string;
    isLocal: boolean;
    timestamp: number;
  }>>([]);
  const [isMuted, setIsMuted] = useState(false);

  const {
    isConnected: signalingConnected,
    isInCall,
    roomId: currentRoomId,
    startCall,
    joinRoom,
    leaveRoom,
    sendData,
    sendMessageForTranslation,
  } = useWebRTC({
    signalingUrl,
    userId,
    language: sourceLanguage,
  });

  const {
    isProcessing,
    currentTranscript,
    lastTranslation,
    error: pipelineError,
    startProcessing,
    stopProcessing,
    processInboundTranscript,
  } = useAudioPipeline({
    sourceLanguage,
    targetLanguage,
    translationApiUrl: translationUrl,
    onOutboundTranscript: (chunk) => {
      // Send transcript for translation via V2 backend WebSocket
      if (chunk.text && chunk.text.trim()) {
        sendMessageForTranslation(chunk.text, sourceLanguage);
      }

      // Send transcript to remote user via data channel (for WebRTC)
      sendData({
        type: 'transcript',
        chunk,
      });

      // Add to local transcripts
      addTranscript(chunk.text, true);
    },
    onInboundTranslation: (data) => {
      console.log(`Translation latency: ${data.latency}ms`);
      // Add translated text to transcripts
      if (data.translated) {
        addTranscript(data.translated, false);
      }
    },
  });

  /**
   * Initialize call on mount
   */
  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  /**
   * Initialize call
   */
  const initializeCall = async () => {
    try {
      if (roomId) {
        await joinRoom(roomId);
      } else if (targetUserId) {
        await startCall(targetUserId);
      } else {
        // Random matchmaking if nothing else is specified
        await joinRoom();
      }
    } catch (error) {
      console.error('Failed to initialize call:', error);
      Alert.alert('Error', 'Failed to start call');
      onEndCall();
    }
  };

  /**
   * Start audio processing when call is connected
   */
  useEffect(() => {
    if (isInCall && !isProcessing) {
      startAudioProcessing();
    }
  }, [isInCall]);

  /**
   * Start audio processing
   */
  const startAudioProcessing = async () => {
    try {
      await startProcessing((chunk) => {
        // This callback is handled in useAudioPipeline config
      });
    } catch (error) {
      console.error('Failed to start audio processing:', error);
      Alert.alert('Error', 'Failed to start audio processing');
    }
  };

  /**
   * Add transcript to list
   */
  const addTranscript = (text: string, isLocal: boolean) => {
    setTranscripts(prev => [
      ...prev,
      {
        text,
        isLocal,
        timestamp: Date.now(),
      },
    ]);
  };

  /**
   * Toggle mute
   */
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // Mute functionality handled by WebRTC service
  };

  /**
   * End call
   */
  const handleEndCall = async () => {
    await cleanup();
    onEndCall();
  };

  /**
   * Cleanup
   */
  const cleanup = async () => {
    try {
      await stopProcessing();
      await leaveRoom();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  /**
   * Get connection status text
   */
  const getConnectionStatus = () => {
    if (!signalingConnected) return 'Connecting...';
    if (!isInCall) return 'Waiting for other user...';
    return 'Connected';
  };

  /**
   * Get language names
   */
  const getLanguageName = (code: string) => {
    return LANGUAGES.find(l => l.code === code)?.name || code;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mood Melodies</Text>
          <Text style={styles.headerSubtitle}>{getConnectionStatus()}</Text>
        </View>
        <View style={styles.languageInfo}>
          <Text style={styles.languageText}>
            {getLanguageName(sourceLanguage)} → {getLanguageName(targetLanguage)}
          </Text>
        </View>
      </View>

      {/* Connection Status */}
      {!isInCall && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {signalingConnected ? 'Establishing call...' : 'Connecting...'}
          </Text>
          {currentRoomId && (
            <Text style={styles.roomIdText}>Room ID: {currentRoomId}</Text>
          )}
        </View>
      )}

      {/* Transcripts */}
      {isInCall && (
        <ScrollView
          style={styles.transcriptContainer}
          contentContainerStyle={styles.transcriptContent}
        >
          {transcripts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Start speaking to see live translation
              </Text>
            </View>
          ) : (
            transcripts.map((transcript, index) => (
              <View
                key={index}
                style={[
                  styles.transcriptBubble,
                  transcript.isLocal
                    ? styles.transcriptBubbleLocal
                    : styles.transcriptBubbleRemote,
                ]}
              >
                <Text
                  style={[
                    styles.transcriptText,
                    transcript.isLocal
                      ? styles.transcriptTextLocal
                      : styles.transcriptTextRemote,
                  ]}
                >
                  {transcript.text}
                </Text>
                <Text style={styles.transcriptTime}>
                  {new Date(transcript.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Current Transcript (Live) */}
      {isInCall && currentTranscript && (
        <View style={styles.currentTranscriptContainer}>
          <Text style={styles.currentTranscriptLabel}>Speaking...</Text>
          <Text style={styles.currentTranscriptText}>{currentTranscript}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.muteButton]}
          onPress={handleToggleMute}
        >
          <Text style={styles.controlButtonText}>
            {isMuted ? '🔇 Unmute' : '🔊 Mute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Text style={[styles.controlButtonText, styles.endCallButtonText]}>
            📞 End Call
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {pipelineError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Error: {pipelineError.message}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 4,
  },
  languageInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  languageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  roomIdText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transcriptContainer: {
    flex: 1,
  },
  transcriptContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  transcriptBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  transcriptBubbleLocal: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  transcriptBubbleRemote: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondary,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 22,
  },
  transcriptTextLocal: {
    color: '#FFFFFF',
  },
  transcriptTextRemote: {
    color: '#000000',
  },
  transcriptTime: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 4,
  },
  currentTranscriptContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  currentTranscriptLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  currentTranscriptText: {
    fontSize: 14,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  controls: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  muteButton: {
    backgroundColor: COLORS.secondary,
  },
  endCallButton: {
    backgroundColor: COLORS.error,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  endCallButtonText: {
    color: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: COLORS.error,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
});



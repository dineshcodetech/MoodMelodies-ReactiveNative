import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioPipelineService, TranscriptChunk } from '../services/AudioPipelineService';

export interface UseAudioPipelineConfig {
  sourceLanguage: string;
  targetLanguage: string;
  translationApiUrl: string;
  onOutboundTranscript?: (chunk: TranscriptChunk) => void;
  onInboundTranslation?: (data: {
    original: string;
    translated: string;
    latency: number;
  }) => void;
}

export function useAudioPipeline(config: UseAudioPipelineConfig) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [lastTranslation, setLastTranslation] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);

  const audioPipeline = useRef<AudioPipelineService | null>(null);

  /**
   * Initialize audio pipeline
   */
  useEffect(() => {
    audioPipeline.current = new AudioPipelineService({
      sourceLanguage: config.sourceLanguage,
      targetLanguage: config.targetLanguage,
      translationApiUrl: config.translationApiUrl,
    });

    setupEventHandlers();

    return () => {
      if (audioPipeline.current) {
        audioPipeline.current.destroy();
      }
    };
  }, []);

  /**
   * Setup event handlers
   */
  const setupEventHandlers = useCallback(() => {
    if (!audioPipeline.current) return;

    const pipeline = audioPipeline.current;

    pipeline.on('outboundTranscript', (chunk: TranscriptChunk) => {
      setCurrentTranscript(chunk.text);
      config.onOutboundTranscript?.(chunk);
    });

    pipeline.on('outboundPartialTranscript', (chunk: TranscriptChunk) => {
      // Update UI with partial transcript
      setCurrentTranscript(chunk.text);
    });

    pipeline.on('inboundTranslation', (data) => {
      setLastTranslation(data.translated);
      config.onInboundTranslation?.(data);
    });

    pipeline.on('inboundSpeech', (text: string) => {
      setIsSpeaking(true);
      // Speaking will be detected by TTS events
    });

    pipeline.on('error', (err: Error) => {
      console.error('[useAudioPipeline] Error:', err);
      setError(err);
    });
  }, [config]);

  /**
   * Start processing outbound audio
   */
  const startProcessing = useCallback(
    async (onTranscript: (chunk: TranscriptChunk) => void) => {
      if (!audioPipeline.current) return;

      try {
        await audioPipeline.current.startOutboundProcessing(onTranscript);
        setIsProcessing(true);
        setIsListening(true);
        console.log('[useAudioPipeline] Started processing');
      } catch (err) {
        console.error('[useAudioPipeline] Failed to start:', err);
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  /**
   * Stop processing
   */
  const stopProcessing = useCallback(async () => {
    if (!audioPipeline.current) return;

    try {
      await audioPipeline.current.stopOutboundProcessing();
      setIsProcessing(false);
      setIsListening(false);
      console.log('[useAudioPipeline] Stopped processing');
    } catch (err) {
      console.error('[useAudioPipeline] Failed to stop:', err);
      setError(err as Error);
    }
  }, []);

  /**
   * Process inbound transcript from remote user
   */
  const processInboundTranscript = useCallback(async (chunk: TranscriptChunk) => {
    if (!audioPipeline.current) return;

    try {
      await audioPipeline.current.processInboundTranscript(chunk);
    } catch (err) {
      console.error('[useAudioPipeline] Failed to process inbound:', err);
      setError(err as Error);
    }
  }, []);

  /**
   * Change languages
   */
  const setLanguages = useCallback(async (source: string, target: string) => {
    if (!audioPipeline.current) return;

    try {
      await audioPipeline.current.setLanguages(source, target);
      console.log(`[useAudioPipeline] Languages updated: ${source} -> ${target}`);
    } catch (err) {
      console.error('[useAudioPipeline] Failed to change languages:', err);
      setError(err as Error);
    }
  }, []);

  /**
   * Manual translation (for testing)
   */
  const translateText = useCallback(async (text: string): Promise<string> => {
    if (!audioPipeline.current) {
      throw new Error('Audio pipeline not initialized');
    }

    try {
      return await audioPipeline.current.translateText(text);
    } catch (err) {
      console.error('[useAudioPipeline] Translation failed:', err);
      throw err;
    }
  }, []);

  /**
   * Manual TTS (for testing)
   */
  const speakText = useCallback(async (text: string) => {
    if (!audioPipeline.current) return;

    try {
      await audioPipeline.current.speakText(text);
    } catch (err) {
      console.error('[useAudioPipeline] TTS failed:', err);
      setError(err as Error);
    }
  }, []);

  /**
   * Get pipeline status
   */
  const getStatus = useCallback(() => {
    if (!audioPipeline.current) {
      return {
        isProcessing: false,
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
        isSpeaking: false,
        isListening: false,
      };
    }

    return audioPipeline.current.getStatus();
  }, [config.sourceLanguage, config.targetLanguage]);

  return {
    isProcessing,
    isListening,
    isSpeaking,
    currentTranscript,
    lastTranslation,
    error,
    startProcessing,
    stopProcessing,
    processInboundTranscript,
    setLanguages,
    translateText,
    speakText,
    getStatus,
  };
}



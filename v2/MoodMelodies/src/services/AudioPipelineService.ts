import { EventEmitter } from 'events';
import { STTService } from './STTService';
import { TTSService } from './TTSService';
import { TranslationService } from './TranslationService';

export interface AudioPipelineConfig {
  sourceLanguage: string;
  targetLanguage: string;
  translationApiUrl: string;
}

export interface TranscriptChunk {
  text: string;
  language: string;
  timestamp: number;
  chunkId: string;
  isPartial: boolean;
}

/**
 * AudioPipelineService orchestrates the complete audio translation pipeline:
 * Audio Input -> STT -> Translation -> TTS -> Audio Output
 */
export class AudioPipelineService extends EventEmitter {
  private sttService: STTService;
  private ttsService: TTSService;
  private translationService: TranslationService;
  private sourceLanguage: string;
  private targetLanguage: string;
  private isProcessing = false;
  private lastChunkId = 0;

  constructor(config: AudioPipelineConfig) {
    super();

    this.sourceLanguage = config.sourceLanguage;
    this.targetLanguage = config.targetLanguage;

    // Initialize services
    this.sttService = new STTService({
      language: config.sourceLanguage,
      continuous: true,
      interimResults: true,
    });

    this.ttsService = new TTSService({
      language: config.targetLanguage,
      rate: 0.5,
      pitch: 1.0,
    });

    this.translationService = new TranslationService({
      apiUrl: config.translationApiUrl,
      timeout: 10000,
    });

    console.log('[AudioPipeline] Initialized');
  }

  /**
   * Start processing outbound audio (local mic -> STT -> send)
   */
  public async startOutboundProcessing(
    onTranscript: (chunk: TranscriptChunk) => void
  ): Promise<void> {
    if (this.isProcessing) {
      console.warn('[AudioPipeline] Already processing');
      return;
    }

    try {
      await this.sttService.startListening(
        // Final result
        async (text) => {
          const chunk = this.createTranscriptChunk(text, false);
          console.log('[AudioPipeline] Final transcript:', text);
          onTranscript(chunk);
          this.emit('outboundTranscript', chunk);
        },
        // Partial result
        async (text) => {
          const chunk = this.createTranscriptChunk(text, true);
          console.log('[AudioPipeline] Partial transcript:', text);
          this.emit('outboundPartialTranscript', chunk);
        },
        // Error
        (error) => {
          console.error('[AudioPipeline] STT error:', error);
          this.emit('error', error);
        }
      );

      this.isProcessing = true;
      console.log('[AudioPipeline] Started outbound processing');
    } catch (error) {
      console.error('[AudioPipeline] Failed to start outbound processing:', error);
      throw error;
    }
  }

  /**
   * Process inbound transcript (receive -> translate -> TTS -> speak)
   */
  public async processInboundTranscript(chunk: TranscriptChunk): Promise<void> {
    try {
      // Skip partial results for translation (too frequent)
      if (chunk.isPartial) {
        return;
      }

      console.log('[AudioPipeline] Processing inbound transcript:', chunk.text);

      // Translate
      const startTime = Date.now();
      const translatedText = await this.translationService.translate(
        chunk.text,
        chunk.language,
        this.targetLanguage
      );
      const latency = Date.now() - startTime;

      console.log(`[AudioPipeline] Translated in ${latency}ms:`, translatedText);

      this.emit('inboundTranslation', {
        original: chunk.text,
        translated: translatedText,
        latency,
      });

      // Speak translated text
      await this.ttsService.speak(translatedText);

      this.emit('inboundSpeech', translatedText);
    } catch (error) {
      console.error('[AudioPipeline] Failed to process inbound transcript:', error);
      this.emit('error', error);
    }
  }

  /**
   * Stop processing
   */
  public async stopOutboundProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    try {
      await this.sttService.stopListening();
      await this.ttsService.stop();
      this.isProcessing = false;
      console.log('[AudioPipeline] Stopped outbound processing');
    } catch (error) {
      console.error('[AudioPipeline] Failed to stop processing:', error);
      throw error;
    }
  }

  /**
   * Change languages
   */
  public async setLanguages(source: string, target: string): Promise<void> {
    this.sourceLanguage = source;
    this.targetLanguage = target;

    this.sttService.setLanguage(source);
    await this.ttsService.setLanguage(target);

    console.log(`[AudioPipeline] Languages updated: ${source} -> ${target}`);
  }

  /**
   * Create transcript chunk
   */
  private createTranscriptChunk(text: string, isPartial: boolean): TranscriptChunk {
    return {
      text,
      language: this.sourceLanguage,
      timestamp: Date.now(),
      chunkId: (++this.lastChunkId).toString(),
      isPartial,
    };
  }

  /**
   * Get pipeline status
   */
  public getStatus(): {
    isProcessing: boolean;
    sourceLanguage: string;
    targetLanguage: string;
    isSpeaking: boolean;
    isListening: boolean;
  } {
    return {
      isProcessing: this.isProcessing,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      isSpeaking: this.ttsService.isCurrentlySpeaking(),
      isListening: this.sttService.isCurrentlyListening(),
    };
  }

  /**
   * Manual translation (for testing)
   */
  public async translateText(text: string): Promise<string> {
    return await this.translationService.translate(
      text,
      this.sourceLanguage,
      this.targetLanguage
    );
  }

  /**
   * Manual TTS (for testing)
   */
  public async speakText(text: string): Promise<void> {
    await this.ttsService.speak(text);
  }

  /**
   * Cleanup and destroy
   */
  public async destroy(): Promise<void> {
    try {
      await this.stopOutboundProcessing();
      await this.sttService.destroy();
      await this.ttsService.destroy();
      this.removeAllListeners();
      console.log('[AudioPipeline] Destroyed');
    } catch (error) {
      console.error('[AudioPipeline] Failed to destroy:', error);
    }
  }
}



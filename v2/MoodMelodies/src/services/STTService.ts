import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import Voice from '@react-native-voice/voice';

export interface STTConfig {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export class STTService {
  private isListening = false;
  private currentLanguage: string;
  private onResultCallback: ((text: string) => void) | null = null;
  private onPartialResultCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  constructor(config: STTConfig) {
    this.currentLanguage = config.language;
    this.setupVoiceHandlers();
  }

  /**
   * Setup voice recognition handlers
   */
  private setupVoiceHandlers(): void {
    Voice.onSpeechStart = () => {
      console.log('[STT] Speech started');
    };

    Voice.onSpeechEnd = () => {
      console.log('[STT] Speech ended');
    };

    Voice.onSpeechResults = (event) => {
      if (event.value && event.value.length > 0) {
        const text = event.value[0];
        console.log('[STT] Final result:', text);
        this.onResultCallback?.(text);
      }
    };

    Voice.onSpeechPartialResults = (event) => {
      if (event.value && event.value.length > 0) {
        const text = event.value[0];
        console.log('[STT] Partial result:', text);
        this.onPartialResultCallback?.(text);
      }
    };

    Voice.onSpeechError = (event) => {
      console.error('[STT] Error:', event.error);
      this.onErrorCallback?.(new Error(event.error?.message || 'Speech recognition error'));
    };
  }

  /**
   * Start listening for speech
   */
  public async startListening(
    onResult: (text: string) => void,
    onPartialResult?: (text: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (this.isListening) {
      console.warn('[STT] Already listening');
      return;
    }

    try {
      this.onResultCallback = onResult;
      this.onPartialResultCallback = onPartialResult || null;
      this.onErrorCallback = onError || null;

      // Map language codes to platform-specific codes
      const locale = this.getLocaleCode(this.currentLanguage);

      await Voice.start(locale, {
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 300,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 400,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 400,
      });

      this.isListening = true;
      console.log(`[STT] Started listening (${locale})`);
    } catch (error) {
      console.error('[STT] Failed to start:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop listening
   */
  public async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await Voice.stop();
      this.isListening = false;
      console.log('[STT] Stopped listening');
    } catch (error) {
      console.error('[STT] Failed to stop:', error);
      throw error;
    }
  }

  /**
   * Cancel listening
   */
  public async cancel(): Promise<void> {
    try {
      await Voice.cancel();
      this.isListening = false;
      console.log('[STT] Cancelled');
    } catch (error) {
      console.error('[STT] Failed to cancel:', error);
    }
  }

  /**
   * Destroy and cleanup
   */
  public async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      this.isListening = false;
      this.onResultCallback = null;
      this.onPartialResultCallback = null;
      this.onErrorCallback = null;
      console.log('[STT] Destroyed');
    } catch (error) {
      console.error('[STT] Failed to destroy:', error);
    }
  }

  /**
   * Change language
   */
  public setLanguage(language: string): void {
    this.currentLanguage = language;
    console.log(`[STT] Language changed to: ${language}`);
  }

  /**
   * Check if STT is available
   */
  public static async isAvailable(): Promise<boolean> {
    try {
      return await Voice.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific locale code
   */
  private getLocaleCode(language: string): string {
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      // Add more as needed
    };

    return localeMap[language] || 'en-US';
  }

  /**
   * Get available languages (platform-specific)
   */
  public static async getAvailableLanguages(): Promise<string[]> {
    try {
      const available = await Voice.getSupportedLanguages();
      return available || [];
    } catch (error) {
      console.error('[STT] Failed to get available languages:', error);
      return [];
    }
  }

  /**
   * Check if listening
   */
  public isCurrentlyListening(): boolean {
    return this.isListening;
  }
}



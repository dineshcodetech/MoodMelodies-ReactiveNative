import Tts from 'react-native-tts';

export interface TTSConfig {
  language: string;
  rate?: number;
  pitch?: number;
}

export class TTSService {
  private currentLanguage: string;
  private rate: number;
  private pitch: number;
  private isSpeaking = false;

  constructor(config: TTSConfig) {
    this.currentLanguage = config.language;
    this.rate = config.rate || 0.5; // Normal speed
    this.pitch = config.pitch || 1.0; // Normal pitch

    this.initialize();
  }

  /**
   * Initialize TTS
   */
  private async initialize(): Promise<void> {
    try {
      // Set default language
      await Tts.setDefaultLanguage(this.getLocaleCode(this.currentLanguage));

      // Set default rate
      await Tts.setDefaultRate(this.rate);

      // Set default pitch
      await Tts.setDefaultPitch(this.pitch);

      // Setup event listeners
      this.setupEventListeners();

      console.log(`[TTS] Initialized (${this.currentLanguage})`);
    } catch (error) {
      console.error('[TTS] Initialization failed:', error);
    }
  }

  /**
   * Setup TTS event listeners
   */
  private setupEventListeners(): void {
    Tts.addEventListener('tts-start', () => {
      console.log('[TTS] Started speaking');
      this.isSpeaking = true;
    });

    Tts.addEventListener('tts-finish', () => {
      console.log('[TTS] Finished speaking');
      this.isSpeaking = false;
    });

    Tts.addEventListener('tts-cancel', () => {
      console.log('[TTS] Cancelled');
      this.isSpeaking = false;
    });

    Tts.addEventListener('tts-error', (event) => {
      console.error('[TTS] Error:', event);
      this.isSpeaking = false;
    });
  }

  /**
   * Speak text
   */
  public async speak(text: string): Promise<void> {
    if (!text || text.trim().length === 0) {
      return;
    }

    try {
      // Stop any ongoing speech
      if (this.isSpeaking) {
        await this.stop();
      }

      await Tts.speak(text);
      console.log(`[TTS] Speaking: "${text.substring(0, 50)}..."`);
    } catch (error) {
      console.error('[TTS] Failed to speak:', error);
      throw error;
    }
  }

  /**
   * Stop speaking
   */
  public async stop(): Promise<void> {
    try {
      await Tts.stop();
      this.isSpeaking = false;
      console.log('[TTS] Stopped');
    } catch (error) {
      console.error('[TTS] Failed to stop:', error);
    }
  }

  /**
   * Set speech rate
   */
  public async setRate(rate: number): Promise<void> {
    try {
      this.rate = Math.max(0.1, Math.min(2.0, rate)); // Clamp between 0.1 and 2.0
      await Tts.setDefaultRate(this.rate);
      console.log(`[TTS] Rate set to: ${this.rate}`);
    } catch (error) {
      console.error('[TTS] Failed to set rate:', error);
    }
  }

  /**
   * Set pitch
   */
  public async setPitch(pitch: number): Promise<void> {
    try {
      this.pitch = Math.max(0.5, Math.min(2.0, pitch)); // Clamp between 0.5 and 2.0
      await Tts.setDefaultPitch(this.pitch);
      console.log(`[TTS] Pitch set to: ${this.pitch}`);
    } catch (error) {
      console.error('[TTS] Failed to set pitch:', error);
    }
  }

  /**
   * Change language
   */
  public async setLanguage(language: string): Promise<void> {
    try {
      this.currentLanguage = language;
      const locale = this.getLocaleCode(language);
      await Tts.setDefaultLanguage(locale);
      console.log(`[TTS] Language changed to: ${locale}`);
    } catch (error) {
      console.error('[TTS] Failed to change language:', error);
      throw error;
    }
  }

  /**
   * Get available voices
   */
  public static async getAvailableVoices(): Promise<any[]> {
    try {
      const voices = await Tts.voices();
      return voices;
    } catch (error) {
      console.error('[TTS] Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Check if TTS is initialized
   */
  public static async isInitialized(): Promise<boolean> {
    try {
      // Try to get voices as a test
      await Tts.voices();
      return true;
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
   * Check if currently speaking
   */
  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Cleanup
   */
  public async destroy(): Promise<void> {
    try {
      await this.stop();
      // Remove event listeners
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      Tts.removeAllListeners('tts-error');
      console.log('[TTS] Destroyed');
    } catch (error) {
      console.error('[TTS] Failed to destroy:', error);
    }
  }
}



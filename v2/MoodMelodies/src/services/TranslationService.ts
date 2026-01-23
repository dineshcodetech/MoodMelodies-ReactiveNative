import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TranslationConfig {
  apiUrl: string;
  timeout?: number;
}

export interface TranslationRequest {
  text: string;
  source_lang: string;
  target_lang: string;
}

export interface TranslationResponse {
  translated_text: string;
  source_lang: string;
  target_lang: string;
  model?: string;
  cached: boolean;
  latency_ms: number;
}

export class TranslationService {
  private client: AxiosInstance;
  private cache: Map<string, string> = new Map();
  private pendingRequests: Map<string, Promise<string>> = new Map();

  constructor(config: TranslationConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Translate text
   */
  public async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    if (!text || text.trim().length === 0) {
      return '';
    }

    // Check local cache first
    const cacheKey = this.getCacheKey(text, sourceLang, targetLang);
    const cachedTranslation = this.cache.get(cacheKey);

    if (cachedTranslation) {
      console.log('[Translation] Cache hit');
      return cachedTranslation;
    }

    // Check if there's a pending request for the same text
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      console.log('[Translation] Returning pending request');
      return pendingRequest;
    }

    // Create new translation request
    const translationPromise = this.performTranslation(text, sourceLang, targetLang);
    this.pendingRequests.set(cacheKey, translationPromise);

    try {
      const translation = await translationPromise;
      
      // Cache the result
      this.cache.set(cacheKey, translation);
      
      // Limit cache size (keep last 100 translations)
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return translation;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Perform actual translation via API (V2 backend)
   */
  private async performTranslation(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    try {
      // Get JWT token for authentication
      const token = await AsyncStorage.getItem('auth_token');
      
      const request: TranslationRequest = {
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
      };

      console.log(`[Translation] Translating: ${sourceLang} -> ${targetLang}`);

      const response = await this.client.post<TranslationResponse>(
        '/api/v2/translation/translate',
        request,
        {
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {},
        }
      );

      const { translated_text } = response.data;

      console.log(`[Translation] Success`);

      return translated_text;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[Translation] API error:', error.response?.data || error.message);
        throw new Error(
          error.response?.data?.error || 'Translation failed'
        );
      }
      throw error;
    }
  }

  /**
   * Batch translate multiple texts
   */
  public async translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string
  ): Promise<string[]> {
    try {
      const translations = await Promise.all(
        texts.map(text => this.translate(text, sourceLang, targetLang))
      );
      return translations;
    } catch (error) {
      console.error('[Translation] Batch translation failed:', error);
      throw error;
    }
  }

  /**
   * Get supported languages (V2 backend - returns common language pairs)
   */
  public async getSupportedLanguages(): Promise<Array<{ source: string; target: string }>> {
    // V2 backend supports all languages via Gemini, return common pairs
    const commonLanguages = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'gu', 'bn', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'ru'];
    const pairs: Array<{ source: string; target: string }> = [];
    
    for (let i = 0; i < commonLanguages.length; i++) {
      for (let j = i + 1; j < commonLanguages.length; j++) {
        pairs.push({ source: commonLanguages[i], target: commonLanguages[j] });
        pairs.push({ source: commonLanguages[j], target: commonLanguages[i] });
      }
    }
    
    return pairs;
  }

  /**
   * Check service health
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('[Translation] Health check failed:', error);
      return false;
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(text: string, sourceLang: string, targetLang: string): string {
    return `${sourceLang}:${targetLang}:${text}`;
  }

  /**
   * Clear local cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('[Translation] Cache cleared');
  }

  /**
   * Get cache size
   */
  public getCacheSize(): number {
    return this.cache.size;
  }
}



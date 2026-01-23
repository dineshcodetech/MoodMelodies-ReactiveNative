import { Platform } from 'react-native';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// API Configuration - V2 Backend
export const API_CONFIG = {
  // V2 Backend URL (Flask with WebSocket support)
  BASE_URL: __DEV__
    ? `http://${DEV_HOST}:7777`
    : 'https://api-v2.moodmelodies.app',
  SIGNALING_URL: __DEV__
    ? `http://${DEV_HOST}:7777`
    : 'https://api-v2.moodmelodies.app',
  TRANSLATION_URL: __DEV__
    ? `http://${DEV_HOST}:7777`
    : 'https://api-v2.moodmelodies.app',
  API_VERSION: 'v2',
};

// Supported Languages
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو (Urdu)', flag: '🇵🇰' },
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano (Italian)', flag: '🇮🇹' },
  { code: 'pt', name: 'Português (Portuguese)', flag: '🇵🇹' },
  { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
];

// Color Theme
export const COLORS = {
  primary: '#6200EE',
  primaryDark: '#3700B3',
  primaryLight: '#BB86FC',
  secondary: '#03DAC6',
  secondaryDark: '#018786',
  error: '#B00020',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

// Audio Configuration
export const AUDIO_CONFIG = {
  CHUNK_SIZE_MS: 400,
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  ENCODING: 'pcm_s16le',
};

// WebRTC Configuration
export const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production
  ],
};

// Error Messages
export const ERROR_MESSAGES = {
  MICROPHONE_PERMISSION: 'Microphone permission is required for calls',
  NETWORK_ERROR: 'Network error. Please check your connection',
  CALL_FAILED: 'Failed to connect to call',
  TRANSLATION_FAILED: 'Translation service unavailable',
};



# Mood Melodies - System Architecture

## 🎯 High-Level Overview

Mood Melodies is a real-time voice translation calling app that enables users speaking different languages to communicate seamlessly. The system uses WebRTC for P2P audio streaming, on-device speech processing, and self-hosted translation services.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER A (Hindi Speaker)                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    React Native App                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │  Audio   │→ │   STT    │→ │   Send   │→ │ WebRTC   │      │  │
│  │  │  Input   │  │ (Native) │  │  Text    │  │  Peer    │──┐   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │   │  │
│  │                                                             │   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │  │
│  │  │  Audio   │← │   TTS    │← │ Receive  │← │ WebRTC   │  │   │  │
│  │  │  Output  │  │ (Native) │  │Translated│  │  Peer    │←─┘   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    ↕
                          ┌─────────────────┐
                          │  Signaling      │
                          │  Server         │
                          │  (Node.js)      │
                          │                 │
                          │  • WebSocket    │
                          │  • ICE/SDP      │
                          │  • Matchmaking  │
                          └─────────────────┘
                                    ↕
                          ┌─────────────────┐
                          │  Translation    │
                          │  Service        │
                          │  (Python)       │
                          │                 │
                          │  • MarianMT     │
                          │  • Cached       │
                          │  • REST API     │
                          └─────────────────┘
                                    ↕
┌─────────────────────────────────────────────────────────────────────┐
│                         USER B (English Speaker)                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    React Native App                            │  │
│  │  [Mirror of User A's architecture]                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Real-Time Translation Flow

### Outbound Audio (User A → User B)

1. **Audio Capture** (10-20ms)
   - Microphone captures raw audio
   - Buffer audio in 300-500ms chunks
   - Format: 16kHz, mono, 16-bit PCM

2. **Speech-to-Text** (50-150ms)
   - On-device STT using native APIs
   - iOS: Speech Framework
   - Android: Speech Recognizer
   - Output: Transcribed text in source language

3. **Text Transmission** (20-50ms)
   - Send text over WebRTC data channel
   - Chunked transmission for streaming
   - Includes timestamp and chunk ID

4. **Translation** (30-100ms)
   - Translate via self-hosted MarianMT
   - HTTP request to translation service
   - Caching for common phrases
   - Fallback to previous translation on error

5. **Text-to-Speech** (50-100ms)
   - Convert translated text to audio
   - Native TTS engines
   - Stream audio to speaker

**Total Latency: 160-420ms**

### Inbound Audio (User B → User A)

Mirror of the outbound flow, but:
- Receives translated text via WebRTC data channel
- Applies TTS in user's language
- Plays audio output

## 🧩 Component Architecture

### 1. Mobile App (React Native)

```
MoodMelodies/
├── src/
│   ├── services/
│   │   ├── WebRTCService.ts        # P2P connection management
│   │   ├── AudioService.ts         # Audio capture/playback
│   │   ├── STTService.ts           # Speech-to-text wrapper
│   │   ├── TTSService.ts           # Text-to-speech wrapper
│   │   ├── TranslationService.ts   # Translation API client
│   │   └── SignalingService.ts     # WebSocket signaling
│   ├── modules/
│   │   ├── AudioPipeline/          # Native audio processing
│   │   │   ├── ios/                # iOS Swift/Objective-C
│   │   │   └── android/            # Android Kotlin/Java
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Main landing
│   │   ├── CallScreen.tsx          # Active call UI
│   │   └── SettingsScreen.tsx      # Language/audio settings
│   ├── hooks/
│   │   ├── useWebRTC.ts            # WebRTC hook
│   │   ├── useTranslation.ts       # Translation hook
│   │   └── useAudioPipeline.ts     # Audio processing hook
│   └── utils/
│       ├── audioBuffer.ts          # Audio chunk management
│       ├── languageDetection.ts    # Detect user language
│       └── networkMonitor.ts       # Connection quality
```

### 2. Signaling Server (Node.js + TypeScript)

```
signaling-server/
├── src/
│   ├── server.ts                   # Express + WebSocket
│   ├── handlers/
│   │   ├── callHandler.ts          # Call initiation/termination
│   │   ├── signalingHandler.ts     # ICE/SDP exchange
│   │   └── matchmakingHandler.ts   # User pairing
│   ├── services/
│   │   ├── roomService.ts          # Call room management
│   │   └── userService.ts          # User state management
│   └── utils/
│       ├── logger.ts               # Winston logging
│       └── validation.ts           # Input validation
```

### 3. Translation Service (Python + Flask)

```
translation-service/
├── src/
│   ├── app.py                      # Flask REST API
│   ├── models/
│   │   ├── marian_translator.py    # MarianMT wrapper
│   │   └── model_loader.py         # Lazy model loading
│   ├── cache/
│   │   └── translation_cache.py    # Redis/in-memory cache
│   ├── routes/
│   │   └── translate.py            # /translate endpoint
│   └── utils/
│       ├── language_pair.py        # Language detection
│       └── batching.py             # Request batching
```

## 🎛️ Key Technical Decisions

### 1. WebRTC Architecture: Mesh vs SFU

**Decision: Mesh (P2P)**

- **Rationale**: 1-on-1 calls only, no multi-party conferencing
- **Benefits**: 
  - Zero backend bandwidth costs
  - Lowest latency
  - No media server infrastructure
- **Tradeoffs**: Doesn't scale to group calls (not required)

### 2. Audio Processing Location: On-Device vs Cloud

**Decision: Hybrid (On-Device STT/TTS + Self-Hosted Translation)**

- **STT/TTS**: Native device APIs
  - No API costs
  - Works offline (no translation)
  - Privacy-friendly
  - Low latency (50-150ms)

- **Translation**: Self-hosted MarianMT
  - One-time deployment cost
  - Scales horizontally
  - No per-request billing
  - ~50ms latency on GPU

### 3. Audio Chunking Strategy

**Decision: 400ms chunks**

- Balances latency and accuracy
- Allows streaming STT
- Network-efficient
- Buffer strategy:
  ```
  Chunk 1: [0-400ms]   → Process
  Chunk 2: [400-800ms] → Process (overlap 100ms)
  Chunk 3: [800-1200ms] → Process (overlap 100ms)
  ```

### 4. Translation Caching

**Decision: LRU cache with TTL**

- Cache common phrases (greetings, questions)
- Reduces translation latency by 60-80%
- Redis for distributed caching
- TTL: 24 hours

### 5. Network Transport

**Decision: WebRTC Data Channels for text, Audio Channels for voice**

- Audio Channel: Original voice (muted on far end)
- Data Channel: 
  - Transcribed text
  - Translated text
  - Metadata (language, timestamps)
  - Control messages

## 🔧 Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Mobile App | React Native 0.76+ | Cross-platform, WebRTC support, native modules |
| WebRTC | react-native-webrtc | Mature, well-maintained |
| STT (iOS) | Speech Framework | Native, free, high accuracy |
| STT (Android) | SpeechRecognizer | Native, free, supports Hindi/English |
| TTS (iOS) | AVSpeechSynthesizer | Native, free, natural voices |
| TTS (Android) | TextToSpeech | Native, free, supports many languages |
| Translation | MarianMT (Helsinki-NLP) | SOTA NMT, self-hostable, fast |
| Translation Runtime | PyTorch + ONNX | Optimized inference |
| Signaling | Node.js + Socket.IO | Real-time, scalable |
| Caching | Redis | Fast, distributed |
| Deployment | Docker + K8s | Scalable, portable |

## 📊 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| End-to-end latency | < 500ms | Time from speech to translated audio |
| Audio quality | 16kHz, 16-bit | Clear voice transmission |
| Translation accuracy | > 85% BLEU | For Hindi ↔ English |
| Concurrent calls | 10,000+ | Per server instance |
| CPU usage (mobile) | < 20% | During active call |
| Battery drain | < 5%/hour | Comparable to regular calls |
| Network bandwidth | 50-100 kbps | Per user |

## 🔐 Security & Privacy

1. **End-to-End Encryption**
   - DTLS-SRTP for audio (WebRTC default)
   - TLS for signaling and translation API

2. **No Data Retention**
   - Translation cache: 24h TTL
   - No call recordings
   - No transcript storage
   - GDPR/CCPA compliant

3. **Authentication**
   - JWT tokens for API access
   - Device fingerprinting
   - Rate limiting

## 📈 Scalability Strategy

### Horizontal Scaling

1. **Signaling Servers**
   - Stateless design
   - Load balancer (Nginx/HAProxy)
   - Redis for session state

2. **Translation Service**
   - GPU-accelerated instances (AWS g4dn.xlarge)
   - Auto-scaling based on queue depth
   - Model replicas across instances

### Cost Optimization

| Resource | Strategy | Monthly Cost (1000 users) |
|----------|----------|---------------------------|
| Signaling | 2x t3.small | $30 |
| Translation | 1x g4dn.xlarge (50% util) | $150 |
| Redis | 1x t3.micro | $10 |
| TURN server | Coturn on t3.small | $15 |
| **Total** | | **$205** |

**Per-user cost: $0.20/month**

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AWS / GCP / Azure                     │
│                                                          │
│  ┌────────────────┐         ┌────────────────┐         │
│  │  Load Balancer │         │  Load Balancer │         │
│  │   (Signaling)  │         │  (Translation) │         │
│  └────────┬───────┘         └────────┬───────┘         │
│           │                          │                  │
│  ┌────────┴────────┐        ┌────────┴────────┐        │
│  │  Signaling Pod  │        │ Translation Pod │        │
│  │  (Node.js)      │        │  (Python+GPU)   │        │
│  │  x3 replicas    │        │  x2 replicas    │        │
│  └─────────────────┘        └─────────────────┘        │
│           │                          │                  │
│  ┌────────┴──────────────────────────┴────────┐        │
│  │              Redis Cluster                  │        │
│  │       (Session + Translation Cache)         │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │         TURN Server (Coturn)                │        │
│  │     For NAT traversal (5% of calls)         │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## 🧪 Testing Strategy

1. **Unit Tests**
   - Audio chunking logic
   - Translation caching
   - WebRTC state machine

2. **Integration Tests**
   - Full audio pipeline
   - Signaling flow
   - Translation service

3. **Performance Tests**
   - Latency measurement (end-to-end)
   - Concurrent call stress testing
   - Memory leak detection
   - Battery drain profiling

4. **Network Tests**
   - Packet loss simulation (0-5%)
   - Bandwidth throttling
   - NAT traversal scenarios

## 🔮 Future Enhancements (Post-MVP)

1. **Additional Languages**
   - Add more MarianMT models
   - Support 20+ languages
   - Auto-language detection

2. **Advanced Features**
   - Call recording (opt-in)
   - Live transcription display
   - Accent adaptation
   - Background noise cancellation

3. **On-Device Translation** (Long-term)
   - Quantized MarianMT models (100MB)
   - Run on-device for privacy
   - Fallback to cloud for accuracy

4. **Quality Improvements**
   - Voice cloning (preserve tone)
   - Emotion preservation
   - Context-aware translation

## 📚 References

- WebRTC Architecture: https://webrtc.org/
- MarianMT: https://huggingface.co/Helsinki-NLP
- React Native WebRTC: https://github.com/react-native-webrtc/react-native-webrtc
- iOS Speech Framework: https://developer.apple.com/documentation/speech
- Android SpeechRecognizer: https://developer.android.com/reference/android/speech/SpeechRecognizer



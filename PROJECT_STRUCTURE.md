# Mood Melodies - Complete Project Structure

## 📁 Repository Organization

```
MoodMelodies-ReactiveNative/
├── MoodMelodies/                          # React Native Mobile App
│   ├── src/
│   │   ├── services/                      # Core business logic
│   │   │   ├── WebRTCService.ts
│   │   │   ├── AudioService.ts
│   │   │   ├── STTService.ts
│   │   │   ├── TTSService.ts
│   │   │   ├── TranslationService.ts
│   │   │   └── SignalingService.ts
│   │   ├── modules/                       # Native modules
│   │   │   └── AudioPipeline/
│   │   │       ├── ios/
│   │   │       │   ├── AudioPipeline.swift
│   │   │       │   ├── AudioPipeline.m
│   │   │       │   └── AudioPipeline-Bridging-Header.h
│   │   │       └── android/
│   │   │           ├── AudioPipelineModule.kt
│   │   │           └── AudioPipelinePackage.kt
│   │   ├── screens/                       # UI Screens
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── CallScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── components/                    # Reusable components
│   │   │   ├── CallControls.tsx
│   │   │   ├── LanguageSelector.tsx
│   │   │   ├── TranscriptView.tsx
│   │   │   └── ConnectionStatus.tsx
│   │   ├── hooks/                         # Custom React hooks
│   │   │   ├── useWebRTC.ts
│   │   │   ├── useTranslation.ts
│   │   │   ├── useAudioPipeline.ts
│   │   │   └── useNetworkQuality.ts
│   │   ├── utils/                         # Utilities
│   │   │   ├── audioBuffer.ts
│   │   │   ├── languageDetection.ts
│   │   │   ├── networkMonitor.ts
│   │   │   └── logger.ts
│   │   ├── types/                         # TypeScript types
│   │   │   ├── call.types.ts
│   │   │   ├── translation.types.ts
│   │   │   └── webrtc.types.ts
│   │   ├── constants/                     # App constants
│   │   │   ├── languages.ts
│   │   │   ├── config.ts
│   │   │   └── errors.ts
│   │   └── navigation/                    # React Navigation
│   │       └── AppNavigator.tsx
│   ├── __tests__/                         # Test files
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── integration/
│   ├── android/                           # Android native
│   ├── ios/                               # iOS native
│   ├── App.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── signaling-server/                      # Node.js Signaling Server
│   ├── src/
│   │   ├── server.ts                      # Main entry point
│   │   ├── handlers/
│   │   │   ├── callHandler.ts
│   │   │   ├── signalingHandler.ts
│   │   │   └── matchmakingHandler.ts
│   │   ├── services/
│   │   │   ├── roomService.ts
│   │   │   ├── userService.ts
│   │   │   └── redisService.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── validation.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── errors.ts
│   │   └── types/
│   │       ├── socket.types.ts
│   │       └── room.types.ts
│   ├── __tests__/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── translation-service/                   # Python Translation Service
│   ├── src/
│   │   ├── app.py                         # Flask app
│   │   ├── models/
│   │   │   ├── marian_translator.py
│   │   │   ├── model_loader.py
│   │   │   └── language_detector.py
│   │   ├── cache/
│   │   │   ├── translation_cache.py
│   │   │   └── redis_cache.py
│   │   ├── routes/
│   │   │   ├── translate.py
│   │   │   ├── health.py
│   │   │   └── languages.py
│   │   ├── utils/
│   │   │   ├── batching.py
│   │   │   ├── text_preprocessing.py
│   │   │   └── metrics.py
│   │   └── config/
│   │       └── settings.py
│   ├── tests/
│   ├── models/                            # Cached translation models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── infrastructure/                        # Deployment configs
│   ├── kubernetes/
│   │   ├── signaling-deployment.yaml
│   │   ├── translation-deployment.yaml
│   │   ├── redis-deployment.yaml
│   │   ├── turn-deployment.yaml
│   │   ├── ingress.yaml
│   │   └── configmap.yaml
│   ├── docker-compose.yml                 # Local development
│   ├── terraform/                         # IaC for cloud
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── scripts/
│       ├── deploy.sh
│       ├── scale.sh
│       └── backup.sh
│
├── docs/                                  # Documentation
│   ├── ARCHITECTURE.md                    # System architecture
│   ├── API.md                             # API documentation
│   ├── DEPLOYMENT.md                      # Deployment guide
│   ├── DEVELOPMENT.md                     # Dev setup guide
│   └── TESTING.md                         # Testing strategy
│
└── scripts/                               # Utility scripts
    ├── setup-dev.sh                       # Dev environment setup
    ├── run-tests.sh                       # Run all tests
    ├── benchmark.sh                       # Performance testing
    └── download-models.sh                 # Download translation models
```

## 🔧 Configuration Files

### Root Level
- `.gitignore` - Git ignore patterns
- `README.md` - Project overview
- `LICENSE` - License file
- `ARCHITECTURE.md` - Architecture documentation
- `PROJECT_STRUCTURE.md` - This file

### Mobile App (`MoodMelodies/`)
- `package.json` - NPM dependencies
- `tsconfig.json` - TypeScript config
- `.eslintrc.js` - ESLint config
- `.prettierrc` - Prettier config
- `metro.config.js` - Metro bundler config
- `babel.config.js` - Babel config
- `jest.config.js` - Jest test config

### Signaling Server (`signaling-server/`)
- `package.json` - NPM dependencies
- `tsconfig.json` - TypeScript config
- `Dockerfile` - Docker image
- `.env.example` - Environment variables template
- `nodemon.json` - Nodemon config for dev

### Translation Service (`translation-service/`)
- `requirements.txt` - Python dependencies
- `Dockerfile` - Docker image
- `.env.example` - Environment variables template
- `pytest.ini` - Pytest configuration
- `mypy.ini` - Type checking config

## 📦 Key Dependencies

### React Native App
```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-webrtc": "^124.0.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "socket.io-client": "^4.7.2",
    "axios": "^1.6.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "@react-native-community/netinfo": "^11.2.0",
    "react-native-permissions": "^4.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.73.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.0"
  }
}
```

### Signaling Server
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "redis": "^4.6.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "joi": "^17.11.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "nodemon": "^3.0.2",
    "jest": "^29.7.0"
  }
}
```

### Translation Service
```txt
Flask==3.0.0
transformers==4.36.0
torch==2.1.0
sentencepiece==0.1.99
redis==5.0.1
gunicorn==21.2.0
prometheus-client==0.19.0
```

## 🎯 Module Responsibilities

### Mobile App Services

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| WebRTCService | Manage P2P connections, ICE, SDP | react-native-webrtc |
| AudioService | Audio capture/playback control | Native APIs |
| STTService | Speech-to-text processing | Native Speech APIs |
| TTSService | Text-to-speech synthesis | Native TTS APIs |
| TranslationService | API client for translation | axios |
| SignalingService | WebSocket communication | socket.io-client |

### Signaling Server Handlers

| Handler | Responsibility | Purpose |
|---------|---------------|---------|
| callHandler | Call lifecycle management | Start, end, manage calls |
| signalingHandler | WebRTC signaling | ICE, SDP exchange |
| matchmakingHandler | User pairing | Find and connect users |

### Translation Service Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| marian_translator | Core translation logic | MarianMT |
| model_loader | Lazy load models | PyTorch |
| translation_cache | Cache translations | Redis |
| batching | Batch multiple requests | Custom |

## 🔌 API Endpoints

### Signaling Server (WebSocket)

```
ws://signaling-server:3000/

Events (Client → Server):
- join_room: Join a call room
- leave_room: Leave a call room
- offer: Send WebRTC offer
- answer: Send WebRTC answer
- ice_candidate: Send ICE candidate
- find_match: Request matchmaking

Events (Server → Client):
- room_joined: Confirmation
- user_joined: New user in room
- user_left: User left room
- offer: Received offer
- answer: Received answer
- ice_candidate: Received ICE candidate
- match_found: Match found
- error: Error occurred
```

### Translation Service (HTTP REST)

```
POST /api/v1/translate
Request:
{
  "text": "Hello, how are you?",
  "source_lang": "en",
  "target_lang": "hi"
}

Response:
{
  "translated_text": "नमस्ते, आप कैसे हैं?",
  "source_lang": "en",
  "target_lang": "hi",
  "model": "Helsinki-NLP/opus-mt-en-hi",
  "cached": false,
  "latency_ms": 45
}

GET /api/v1/health
Response:
{
  "status": "healthy",
  "models_loaded": ["en-hi", "hi-en"],
  "cache_status": "connected"
}

GET /api/v1/languages
Response:
{
  "supported_pairs": [
    {"source": "en", "target": "hi"},
    {"source": "hi", "target": "en"}
  ]
}
```

## 🗄️ Data Models

### Call Room (Redis)
```typescript
interface CallRoom {
  roomId: string;
  users: {
    userId: string;
    language: string;
    socketId: string;
  }[];
  createdAt: number;
  status: 'waiting' | 'active' | 'ended';
}
```

### Translation Cache (Redis)
```python
{
  "key": "en:hi:Hello, how are you?",
  "value": "नमस्ते, आप कैसे हैं?",
  "ttl": 86400  # 24 hours
}
```

### WebRTC Message (Data Channel)
```typescript
interface TranslationMessage {
  type: 'transcript' | 'translation';
  text: string;
  language: string;
  timestamp: number;
  chunkId: string;
}
```

## 🚀 Deployment Ports

| Service | Port | Protocol | Public |
|---------|------|----------|--------|
| Signaling Server | 3000 | HTTP/WS | Yes |
| Translation Service | 7777 | HTTP | Internal |
| Redis | 6379 | TCP | Internal |
| TURN Server | 3478 | UDP/TCP | Yes |

## 📊 Monitoring & Observability

### Metrics to Track
- End-to-end translation latency
- WebRTC connection success rate
- Translation cache hit rate
- Concurrent active calls
- Server CPU/memory usage
- Network bandwidth per user

### Logging Strategy
- Structured JSON logs
- Log levels: DEBUG, INFO, WARN, ERROR
- Centralized logging (ELK stack or CloudWatch)
- PII scrubbing in logs

## 🔒 Security Considerations

1. **API Security**
   - JWT authentication for mobile app
   - Rate limiting on all endpoints
   - CORS configuration

2. **Data Privacy**
   - No persistent storage of transcripts
   - End-to-end encryption (WebRTC DTLS-SRTP)
   - GDPR-compliant data handling

3. **Infrastructure Security**
   - TLS/SSL on all HTTP endpoints
   - Private VPC for internal services
   - Regular security updates

This structure ensures modularity, scalability, and maintainability while keeping costs low and performance high.



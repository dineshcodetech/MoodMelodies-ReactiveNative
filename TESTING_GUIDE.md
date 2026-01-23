# Mood Melodies - Testing Guide

## 🧪 Testing Strategy

This guide covers all testing approaches for Mood Melodies, including unit tests, integration tests, and performance tests.

---

## 📋 Test Categories

### 1. Unit Tests
- Individual service functions
- Utility functions
- Translation caching
- Audio buffer management

### 2. Integration Tests
- Full audio pipeline (STT → Translation → TTS)
- WebRTC signaling flow
- End-to-end call flow

### 3. Performance Tests
- Translation latency
- Audio processing latency
- Concurrent call handling
- Memory usage

### 4. Network Tests
- Packet loss scenarios
- Bandwidth throttling
- Connection recovery

---

## 🔧 Unit Tests

### Signaling Server Tests

**File: `signaling-server/__tests__/roomService.test.ts`**

```typescript
import { RoomService } from '../src/services/roomService';
import { RedisService } from '../src/services/redisService';

describe('RoomService', () => {
  let roomService: RoomService;
  let mockRedis: jest.Mocked<RedisService>;

  beforeEach(() => {
    mockRedis = {
      createRoom: jest.fn(),
      getRoom: jest.fn(),
      updateRoom: jest.fn(),
      deleteRoom: jest.fn(),
    } as any;

    roomService = new RoomService();
  });

  test('should create a new room', async () => {
    const room = await roomService.createRoom();
    
    expect(room).toHaveProperty('roomId');
    expect(room.users).toHaveLength(0);
    expect(room.status).toBe('waiting');
  });

  test('should add user to room', async () => {
    const room = await roomService.createRoom();
    const user = {
      userId: 'user1',
      socketId: 'socket1',
      language: 'en'
    };

    const updatedRoom = await roomService.addUserToRoom(room.roomId, user);
    
    expect(updatedRoom.users).toHaveLength(1);
    expect(updatedRoom.users[0].userId).toBe('user1');
  });

  test('should mark room as active when 2 users join', async () => {
    const room = await roomService.createRoom();
    
    await roomService.addUserToRoom(room.roomId, {
      userId: 'user1',
      socketId: 'socket1',
      language: 'en'
    });

    const updatedRoom = await roomService.addUserToRoom(room.roomId, {
      userId: 'user2',
      socketId: 'socket2',
      language: 'hi'
    });

    expect(updatedRoom.status).toBe('active');
    expect(updatedRoom.users).toHaveLength(2);
  });

  test('should reject third user in full room', async () => {
    const room = await roomService.createRoom();
    
    await roomService.addUserToRoom(room.roomId, {
      userId: 'user1',
      socketId: 'socket1',
      language: 'en'
    });

    await roomService.addUserToRoom(room.roomId, {
      userId: 'user2',
      socketId: 'socket2',
      language: 'hi'
    });

    await expect(
      roomService.addUserToRoom(room.roomId, {
        userId: 'user3',
        socketId: 'socket3',
        language: 'en'
      })
    ).rejects.toThrow('Room is full');
  });
});
```

**Run tests:**
```bash
cd signaling-server
npm test
npm run test:coverage
```

---

### Translation Service Tests

**File: `translation-service/tests/test_translation.py`**

```python
import pytest
from src.models.marian_translator import MarianTranslator
from src.cache.translation_cache import TranslationCache

@pytest.fixture
def translator():
    return MarianTranslator()

@pytest.fixture
def cache():
    return TranslationCache()

def test_english_to_hindi_translation(translator):
    """Test basic English to Hindi translation"""
    text = "Hello, how are you?"
    result = translator.translate(text, 'en', 'hi')
    
    assert result is not None
    assert len(result) > 0
    assert isinstance(result, str)
    # Should contain Hindi characters
    assert any('\u0900' <= char <= '\u097F' for char in result)

def test_hindi_to_english_translation(translator):
    """Test basic Hindi to English translation"""
    text = "नमस्ते, आप कैसे हैं?"
    result = translator.translate(text, 'hi', 'en')
    
    assert result is not None
    assert len(result) > 0
    assert 'hello' in result.lower() or 'hi' in result.lower()

def test_translation_cache(cache):
    """Test translation caching"""
    text = "Test"
    source = "en"
    target = "hi"
    translation = "परीक्षण"
    
    # Set cache
    cache.set(text, source, target, translation)
    
    # Get from cache
    cached = cache.get(text, source, target)
    assert cached == translation

def test_translation_latency(translator):
    """Test translation latency is under threshold"""
    import time
    
    text = "This is a test sentence for latency measurement"
    
    start = time.time()
    result = translator.translate(text, 'en', 'hi')
    latency = (time.time() - start) * 1000
    
    assert result is not None
    assert latency < 200  # Should be under 200ms

def test_batch_translation(translator):
    """Test batch translation performance"""
    texts = [
        "Hello",
        "Good morning",
        "How are you?",
        "Thank you",
        "Goodbye"
    ]
    
    results = []
    for text in texts:
        result = translator.translate(text, 'en', 'hi')
        results.append(result)
    
    assert len(results) == len(texts)
    assert all(r is not None for r in results)

def test_empty_text_handling(translator):
    """Test handling of empty text"""
    result = translator.translate("", 'en', 'hi')
    # Should handle gracefully
    assert result is not None

def test_long_text_handling(translator):
    """Test handling of long text"""
    text = "This is a very long sentence. " * 20
    result = translator.translate(text, 'en', 'hi')
    
    assert result is not None
    assert len(result) > 0
```

**Run tests:**
```bash
cd translation-service
pytest tests/ -v
pytest tests/ --cov=src --cov-report=html
```

---

### React Native Tests

**File: `MoodMelodies/__tests__/services/TranslationService.test.ts`**

```typescript
import { TranslationService } from '../../src/services/TranslationService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    service = new TranslationService({
      apiUrl: 'http://localhost:7777',
    });

    mockedAxios.create.mockReturnValue(mockedAxios as any);
  });

  test('should translate text successfully', async () => {
    const mockResponse = {
      data: {
        translated_text: 'नमस्ते',
        source_lang: 'en',
        target_lang: 'hi',
        cached: false,
        latency_ms: 50,
      },
    };

    mockedAxios.post.mockResolvedValue(mockResponse);

    const result = await service.translate('Hello', 'en', 'hi');

    expect(result).toBe('नमस्ते');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/v1/translate',
      {
        text: 'Hello',
        source_lang: 'en',
        target_lang: 'hi',
      }
    );
  });

  test('should use local cache for duplicate requests', async () => {
    const mockResponse = {
      data: {
        translated_text: 'नमस्ते',
        source_lang: 'en',
        target_lang: 'hi',
        cached: false,
        latency_ms: 50,
      },
    };

    mockedAxios.post.mockResolvedValue(mockResponse);

    // First call
    await service.translate('Hello', 'en', 'hi');
    
    // Second call (should use cache)
    const result = await service.translate('Hello', 'en', 'hi');

    expect(result).toBe('नमस्ते');
    expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Only once
  });

  test('should handle API errors gracefully', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        data: { error: 'Translation failed' },
      },
    });

    await expect(
      service.translate('Hello', 'en', 'hi')
    ).rejects.toThrow('Translation failed');
  });
});
```

**Run tests:**
```bash
cd MoodMelodies
npm test
npm test -- --coverage
```

---

## 🔄 Integration Tests

### End-to-End Call Flow Test

**File: `signaling-server/__tests__/integration/callFlow.test.ts`**

```typescript
import io, { Socket } from 'socket.io-client';
import { Server } from 'http';

describe('End-to-End Call Flow', () => {
  let server: Server;
  let client1: Socket;
  let client2: Socket;

  beforeAll((done) => {
    // Start server
    server = require('../../src/server').httpServer;
    server.listen(3001, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    client1 = io('http://localhost:3001');
    client2 = io('http://localhost:3001');
  });

  afterEach(() => {
    client1.disconnect();
    client2.disconnect();
  });

  test('complete call setup flow', (done) => {
    let roomId: string;

    // Client 1 creates room
    client1.emit('join_room', {
      userId: 'user1',
      language: 'en',
    });

    client1.on('room_joined', (data) => {
      roomId = data.roomId;
      expect(data.roomId).toBeDefined();

      // Client 2 joins same room
      client2.emit('join_room', {
        userId: 'user2',
        roomId: roomId,
        language: 'hi',
      });
    });

    client2.on('room_joined', (data) => {
      expect(data.roomId).toBe(roomId);
      expect(data.status).toBe('active');
      done();
    });

    client1.on('user_joined', (data) => {
      expect(data.user.userId).toBe('user2');
    });
  }, 10000);

  test('WebRTC signaling exchange', (done) => {
    let roomId: string;

    // Setup room
    client1.emit('join_room', { userId: 'user1', language: 'en' });

    client1.on('room_joined', (data) => {
      roomId = data.roomId;
      client2.emit('join_room', { userId: 'user2', roomId, language: 'hi' });
    });

    client2.on('room_joined', () => {
      // Send offer
      client1.emit('offer', {
        roomId,
        offer: { type: 'offer', sdp: 'mock-sdp' },
      });
    });

    client2.on('offer', (data) => {
      expect(data.offer).toBeDefined();
      expect(data.offer.sdp).toBe('mock-sdp');

      // Send answer
      client2.emit('answer', {
        roomId,
        answer: { type: 'answer', sdp: 'mock-answer-sdp' },
      });
    });

    client1.on('answer', (data) => {
      expect(data.answer).toBeDefined();
      expect(data.answer.sdp).toBe('mock-answer-sdp');
      done();
    });
  }, 10000);
});
```

---

## ⚡ Performance Tests

### Translation Latency Test

**File: `scripts/benchmark-translation.py`**

```python
import time
import requests
import statistics

API_URL = "http://localhost:7777/api/v1/translate"

test_sentences = [
    "Hello, how are you?",
    "What is your name?",
    "Thank you very much.",
    "I am learning Hindi.",
    "This is a beautiful day."
]

def measure_latency(text, source, target, iterations=10):
    latencies = []
    
    for _ in range(iterations):
        start = time.time()
        response = requests.post(API_URL, json={
            "text": text,
            "source_lang": source,
            "target_lang": target
        })
        latency = (time.time() - start) * 1000
        latencies.append(latency)
        
        assert response.status_code == 200
    
    return {
        'min': min(latencies),
        'max': max(latencies),
        'mean': statistics.mean(latencies),
        'p50': statistics.median(latencies),
        'p95': sorted(latencies)[int(len(latencies) * 0.95)],
        'p99': sorted(latencies)[int(len(latencies) * 0.99)]
    }

def run_benchmark():
    print("Translation Latency Benchmark")
    print("=" * 50)
    
    for sentence in test_sentences:
        print(f"\nTesting: '{sentence}'")
        stats = measure_latency(sentence, 'en', 'hi', iterations=20)
        
        print(f"  Min:  {stats['min']:.2f}ms")
        print(f"  Mean: {stats['mean']:.2f}ms")
        print(f"  P50:  {stats['p50']:.2f}ms")
        print(f"  P95:  {stats['p95']:.2f}ms")
        print(f"  P99:  {stats['p99']:.2f}ms")
        print(f"  Max:  {stats['max']:.2f}ms")
        
        assert stats['p95'] < 200, f"P95 latency too high: {stats['p95']:.2f}ms"
    
    print("\n✅ All latency tests passed!")

if __name__ == '__main__':
    run_benchmark()
```

**Run:**
```bash
python scripts/benchmark-translation.py
```

---

### Load Testing (Concurrent Calls)

**File: `scripts/load-test.sh`**

```bash
#!/bin/bash

# Load test with Apache Bench
echo "Load Testing Signaling Server"
echo "=============================="

# Test health endpoint
echo -e "\n1. Health Check (1000 requests, 10 concurrent)"
ab -n 1000 -c 10 http://localhost:3000/health

# Test translation endpoint
echo -e "\n2. Translation API (500 requests, 20 concurrent)"
ab -n 500 -c 20 -p translation-payload.json -T application/json \
   http://localhost:7777/api/v1/translate

# WebSocket connection test
echo -e "\n3. WebSocket Connections (100 concurrent)"
node scripts/websocket-load-test.js

echo -e "\n✅ Load test complete!"
```

**File: `scripts/websocket-load-test.js`**

```javascript
const io = require('socket.io-client');

const NUM_CLIENTS = 100;
const SIGNALING_URL = 'http://localhost:3000';

async function loadTest() {
  console.log(`Creating ${NUM_CLIENTS} WebSocket connections...`);
  
  const clients = [];
  const startTime = Date.now();
  
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const client = io(SIGNALING_URL);
    clients.push(client);
    
    client.on('connect', () => {
      console.log(`Client ${i + 1} connected`);
    });
  }
  
  // Wait for all connections
  await new Promise(resolve => setTimeout(resolve, 7777));
  
  const connectedCount = clients.filter(c => c.connected).length;
  console.log(`\n✅ ${connectedCount}/${NUM_CLIENTS} clients connected`);
  console.log(`Time taken: ${Date.now() - startTime}ms`);
  
  // Cleanup
  clients.forEach(c => c.disconnect());
}

loadTest().catch(console.error);
```

---

## 🌐 Network Tests

### Packet Loss Simulation

**File: `scripts/network-test.sh`**

```bash
#!/bin/bash

echo "Network Resilience Testing"
echo "=========================="

# Simulate packet loss using tc (Traffic Control)
sudo tc qdisc add dev eth0 root netem loss 1%
echo "✓ Added 1% packet loss"

# Run tests
npm test

# Increase packet loss
sudo tc qdisc change dev eth0 root netem loss 5%
echo "✓ Increased to 5% packet loss"

npm test

# Restore normal network
sudo tc qdisc del dev eth0 root netem
echo "✓ Network restored"
```

### Bandwidth Throttling

```bash
# Throttle to 1Mbps
sudo tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms

# Run call test
node scripts/call-quality-test.js

# Remove throttling
sudo tc qdisc del dev eth0 root
```

---

## 📊 Test Reports

### Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Signaling Server | > 80% |
| Translation Service | > 85% |
| React Native Services | > 75% |
| Integration Tests | 100% critical paths |

### Generate Reports

```bash
# Signaling Server
cd signaling-server
npm run test:coverage
open coverage/index.html

# Translation Service
cd translation-service
pytest --cov=src --cov-report=html
open htmlcov/index.html

# React Native
cd MoodMelodies
npm test -- --coverage
open coverage/lcov-report/index.html
```

---

## 🔍 Manual Testing Checklist

### Pre-Release Testing

- [ ] Test call setup on same network
- [ ] Test call setup across different networks
- [ ] Test call with NAT traversal (TURN server)
- [ ] Test language switching during call
- [ ] Test microphone muting/unmuting
- [ ] Test network disconnection and reconnection
- [ ] Test translation accuracy with various phrases
- [ ] Test audio quality and latency
- [ ] Test battery usage (1-hour call)
- [ ] Test memory usage over time
- [ ] Test with poor network conditions
- [ ] Test permissions handling (deny/allow)
- [ ] Test background/foreground transitions
- [ ] Test with multiple call sessions

### Device Testing

**Android:**
- [ ] Samsung Galaxy S21 (Android 13)
- [ ] Google Pixel 6 (Android 14)
- [ ] OnePlus 9 (Android 12)

**iOS:**
- [ ] iPhone 13 (iOS 17)
- [ ] iPhone 12 (iOS 16)
- [ ] iPhone SE (iOS 15)

---

## 🚨 Error Scenarios

### Test Error Handling

1. **Network Failure**
   - Disconnect WiFi during call
   - Switch networks (WiFi → 4G)
   - Airplane mode toggle

2. **Service Failure**
   - Translation API down
   - Signaling server restart
   - Redis connection loss

3. **Resource Constraints**
   - Low memory scenarios
   - Low battery mode
   - CPU throttling

4. **Edge Cases**
   - Very long sentences
   - Special characters
   - Mixed language text
   - Rapid language switching
   - Multiple simultaneous calls

---

## 📈 Performance Benchmarks

### Target Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| End-to-end latency | < 500ms | ___ms |
| Translation latency | < 100ms | ___ms |
| STT latency | < 150ms | ___ms |
| TTS latency | < 100ms | ___ms |
| WebRTC setup time | < 3s | ___s |
| Memory usage | < 150MB | ___MB |
| Battery drain | < 5%/hour | ___%/hour |

---

## ✅ Continuous Integration

### GitHub Actions Workflow

**File: `.github/workflows/test.yml`**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  signaling-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd signaling-server && npm install
      - run: cd signaling-server && npm test

  translation-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: 3.11
      - run: cd translation-service && pip install -r requirements.txt
      - run: cd translation-service && pytest

  mobile-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd MoodMelodies && npm install
      - run: cd MoodMelodies && npm test
```

---

This comprehensive testing strategy ensures Mood Melodies is production-ready with high reliability and performance.



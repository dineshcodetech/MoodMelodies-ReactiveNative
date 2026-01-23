# MoodMelodies V2 React Native App

This is the V2 version of the MoodMelodies React Native app, connected to the V2 Flask backend.

## Changes from V1

- ✅ Connected to V2 Flask backend (port 7777)
- ✅ User registration and login with password authentication
- ✅ JWT token-based authentication
- ✅ User preferred language support
- ✅ Real-time translation using Gemini API via V2 backend
- ✅ WebSocket support for live call translation

## Setup

### 1. Install Dependencies

```bash
cd v2/MoodMelodies
npm install
```

### 2. Configure Backend URL

Update `src/constants/config.ts` if your backend is running on a different URL or port.

### 3. Run the App

```bash
# iOS
npm run ios

# Android
npm run android
```

## Features

### Authentication
- User registration with phone number and password
- User login with phone number and password
- JWT token-based session management
- User profile with preferred language

### Translation
- Real-time translation during calls
- Automatic language detection
- Translation to user's preferred language
- Support for multiple languages (Telugu, Hindi, English, and more)

### Calling
- WebRTC-based voice calls
- Real-time translation during calls
- Multi-user call support

## Backend Connection

The app connects to the V2 Flask backend at:
- Development: `http://localhost:7777` (iOS) or `http://10.0.2.2:7777` (Android)
- Production: Configure in `src/constants/config.ts`

## API Endpoints Used

- `POST /api/v2/auth/register` - User registration
- `POST /api/v2/auth/login` - User login
- `GET /api/v2/users/search` - Search users
- `POST /api/v2/translation/translate` - Translate text
- WebSocket events for real-time communication

## Notes

- Ensure the V2 backend is running before starting the app
- JWT tokens are stored in AsyncStorage
- User preferred language is used for automatic translation during calls

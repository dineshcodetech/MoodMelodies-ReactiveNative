# Quick Start Guide - MoodMelodies V2 Mobile App

## Prerequisites

- Node.js 18+ installed
- React Native development environment set up
- iOS: Xcode and CocoaPods
- Android: Android Studio and SDK
- V2 Backend running (see `../MoodMelodies-BE-Flask/V2/QUICKSTART.md`)

## Setup (5 minutes)

```bash
# 1. Install dependencies
make setup

# 2. Check backend is running
make check-backend

# 3. Start Metro bundler (Terminal 1)
make start

# 4. Run the app (Terminal 2)
make ios      # For iOS
# OR
make android  # For Android
```

## First Run

1. **Register a new account:**
   - Enter phone number (e.g., `+1234567890`)
   - Enter password (min 6 characters)
   - Enter name (optional)
   - Select preferred language (e.g., `te` for Telugu)

2. **Login:**
   - Enter phone number and password
   - You'll be redirected to the home screen

3. **Make a call:**
   - Search for another user by phone number
   - Start a call
   - Speak and see real-time translation

## Testing Translation

1. **User A (Telugu):**
   - Register with preferred language: `te`
   - Start a call with User B

2. **User B (Hindi):**
   - Register with preferred language: `hi`
   - Accept the call

3. **Test:**
   - User A speaks in Telugu → User B hears Hindi
   - User B speaks in Hindi → User A hears Telugu

## Troubleshooting

### Metro Bundler Issues
```bash
make reset    # Clear Metro cache
make start    # Restart Metro
```

### iOS Build Issues
```bash
cd MoodMelodies/ios
pod install
cd ../..
make ios
```

### Android Build Issues
```bash
# Check ADB reverse
adb reverse tcp:8081 tcp:8081
adb reverse tcp:7777 tcp:7777

make android
```

### Backend Connection Issues
```bash
# Check backend is running
curl http://localhost:7777/api/v2/health

# If not running, start it:
cd ../MoodMelodies-BE-Flask/V2
make run
```

### Authentication Issues
- If login fails, check backend logs
- Ensure phone number format is correct (include country code)
- Password must be at least 6 characters

## Development

### Hot Reload
- Shake device → Reload (or Cmd+R on iOS, R+R on Android)
- Metro bundler auto-reloads on code changes

### Debugging
- React Native Debugger: `npm install -g react-native-debugger`
- Chrome DevTools: Shake device → Debug JS Remotely

### Logs
```bash
# iOS
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "MoodMelodies"'

# Android
adb logcat | grep ReactNativeJS
```

## Available Commands

```bash
make help          # Show all commands
make setup         # Complete setup
make install       # Install dependencies
make ios           # Run on iOS
make android       # Run on Android
make start         # Start Metro bundler
make clean         # Clean build artifacts
make reset         # Reset Metro cache
make health        # Check app and backend health
```

## Configuration

Edit `MoodMelodies/src/constants/config.ts` to change:
- Backend URL (default: `http://localhost:7777`)
- API version (default: `v2`)
- Supported languages

## Next Steps

- Read `README.md` for detailed documentation
- Check backend documentation: `../MoodMelodies-BE-Flask/V2/README.md`
- See implementation details: `../MoodMelodies-BE-Flask/V2/IMPLEMENTATION_SUMMARY.md`

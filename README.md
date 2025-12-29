# MoodMelodies Mobile App

## Prerequisites
- Node.js
- React Native CLI
- Python 3.9+ (for Backend)
- Xcode (for iOS)
- Android Studio (for Android)

## Project Structure
- `MoodMelodies/`: React Native Application
- Backend is located in `../MoodMelodies-BE-Flask/poc/server`

## Installation

### Backend (Signaling Server)
1. Navigate to `MoodMelodies-BE-Flask/poc/server`
2. Install dependencies: `pip install -r requirements.txt`
3. Run Server: 
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

### Mobile App
1. Navigate to `MoodMelodies`
2. Install Node dependencies: `npm install`
3. Install iOS Pods:
   ```bash
   cd ios
   pod install
   cd ..
   ```

## Running the App

### Android
1. Start Android Emulator
2. Run `npx react-native run-android`
3. Note: The app is configured to connect to `10.0.2.2:8000` for the backend when running on Android Emulator.

### iOS
1. Start iOS Simulator
2. Run `npx react-native run-ios`
3. Note: The app is configured to connect to `localhost:8000` for the backend when running on iOS Simulator.

## Usage
1. Open the app on two devices/simulators.
2. Enter the same Room ID (default: "room1").
3. Click "Join Room".
4. Once both joined, one user clicks "Start Call".
5. Grant Camera and Microphone permissions when prompted.

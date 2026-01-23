/**
 * Mood Melodies - Real-time Voice Translation Calling App
 * 
 * Main entry point that sets up navigation and global context
 */

import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CallScreen } from './src/screens/CallScreen';
import { ContactsScreen } from './src/screens/ContactsScreen';
import { API_CONFIG } from './src/constants/config';
import { User } from './src/services/AuthService';

interface CallConfig {
  userId: string;
  roomId?: string;
  sourceLanguage: string;
  targetLanguage: string;
}

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeScreen, setActiveScreen] = useState<'home' | 'contacts' | 'call'>('home');
  const [callConfig, setCallConfig] = useState<CallConfig | null>(null);

  if (isLoading) {
    return null; // Or a splash screen
  }

  if (!user) {
    return <LoginScreen />;
  }

  /**
   * Handle starting a call
   */
  const handleStartCall = (config: CallConfig) => {
    setCallConfig(config);
    setActiveScreen('call');
  };

  /**
   * Handle ending a call
   */
  const handleEndCall = () => {
    setCallConfig(null);
    setActiveScreen('home');
  };

  /**
   * Start a direct call to a specific user
   */
  const handleDirectCall = (targetUser: User) => {
    // Use current user's preferred language as source, target user's preferred language as target
    const sourceLang = user.preferredLanguage || user.preferred_language || 'en';
    const targetLang = targetUser.preferredLanguage || targetUser.preferred_language || 'en';
    
    setCallConfig({
      userId: user.id,
      roomId: undefined, // Signaling will handle finding/creating a room
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    });
    setActiveScreen('call');
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      {activeScreen === 'call' && callConfig ? (
        <CallScreen
          userId={callConfig.userId}
          roomId={callConfig.roomId}
          sourceLanguage={callConfig.sourceLanguage}
          targetLanguage={callConfig.targetLanguage}
          signalingUrl={API_CONFIG.SIGNALING_URL}
          translationUrl={API_CONFIG.TRANSLATION_URL}
          onEndCall={handleEndCall}
        />
      ) : activeScreen === 'contacts' ? (
        <ContactsScreen onStartCall={handleDirectCall} />
      ) : (
        <HomeScreen
          onStartCall={handleStartCall}
          onOpenContacts={() => setActiveScreen('contacts')}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;

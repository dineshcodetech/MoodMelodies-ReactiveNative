import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS, LANGUAGES } from '../constants/config';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useAuth } from '../contexts/AuthContext';

interface HomeScreenProps {
  onStartCall: (config: {
    userId: string;
    roomId?: string;
    sourceLanguage: string;
    targetLanguage: string;
  }) => void;
  onOpenContacts: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartCall, onOpenContacts }) => {
  const { user, logout } = useAuth();
  const [roomId, setRoomId] = useState('');
  // Use user's preferred language as default source language
  const [sourceLanguage, setSourceLanguage] = useState(
    user?.preferredLanguage || user?.preferred_language || 'en'
  );
  const [targetLanguage, setTargetLanguage] = useState('hi');
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  /**
   * Request microphone permissions
   */
  const requestPermissions = async (): Promise<boolean> => {
    try {
      setIsRequestingPermissions(true);

      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.MICROPHONE
          : PERMISSIONS.ANDROID.RECORD_AUDIO;

      const result = await request(permission);

      if (result === RESULTS.GRANTED) {
        return true;
      } else {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required to make calls',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  /**
   * Start matchmaking
   */
  const handleStartNewCall = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    onStartCall({
      userId: user?.id || 'anonymous',
      sourceLanguage,
      targetLanguage,
    });
  };

  /**
   * Join existing room
   */
  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      Alert.alert('Error', 'Please enter a room ID');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    onStartCall({
      userId: user?.id || 'anonymous',
      roomId: roomId.trim(),
      sourceLanguage,
      targetLanguage,
    });
  };

  /**
   * Swap languages
   */
  const handleSwapLanguages = () => {
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'User'}</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>🎵 Mood Melodies</Text>
        <Text style={styles.subtitle}>
          AI-Powered Real-time Voice Translation
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard} onPress={onOpenContacts}>
              <Text style={styles.actionEmoji}>👥</Text>
              <Text style={styles.actionTitle}>Contacts</Text>
              <Text style={styles.actionDesc}>Find users to call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleStartNewCall}>
              <Text style={styles.actionEmoji}>🌐</Text>
              <Text style={styles.actionTitle}>Global</Text>
              <Text style={styles.actionDesc}>Match with anyone</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Configuration</Text>
          <View style={styles.languageContainer}>
            <View style={styles.langColumn}>
              <Text style={styles.langLabel}>You speak</Text>
              <View style={styles.langPicker}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langOption,
                      sourceLanguage === lang.code && styles.langOptionSelected,
                    ]}
                    onPress={() => setSourceLanguage(lang.code)}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langName, sourceLanguage === lang.code && styles.langNameSelected]}>
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.swapBtn} onPress={handleSwapLanguages}>
              <Text style={styles.swapIcon}>⇄</Text>
            </TouchableOpacity>

            <View style={styles.langColumn}>
              <Text style={styles.langLabel}>They speak</Text>
              <View style={styles.langPicker}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langOption,
                      targetLanguage === lang.code && styles.langOptionSelected,
                    ]}
                    onPress={() => setTargetLanguage(lang.code)}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langName, targetLanguage === lang.code && styles.langNameSelected]}>
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Join by ID */}
        <View style={styles.joinSection}>
          <Text style={styles.sectionTitle}>Join with Room ID</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Room Code..."
              value={roomId}
              onChangeText={setRoomId}
              autoCapitalize="none"
              placeholderTextColor="#ADB5BD"
            />
            <TouchableOpacity style={styles.joinBtn} onPress={handleJoinRoom}>
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: '#868E96',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  langColumn: {
    flex: 1,
  },
  langLabel: {
    fontSize: 12,
    color: '#868E96',
    textAlign: 'center',
    marginBottom: 12,
  },
  langPicker: {
    gap: 8,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  langOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0EBFF',
  },
  langFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  langName: {
    fontSize: 13,
    color: '#495057',
  },
  langNameSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  swapBtn: {
    padding: 12,
  },
  swapIcon: {
    fontSize: 24,
    color: COLORS.primary,
  },
  joinSection: {
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 55,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#212529',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  joinBtn: {
    width: 80,
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnText: {
    fontWeight: 'bold',
    color: '#212529',
  },
});

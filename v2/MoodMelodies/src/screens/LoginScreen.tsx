import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/config';

export const LoginScreen: React.FC = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [preferredLanguage, setPreferredLanguage] = useState('en');
    const [isRegistering, setIsRegistering] = useState(false);
    const { login, register, isLoading } = useAuth();

    const handleSubmit = async () => {
        if (!phoneNumber) {
            Alert.alert('Error', 'Please enter your phone number');
            return;
        }

        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        if (isRegistering && password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        try {
            if (isRegistering) {
                await register(phoneNumber, password, name || undefined, email || undefined, preferredLanguage);
            } else {
                await login(phoneNumber, password);
            }
        } catch (error: any) {
            Alert.alert(
                isRegistering ? 'Registration Failed' : 'Login Failed',
                error.message || 'Unable to proceed. Please check your connection.'
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <Text style={styles.logo}>🎵</Text>
                    <Text style={styles.title}>Mood Melodies</Text>
                    <Text style={styles.subtitle}>Connect with high-quality real-time translation calls</Text>

                    <View style={styles.form}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+91 9876543210"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />

                        {isRegistering && (
                            <>
                                <Text style={styles.label}>Full Name (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    value={name}
                                    onChangeText={setName}
                                />

                                <Text style={styles.label}>Email (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="john@example.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />

                                <Text style={styles.label}>Preferred Language</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="en (English), te (Telugu), hi (Hindi)"
                                    value={preferredLanguage}
                                    onChangeText={setPreferredLanguage}
                                />
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {isRegistering ? 'Register' : 'Login'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.switchButton}
                            onPress={() => setIsRegistering(!isRegistering)}
                        >
                            <Text style={styles.switchText}>
                                {isRegistering
                                    ? 'Already have an account? Login'
                                    : "Don't have an account? Register"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        fontSize: 80,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        width: '100%',
        height: 55,
        backgroundColor: '#F5F5F7',
        borderRadius: 12,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E1E1E1',
    },
    button: {
        width: '100%',
        height: 55,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    switchText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});

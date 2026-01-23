import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/config';

export interface User {
    id: string;
    phone_number: string;
    phoneNumber?: string; // For backward compatibility
    name?: string;
    email?: string;
    avatar?: string;
    status: string;
    preferred_language?: string;
    preferredLanguage?: string; // For backward compatibility
    created_at?: string;
    updated_at?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

const API_URL = API_CONFIG.BASE_URL.replace(/\/$/, '') + '/api/' + API_CONFIG.API_VERSION;

export class AuthService {
    private static instance: AuthService;

    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public async register(phoneNumber: string, password: string, name?: string, email?: string, preferredLanguage?: string): Promise<AuthResponse> {
        try {
            const response = await axios.post(`${API_URL}/auth/register`, {
                phone_number: phoneNumber,
                password,
                name,
                email,
                preferred_language: preferredLanguage || 'en',
            });

            const { token, user } = response.data;
            // Normalize user object for backward compatibility
            const normalizedUser = this.normalizeUser(user);
            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('user_data', JSON.stringify(normalizedUser));

            return { token, user: normalizedUser };
        } catch (error: any) {
            console.error('[AuthService] Registration failed:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
            throw new Error(errorMessage);
        }
    }

    public async login(phoneNumber: string, password: string): Promise<AuthResponse> {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                phone_number: phoneNumber,
                password,
            });

            const { token, user } = response.data;
            // Normalize user object for backward compatibility
            const normalizedUser = this.normalizeUser(user);
            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('user_data', JSON.stringify(normalizedUser));

            return { token, user: normalizedUser };
        } catch (error: any) {
            console.error('[AuthService] Login failed:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Login failed';
            throw new Error(errorMessage);
        }
    }

    private normalizeUser(user: any): User {
        // Normalize user object to match expected interface
        return {
            ...user,
            phoneNumber: user.phone_number || user.phoneNumber,
            preferredLanguage: user.preferred_language || user.preferredLanguage || 'en',
        };
    }

    public async searchUser(phoneNumber: string): Promise<User> {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const response = await axios.get(`${API_URL}/users/search`, {
                params: { phone_number: phoneNumber },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return this.normalizeUser(response.data);
        } catch (error: any) {
            console.error('[AuthService] Search user failed:', error);
            const errorMessage = error.response?.data?.error || error.message || 'User search failed';
            throw new Error(errorMessage);
        }
    }

    public async logout(): Promise<void> {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
    }

    public async getCurrentUser(): Promise<User | null> {
        const userData = await AsyncStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }

    public async getToken(): Promise<string | null> {
        return await AsyncStorage.getItem('auth_token');
    }
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService, User } from '../services/AuthService';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    register: (phoneNumber: string, password: string, name?: string, email?: string, preferredLanguage?: string) => Promise<void>;
    login: (phoneNumber: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const authService = AuthService.getInstance();

    useEffect(() => {
        const loadStorageData = async () => {
            try {
                const storedUser = await authService.getCurrentUser();
                const storedToken = await authService.getToken();

                if (storedUser && storedToken) {
                    setUser(storedUser);
                    setToken(storedToken);
                }
            } catch (error) {
                console.error('[AuthContext] Error loading storage data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadStorageData();
    }, []);

    const register = async (phoneNumber: string, password: string, name?: string, email?: string, preferredLanguage?: string) => {
        setIsLoading(true);
        try {
            const { user, token } = await authService.register(phoneNumber, password, name, email, preferredLanguage);
            setUser(user);
            setToken(token);
        } catch (error) {
            console.error('[AuthContext] Registration failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phoneNumber: string, password: string) => {
        setIsLoading(true);
        try {
            const { user, token } = await authService.login(phoneNumber, password);
            setUser(user);
            setToken(token);
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

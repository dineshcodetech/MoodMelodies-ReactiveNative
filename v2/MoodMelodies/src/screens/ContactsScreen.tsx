import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    Image,
} from 'react-native';
import { AuthService, User } from '../services/AuthService';
import { COLORS } from '../constants/config';

interface ContactsScreenProps {
    onStartCall: (targetUser: User) => void;
}

export const ContactsScreen: React.FC<ContactsScreenProps> = ({ onStartCall }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const authService = AuthService.getInstance();

    const handleSearch = async () => {
        if (!searchQuery) return;

        setIsLoading(true);
        setError(null);
        try {
            const user = await authService.searchUser(searchQuery);
            setResults([user]);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError('User not found');
            } else {
                setError('Search failed. Try again.');
            }
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: User }) => (
        <View style={styles.contactItem}>
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{item.name?.[0] || 'U'}</Text>
                <View style={[styles.statusIndicator, { backgroundColor: item.status === 'online' ? '#4CAF50' : '#9E9E9E' }]} />
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
            </View>
            <TouchableOpacity
                style={styles.callButton}
                onPress={() => onStartCall(item)}
            >
                <Text style={styles.callButtonText}>📞 Call</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Find Someone</Text>
                <Text style={styles.headerSubtitle}>Search by mobile number to start a translated call</Text>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by phone number..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        keyboardType="phone-pad"
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>🔍</Text>}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                {error ? (
                    <View style={styles.messageContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : results.length > 0 ? (
                    <FlatList
                        data={results}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                    />
                ) : (
                    <View style={styles.messageContainer}>
                        <Text style={styles.placeholderText}>Enter a mobile number above to find users</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        padding: 24,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    searchSection: {
        padding: 16,
        backgroundColor: '#fff',
    },
    searchBar: {
        flexDirection: 'row',
        backgroundColor: '#F1F3F5',
        borderRadius: 16,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#212529',
    },
    searchButton: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonText: {
        fontSize: 18,
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: 16,
    },
    contactItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarContainer: {
        width: 55,
        height: 55,
        borderRadius: 28,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    statusIndicator: {
        width: 14,
        height: 14,
        borderRadius: 7,
        position: 'absolute',
        bottom: 2,
        right: 2,
        borderWidth: 2,
        borderColor: '#fff',
    },
    contactInfo: {
        flex: 1,
        marginLeft: 16,
    },
    contactName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#212529',
    },
    contactPhone: {
        fontSize: 14,
        color: '#868E96',
        marginTop: 2,
    },
    callButton: {
        backgroundColor: '#E7F5FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    callButtonText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    messageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    placeholderText: {
        textAlign: 'center',
        color: '#ADB5BD',
        fontSize: 16,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 16,
    },
});

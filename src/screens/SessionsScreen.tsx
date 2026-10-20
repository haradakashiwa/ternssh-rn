import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ActionSheetIOS,
  useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useServers } from '../context/ServersContext';
import type { MainTabScreenProps } from '../navigation/types';
import type { TerminalSession } from '../types';

function getStatusColor(status: TerminalSession['status'], isDark: boolean): string {
  switch (status) {
    case 'open': return isDark ? '#30D158' : '#34C759';
    case 'connecting': return isDark ? '#FFD60A' : '#FF9500';
    case 'error': return isDark ? '#FF453A' : '#FF3B30';
    case 'closed': return isDark ? '#636366' : '#8E8E93';
    default: return isDark ? '#636366' : '#8E8E93';
  }
}

function getStatusText(status: TerminalSession['status']): string {
  switch (status) {
    case 'open': return 'Connected';
    case 'connecting': return 'Connecting...';
    case 'error': return 'Error';
    case 'closed': return 'Closed';
    default: return 'Unknown';
  }
}

export function SessionsScreen({ navigation }: MainTabScreenProps<'Sessions'>) {
  const { sessions, servers, removeSession } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSessionPress = useCallback((session: TerminalSession) => {
    const server = servers.find(s => s.id === session.serverId);
    if (!server) {
      Alert.alert('Error', 'Server not found');
      return;
    }
    
    const canRemove = session.status === 'closed' || session.status === 'error';

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const options = canRemove 
        ? ['Cancel', 'View Details', 'Remove']
        : ['Cancel', 'View Details'];
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: canRemove ? 2 : undefined,
          cancelButtonIndex: 0,
          title: server.name,
          message: `Status: ${getStatusText(session.status)}\nSession ID: ${session.sessionId.substring(0, 8)}...`,
        },
        (buttonIndex) => {
          if (buttonIndex === 2 && canRemove) {
            removeSession(session.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      );
    } else {
      Alert.alert(
        server.name,
        `Status: ${getStatusText(session.status)}\nSession ID: ${session.sessionId}`,
        [
          { text: 'OK' },
          canRemove ? { text: 'Remove', style: 'destructive', onPress: () => removeSession(session.id) } : null,
        ].filter(Boolean) as { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[]
      );
    }
  }, [servers, removeSession]);

  const renderSession = ({ item, index }: { item: TerminalSession; index: number }) => {
    const server = servers.find(s => s.id === item.serverId);
    const isFirst = index === 0;
    const isLast = index === sessions.length - 1;
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.sessionCard,
          isDark && styles.sessionCardDark,
          Platform.OS === 'ios' && styles.sessionCardIOS,
          Platform.OS === 'ios' && isFirst && styles.sessionCardFirst,
          Platform.OS === 'ios' && isLast && styles.sessionCardLast,
          Platform.OS === 'android' && styles.sessionCardAndroid,
          pressed && Platform.OS === 'ios' && styles.pressed,
        ]}
        android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
        onPress={() => handleSessionPress(item)}
      >
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: getStatusColor(item.status, isDark) }
          ]} />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={[styles.serverName, isDark && styles.textDark]}>
            {server?.name ?? 'Unknown Server'}
          </Text>
          <Text style={[styles.sessionStatus, isDark && styles.textSecondaryDark]}>
            {getStatusText(item.status)}
          </Text>
          <Text style={[styles.sessionTime, isDark && styles.textTertiaryDark]}>
            Started: {new Date(item.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={[
          sessions.length === 0 ? styles.emptyContainer : styles.listContent,
          Platform.OS === 'ios' && styles.listContentIOS,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📟</Text>
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No Active Sessions</Text>
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
              Connect to an SSH host to start a terminal session. Sessions will appear here.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.goButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate('Servers')}
            >
              <Text style={styles.goButtonText}>Go to Servers</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.select({ ios: '#F2F2F7', android: '#FAFAFA' }),
  },
  containerDark: {
    backgroundColor: Platform.select({ ios: '#000000', android: '#121212' }),
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentIOS: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  sessionCardDark: {
    backgroundColor: Platform.select({ ios: '#1C1C1E', android: '#1E1E1E' }),
  },
  sessionCardIOS: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  sessionCardFirst: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  sessionCardLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  sessionCardAndroid: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  statusIndicator: {
    marginRight: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  sessionStatus: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 12,
    color: '#AEAEB2',
  },
  chevron: {
    fontSize: 22,
    color: '#C7C7CC',
    marginLeft: 8,
  },
  chevronDark: {
    color: '#48484A',
  },
  pressed: {
    backgroundColor: '#E5E5EA',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#8E8E93',
  },
  textTertiaryDark: {
    color: '#636366',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  goButton: {
    backgroundColor: Platform.select({ ios: '#007AFF', android: '#6200EE' }),
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Platform.select({ ios: 10, android: 8 }),
  },
  buttonPressed: {
    opacity: 0.8,
  },
  goButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

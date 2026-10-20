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

// iOS Native UI Components
import {
  Host,
  List,
  Section,
  Text as SwiftUIText,
  HStack,
  VStack,
  Spacer,
  ContentUnavailableView,
  Button,
} from '@expo/ui/swift-ui';
import {
  listStyle,
  padding,
  font,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';

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

  // iOS: Native SwiftUI List
  if (Platform.OS === 'ios') {
    if (sessions.length === 0) {
      return (
        <Host matchContents={false} style={styles.container}>
          <VStack modifiers={[padding({ all: 32 })]}>
            <ContentUnavailableView
              title="No Active Sessions"
              description="Connect to an SSH host to start a terminal session."
              systemImage="terminal"
            />
            <Button label="Go to Servers" onPress={() => navigation.navigate('Servers')} />
          </VStack>
        </Host>
      );
    }

    return (
      <Host matchContents={false} style={styles.container}>
        <List modifiers={[listStyle('insetGrouped')]}>
          <Section title="Sessions">
            {sessions.map((session) => {
              const server = servers.find(s => s.id === session.serverId);
              return (
                <Pressable key={session.id} onPress={() => handleSessionPress(session)}>
                  <HStack modifiers={[padding({ vertical: 8 })]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(session.status, isDark) }]} />
                    <VStack modifiers={[padding({ leading: 12 })]}>
                      <SwiftUIText modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}>
                        {server?.name ?? 'Unknown Server'}
                      </SwiftUIText>
                      <SwiftUIText modifiers={[font({ textStyle: 'caption' }), foregroundStyle('secondary')]}>
                        {getStatusText(session.status)}
                      </SwiftUIText>
                      <SwiftUIText modifiers={[font({ textStyle: 'caption2' }), foregroundStyle('tertiary')]}>
                        Started: {new Date(session.createdAt).toLocaleTimeString()}
                      </SwiftUIText>
                    </VStack>
                    <Spacer />
                  </HStack>
                </Pressable>
              );
            })}
          </Section>
        </List>
      </Host>
    );
  }

  // Android: Material Design
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📟</Text>
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No Active Sessions</Text>
          <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
            Connect to an SSH host to start a terminal session.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.goButton, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate('Servers')}
          >
            <Text style={styles.goButtonText}>Go to Servers</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: session }) => {
            const server = servers.find(s => s.id === session.serverId);
            return (
              <Pressable
                style={[styles.sessionCard, isDark && styles.sessionCardDark]}
                onPress={() => handleSessionPress(session)}
                android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(session.status, isDark) }]} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={[styles.serverName, isDark && styles.textDark]}>
                    {server?.name ?? 'Unknown Server'}
                  </Text>
                  <Text style={[styles.sessionStatus, isDark && styles.textSecondaryDark]}>
                    {getStatusText(session.status)}
                  </Text>
                  <Text style={[styles.sessionTime, isDark && styles.textTertiaryDark]}>
                    Started: {new Date(session.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.select({ ios: undefined, android: '#FAFAFA' }),
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  listContent: {
    padding: 16,
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
    backgroundColor: '#6200EE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  goButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
  },
  sessionCardDark: {
    backgroundColor: '#1E1E1E',
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
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#8E8E93',
  },
  textTertiaryDark: {
    color: '#636366',
  },
});

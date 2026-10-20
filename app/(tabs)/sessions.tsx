import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  useColorScheme,
  FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useServers } from '../../src/context/ServersContext';
import type { TerminalSession } from '../../src/types';

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
  ContextMenu,
} from '@expo/ui/swift-ui';
import {
  listStyle,
  padding,
  font,
  foregroundStyle,
  buttonStyle,
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

export default function SessionsScreen() {
  const router = useRouter();
  const { sessions, servers, removeSession } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSessionPress = useCallback((session: TerminalSession) => {
    const server = servers.find(s => s.id === session.serverId);
    if (!server) {
      Alert.alert('Error', 'Server not found');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const canRemove = session.status === 'closed' || session.status === 'error';
    
    if (canRemove) {
      Alert.alert(
        server.name,
        `Status: ${getStatusText(session.status)}\nSession ID: ${session.sessionId.substring(0, 8)}...`,
        [
          { text: 'OK' },
          { text: 'Remove', style: 'destructive', onPress: () => {
            removeSession(session.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }},
        ]
      );
    } else {
      Alert.alert(
        server.name,
        `Status: ${getStatusText(session.status)}\nSession ID: ${session.sessionId.substring(0, 8)}...`
      );
    }
  }, [servers, removeSession]);

  const handleRemoveSession = useCallback((session: TerminalSession) => {
    removeSession(session.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [removeSession]);

  const navigateToServers = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  // iOS: Native SwiftUI List
  if (Platform.OS === 'ios') {
    return (
      <>
        <Stack.Screen options={{ title: 'Sessions', headerLargeTitle: true }} />
        <Host matchContents={false} style={styles.container}>
          {sessions.length === 0 ? (
            <VStack modifiers={[padding({ all: 32 })]}>
              <ContentUnavailableView
                title="No Active Sessions"
                description="Connect to an SSH host to start a terminal session."
                systemImage="terminal"
              />
              <Button
                label="Go to Servers"
                onPress={navigateToServers}
                modifiers={[buttonStyle('glassProminent')]}
              />
            </VStack>
          ) : (
            <List modifiers={[listStyle('insetGrouped')]}>
              <Section title="Sessions">
                {sessions.map((session) => {
                  const server = servers.find(s => s.id === session.serverId);
                  const canRemove = session.status === 'closed' || session.status === 'error';
                  const serverName = server?.name ?? 'Unknown Server';
                  const statusText = getStatusText(session.status);
                  const timeText = `Started: ${new Date(session.createdAt).toLocaleTimeString()}`;
                  
                  return (
                    <ContextMenu key={session.id}>
                      <ContextMenu.Trigger>
                        <Pressable onPress={() => handleSessionPress(session)}>
                          <HStack modifiers={[padding({ vertical: 8 })]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(session.status, isDark) }]} />
                            <VStack modifiers={[padding({ leading: 12 })]}>
                              <SwiftUIText modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}>
                                {serverName}
                              </SwiftUIText>
                              <SwiftUIText modifiers={[font({ textStyle: 'caption' }), foregroundStyle('secondary')]}>
                                {statusText}
                              </SwiftUIText>
                              <SwiftUIText modifiers={[font({ textStyle: 'caption2' }), foregroundStyle('tertiary')]}>
                                {timeText}
                              </SwiftUIText>
                            </VStack>
                            <Spacer />
                          </HStack>
                        </Pressable>
                      </ContextMenu.Trigger>
                      <ContextMenu.Items>
                        <Button
                          label="View Details"
                          systemImage="info.circle"
                          onPress={() => handleSessionPress(session)}
                        />
                        {canRemove ? (
                          <Button
                            label="Remove"
                            systemImage="trash"
                            role="destructive"
                            onPress={() => handleRemoveSession(session)}
                          />
                        ) : null}
                      </ContextMenu.Items>
                    </ContextMenu>
                  );
                })}
              </Section>
            </List>
          )}
        </Host>
      </>
    );
  }

  // Android: Material Design with React Native components
  return (
    <>
      <Stack.Screen options={{ title: 'Sessions' }} />
      <View style={[styles.container, isDark && styles.containerDark]}>
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖥️</Text>
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No Active Sessions</Text>
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
              Connect to an SSH host to start a terminal session.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
              onPress={navigateToServers}
            >
              <Text style={styles.primaryButtonText}>Go to Servers</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: session }) => {
              const server = servers.find(s => s.id === session.serverId);
              const serverName = server?.name ?? 'Unknown Server';
              const statusText = getStatusText(session.status);
              const timeText = `Started: ${new Date(session.createdAt).toLocaleTimeString()}`;
              const canRemove = session.status === 'closed' || session.status === 'error';

              return (
                <Pressable
                  onPress={() => handleSessionPress(session)}
                  onLongPress={() => {
                    if (canRemove) {
                      Alert.alert(
                        serverName,
                        `Status: ${statusText}`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => handleRemoveSession(session) },
                        ]
                      );
                    }
                  }}
                  style={({ pressed }) => [
                    styles.sessionCard,
                    isDark && styles.sessionCardDark,
                    pressed && styles.sessionCardPressed,
                  ]}
                  android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
                >
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(session.status, isDark) }]} />
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.serverName, isDark && styles.textDark]}>{serverName}</Text>
                    <Text style={[styles.statusTextStyle, isDark && styles.textSecondaryDark]}>{statusText}</Text>
                    <Text style={[styles.timeText, isDark && styles.textSecondaryDark]}>{timeText}</Text>
                  </View>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </View>
    </>
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
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
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
  primaryButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
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
  sessionCardPressed: {
    opacity: 0.9,
  },
  sessionInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  statusTextStyle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#999999',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#AAAAAA',
  },
});

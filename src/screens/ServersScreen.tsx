import React, { useCallback, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
  useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Symbols from 'expo-symbols';
import { useServers } from '../context/ServersContext';
import type { MainTabScreenProps } from '../navigation/types';
import type { TernsshServer } from '../types';

// iOS Native UI Components
import {
  Host,
  List,
  Section,
  SwipeActions,
  Button,
  Text as SwiftUIText,
  HStack,
  VStack,
  Spacer,
  ContentUnavailableView,
} from '@expo/ui/swift-ui';
import {
  listStyle,
  refreshable,
  padding,
  font,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';

export function ServersScreen({ navigation }: MainTabScreenProps<'Servers'>) {
  const { servers, loading, refreshServers, deleteServer } = useServers();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        Platform.OS === 'ios' ? (
          <TouchableOpacity 
            onPress={() => navigation.navigate('AddServer')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Symbols.SymbolView
              name="plus"
              style={{ width: 22, height: 22 }}
              tintColor={isDark ? '#0A84FF' : '#007AFF'}
              weight="semibold"
            />
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [navigation, isDark]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshServers();
    setRefreshing(false);
  }, [refreshServers]);

  const handleDeleteServer = useCallback(async (server: TernsshServer) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Server',
      `Are you sure you want to remove "${server.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteServer(server.id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [deleteServer]);

  const showServerActions = useCallback((server: TernsshServer) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
          title: server.name,
          message: server.url,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            navigation.navigate('EditServer', { serverId: server.id });
          } else if (buttonIndex === 2) {
            handleDeleteServer(server);
          }
        }
      );
    } else {
      Alert.alert(
        server.name,
        server.url,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => navigation.navigate('EditServer', { serverId: server.id }) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteServer(server) },
        ]
      );
    }
  }, [navigation, handleDeleteServer]);

  const handleServerPress = useCallback((server: TernsshServer) => {
    Haptics.selectionAsync();
    navigation.navigate('SSHHosts', { serverId: server.id });
  }, [navigation]);

  if (loading && servers.length === 0) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={Platform.OS === 'ios' ? '#007AFF' : '#6200EE'} />
      </View>
    );
  }

  // iOS: Native SwiftUI List
  if (Platform.OS === 'ios') {
    if (servers.length === 0) {
      return (
        <Host matchContents={false} style={styles.container}>
          <VStack modifiers={[padding({ all: 32 })]}>
            <ContentUnavailableView
              title="No Servers"
              description="Add a ternssh server to get started."
              systemImage="server.rack"
            />
            <Button label="Add Server" onPress={() => navigation.navigate('AddServer')} />
          </VStack>
        </Host>
      );
    }

    return (
      <Host matchContents={false} style={styles.container}>
        <List
          modifiers={[
            listStyle('insetGrouped'),
            refreshable(onRefresh),
          ]}
        >
          <Section title="Servers">
            {servers.map((server) => (
              <SwipeActions key={server.id}>
                <Pressable
                  onPress={() => handleServerPress(server)}
                  onLongPress={() => showServerActions(server)}
                  style={styles.listRow}
                >
                  <HStack modifiers={[padding({ vertical: 4 })]}>
                    <VStack>
                      <SwiftUIText
                        modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}
                      >
                        {server.name}
                      </SwiftUIText>
                      <SwiftUIText
                        modifiers={[
                          font({ textStyle: 'caption' }),
                          foregroundStyle('secondary'),
                        ]}
                      >
                        {server.url}
                      </SwiftUIText>
                      <SwiftUIText
                        modifiers={[
                          font({ textStyle: 'caption2' }),
                          foregroundStyle('tertiary'),
                          padding({ top: 4 }),
                        ]}
                      >
                        {server.authType === 'basic' ? 'Basic Auth' : 
                         server.authType === 'access' ? 'Cloudflare Access' : 'No Auth'}
                      </SwiftUIText>
                    </VStack>
                    <Spacer />
                  </HStack>
                </Pressable>
                <SwipeActions.Actions edge="trailing">
                  <Button
                    label="Delete"
                    systemImage="trash"
                    role="destructive"
                    onPress={() => handleDeleteServer(server)}
                  />
                  <Button
                    label="Edit"
                    systemImage="pencil"
                    onPress={() => navigation.navigate('EditServer', { serverId: server.id })}
                  />
                </SwipeActions.Actions>
              </SwipeActions>
            ))}
          </Section>
        </List>
      </Host>
    );
  }

  // Android: Material Design FlatList
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {servers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🖥️</Text>
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No Servers</Text>
          <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
            Add a ternssh server to get started.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            onPress={() => navigation.navigate('AddServer')}
          >
            <Text style={styles.addButtonText}>Add Server</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={servers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#6200EE']}
              />
            }
            renderItem={({ item: server }) => (
              <Pressable
                onPress={() => handleServerPress(server)}
                onLongPress={() => showServerActions(server)}
                style={({ pressed }) => [
                  styles.serverCard,
                  isDark && styles.serverCardDark,
                  pressed && styles.serverCardPressed,
                ]}
                android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
              >
                <View style={styles.serverInfo}>
                  <Text style={[styles.serverName, isDark && styles.textDark]}>{server.name}</Text>
                  <Text style={[styles.serverUrl, isDark && styles.textSecondaryDark]}>{server.url}</Text>
                  <View style={styles.authBadge}>
                    <Text style={styles.authBadgeText}>
                      {server.authType === 'basic' ? 'Basic Auth' : 
                       server.authType === 'access' ? 'Cloudflare Access' : 'No Auth'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('AddServer');
            }}
          >
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        </>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Platform.select({ ios: '#F2F2F7', android: '#FAFAFA' }),
  },
  listRow: {
    minHeight: 44,
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
  addButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonPressed: { opacity: 0.8 },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
  },
  serverCardDark: {
    backgroundColor: '#1E1E1E',
  },
  serverCardPressed: {
    opacity: 0.9,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  serverUrl: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  authBadge: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  authBadgeText: {
    fontSize: 12,
    color: '#3F51B5',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 22,
    color: '#CCCCCC',
    marginLeft: 8,
  },
  chevronDark: {
    color: '#666666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  fabPressed: {
    elevation: 12,
    backgroundColor: '#7C4DFF',
  },
  fabIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  textDark: { color: '#FFFFFF' },
  textSecondaryDark: { color: '#AAAAAA' },
});

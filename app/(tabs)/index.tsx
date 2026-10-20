import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  useColorScheme,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Symbols from 'expo-symbols';
import { useServers } from '../../src/context/ServersContext';
import type { TernsshServer } from '../../src/types';

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
  ContextMenu,
} from '@expo/ui/swift-ui';
import {
  listStyle,
  refreshable,
  padding,
  font,
  foregroundStyle,
  buttonStyle,
} from '@expo/ui/swift-ui/modifiers';

export default function ServersScreen() {
  const router = useRouter();
  const { servers, loading, refreshServers, deleteServer } = useServers();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchText.toLowerCase()) ||
    server.url.toLowerCase().includes(searchText.toLowerCase())
  );

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

  const handleServerPress = useCallback((server: TernsshServer) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/ssh-hosts', params: { serverId: server.id } });
  }, [router]);

  const handleEditServer = useCallback((server: TernsshServer) => {
    router.push({ pathname: '/edit-server', params: { serverId: server.id } });
  }, [router]);

  const handleAddServer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-server');
  }, [router]);

  if (loading && servers.length === 0) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={Platform.OS === 'ios' ? '#007AFF' : '#6200EE'} />
      </View>
    );
  }

  // iOS: Native SwiftUI List with Search Bar and Context Menu
  if (Platform.OS === 'ios') {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Servers',
            headerLargeTitle: true,
            headerRight: () => (
              <Pressable onPress={handleAddServer} hitSlop={10}>
                <Symbols.SymbolView
                  name="plus"
                  style={{ width: 22, height: 22 }}
                  tintColor={isDark ? '#0A84FF' : '#007AFF'}
                  weight="semibold"
                />
              </Pressable>
            ),
          }}
        />
        <Stack.SearchBar
          placeholder="Search servers..."
          onChangeText={(e) => setSearchText(e.nativeEvent.text)}
          hideWhenScrolling={true}
        />
        <Host matchContents={false} style={styles.container}>
          {filteredServers.length === 0 && searchText === '' ? (
            <VStack modifiers={[padding({ all: 32 })]}>
              <ContentUnavailableView
                title="No Servers"
                description="Add a ternssh server to get started."
                systemImage="server.rack"
              />
              <Button
                label="Add Server"
                onPress={handleAddServer}
                modifiers={[buttonStyle('glassProminent')]}
              />
            </VStack>
          ) : filteredServers.length === 0 ? (
            <VStack modifiers={[padding({ all: 32 })]}>
              <ContentUnavailableView
                title="No Results"
                description={`No servers match "${searchText}"`}
                systemImage="magnifyingglass"
              />
            </VStack>
          ) : (
            <List
              modifiers={[
                listStyle('insetGrouped'),
                refreshable(onRefresh),
              ]}
            >
              <Section title="Servers">
                {filteredServers.map((server) => (
                  <ContextMenu key={server.id}>
                    <ContextMenu.Trigger>
                      <SwipeActions>
                        <Pressable
                          onPress={() => handleServerPress(server)}
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
                            onPress={() => handleEditServer(server)}
                          />
                        </SwipeActions.Actions>
                      </SwipeActions>
                    </ContextMenu.Trigger>
                    <ContextMenu.Items>
                      <Button
                        label="View SSH Hosts"
                        systemImage="desktopcomputer"
                        onPress={() => handleServerPress(server)}
                      />
                      <Button
                        label="Edit"
                        systemImage="pencil"
                        onPress={() => handleEditServer(server)}
                      />
                      <Button
                        label="Delete"
                        systemImage="trash"
                        role="destructive"
                        onPress={() => handleDeleteServer(server)}
                      />
                    </ContextMenu.Items>
                  </ContextMenu>
                ))}
              </Section>
            </List>
          )}
        </Host>
      </>
    );
  }

  // Android: Material Design with RN components
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Servers',
          headerRight: () => (
            <Pressable onPress={handleAddServer} style={styles.androidHeaderButton}>
              <Text style={[styles.androidHeaderButtonText, isDark && styles.androidHeaderButtonTextDark]}>+</Text>
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, isDark && styles.containerDark]}>
        {filteredServers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖥️</Text>
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No Servers</Text>
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
              Add a ternssh server to get started.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
              onPress={handleAddServer}
            >
              <Text style={styles.addButtonText}>Add Server</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              data={filteredServers}
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
                  onLongPress={() => {
                    Alert.alert(
                      server.name,
                      server.url,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Edit', onPress: () => handleEditServer(server) },
                        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteServer(server) },
                      ]
                    );
                  }}
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
              onPress={handleAddServer}
            >
              <Text style={styles.fabIcon}>+</Text>
            </Pressable>
          </>
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
  androidHeaderButton: {
    padding: 8,
    marginRight: 8,
  },
  androidHeaderButtonText: {
    fontSize: 24,
    color: '#6200EE',
    fontWeight: '300',
  },
  androidHeaderButtonTextDark: {
    color: '#BB86FC',
  },
});

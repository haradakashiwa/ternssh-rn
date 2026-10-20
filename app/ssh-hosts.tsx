import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  useColorScheme,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Symbols from 'expo-symbols';
import { useServers } from '../src/context/ServersContext';
import type { TreeNode, SSHHost } from '../src/types';

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

interface FlattenedNode {
  type: 'group' | 'server';
  id: string;
  name: string;
  depth: number;
  host?: SSHHost;
  isExpanded?: boolean;
  hasChildren?: boolean;
}

function flattenTree(
  nodes: TreeNode[],
  depth = 0,
  expandedGroups: Set<string>
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  
  for (const node of nodes) {
    if (node.type === 'group') {
      const isExpanded = expandedGroups.has(node.id);
      result.push({
        type: 'group',
        id: node.id,
        name: node.name,
        depth,
        isExpanded,
        hasChildren: node.children.length > 0,
      });
      if (isExpanded) {
        result.push(...flattenTree(node.children, depth + 1, expandedGroups));
      }
    } else {
      result.push({
        type: 'server',
        id: node.id,
        name: node.name,
        depth,
        host: node,
      });
    }
  }
  
  return result;
}

export default function SSHHostsScreen() {
  const router = useRouter();
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { servers, getApiClient } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');

  const server = servers.find(s => s.id === serverId);
  const apiClient = serverId ? getApiClient(serverId) : null;

  const loadHosts = useCallback(async () => {
    if (!apiClient) return;
    
    try {
      const response = await apiClient.getServerTree();
      setTree(response.tree);
      setError(null);
      const allGroupIds = new Set<string>();
      const collectGroups = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === 'group') {
            allGroupIds.add(node.id);
            collectGroups(node.children);
          }
        }
      };
      collectGroups(response.tree);
      setExpandedGroups(allGroupIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hosts');
    }
  }, [apiClient]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadHosts();
      setLoading(false);
    };
    load();
  }, [loadHosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHosts();
    setRefreshing(false);
  }, [loadHosts]);

  const toggleGroup = useCallback((groupId: string) => {
    Haptics.selectionAsync();
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleHostPress = useCallback((host: SSHHost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/terminal',
      params: { serverId, sshHostId: host.id, sshHostName: host.name },
    });
  }, [router, serverId]);

  const handleDeleteHost = useCallback(async (host: SSHHost) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Host',
      `Are you sure you want to delete "${host.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient?.deleteSSHHost(host.id);
              await loadHosts();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete host');
            }
          },
        },
      ]
    );
  }, [apiClient, loadHosts]);

  const handleEditHost = useCallback((host: SSHHost) => {
    router.push({
      pathname: '/edit-ssh-host',
      params: { serverId, hostId: host.id },
    });
  }, [router, serverId]);

  const handleAddHost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/add-ssh-host', params: { serverId } });
  }, [router, serverId]);

  const flattenedTree = flattenTree(tree, 0, expandedGroups);
  
  const filteredTree = searchText !== ''
    ? flattenedTree.filter(item => 
        item.type === 'server' && 
        (item.name.toLowerCase().includes(searchText.toLowerCase()) ||
         (item.host?.host ?? '').toLowerCase().includes(searchText.toLowerCase()))
      )
    : flattenedTree;

  const serverTitle = server?.name ?? 'SSH Hosts';

  if (!server) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <Text style={isDark ? styles.textDark : undefined}>Server not found</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: serverTitle }} />
        <View style={[styles.centerContainer, isDark && styles.containerDark]}>
          <ActivityIndicator size="large" color={Platform.OS === 'ios' ? '#007AFF' : '#6200EE'} />
          <Text style={[styles.loadingText, isDark && styles.textSecondaryDark]}>Loading hosts...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: serverTitle }} />
        <View style={[styles.centerContainer, isDark && styles.containerDark]}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadHosts}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // iOS: Native SwiftUI List with Search Bar and Context Menu
  if (Platform.OS === 'ios') {
    return (
      <>
        <Stack.Screen
          options={{
            title: serverTitle,
            headerRight: () => (
              <Pressable onPress={handleAddHost} hitSlop={10}>
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
          placeholder="Search hosts..."
          onChangeText={(e) => setSearchText(e.nativeEvent.text)}
          hideWhenScrolling={true}
        />
        <Host matchContents={false} style={styles.container}>
          {filteredTree.length === 0 && searchText === '' ? (
            <VStack modifiers={[padding({ all: 32 })]}>
              <ContentUnavailableView
                title="No SSH Hosts"
                description="Add an SSH host to connect to remote servers."
                systemImage="desktopcomputer"
              />
              <Button
                label="Add SSH Host"
                onPress={handleAddHost}
                modifiers={[buttonStyle('glassProminent')]}
              />
            </VStack>
          ) : filteredTree.length === 0 ? (
            <VStack modifiers={[padding({ all: 32 })]}>
              <ContentUnavailableView
                title="No Results"
                description={`No hosts match "${searchText}"`}
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
              <Section title="SSH Hosts">
                {filteredTree.map((item) => {
                  if (item.type === 'group') {
                    const groupIcon = item.isExpanded ? '📂' : '📁';
                    const expandIcon = item.isExpanded ? '▼' : '▶';
                    return (
                      <Pressable key={item.id} onPress={() => toggleGroup(item.id)}>
                        <HStack modifiers={[padding({ vertical: 8, leading: item.depth * 16 })]}>
                          <SwiftUIText modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}>
                            {`${groupIcon} ${item.name}`}
                          </SwiftUIText>
                          <Spacer />
                          <SwiftUIText modifiers={[foregroundStyle('secondary')]}>
                            {expandIcon}
                          </SwiftUIText>
                        </HStack>
                      </Pressable>
                    );
                  }

                  const host = item.host!;
                  const hostInfo = `${host.username}@${host.host}:${String(host.port)}`;
                  const authInfo = host.auth_type === 'password' ? '🔑 Password' : '🗝️ Private Key';
                  
                  return (
                    <ContextMenu key={item.id}>
                      <ContextMenu.Trigger>
                        <SwipeActions>
                          <Pressable onPress={() => handleHostPress(host)}>
                            <HStack modifiers={[padding({ vertical: 4, leading: item.depth * 16 })]}>
                              <VStack>
                                <SwiftUIText modifiers={[font({ textStyle: 'body', weight: 'medium' })]}>
                                  {host.name}
                                </SwiftUIText>
                                <SwiftUIText modifiers={[font({ textStyle: 'caption' }), foregroundStyle('secondary')]}>
                                  {hostInfo}
                                </SwiftUIText>
                                <SwiftUIText modifiers={[font({ textStyle: 'caption2' }), foregroundStyle('tertiary')]}>
                                  {authInfo}
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
                              onPress={() => handleDeleteHost(host)}
                            />
                            <Button
                              label="Edit"
                              systemImage="pencil"
                              onPress={() => handleEditHost(host)}
                            />
                          </SwipeActions.Actions>
                        </SwipeActions>
                      </ContextMenu.Trigger>
                      <ContextMenu.Items>
                        <Button
                          label="Connect"
                          systemImage="terminal"
                          onPress={() => handleHostPress(host)}
                        />
                        <Button
                          label="Edit"
                          systemImage="pencil"
                          onPress={() => handleEditHost(host)}
                        />
                        <Button
                          label="Delete"
                          systemImage="trash"
                          role="destructive"
                          onPress={() => handleDeleteHost(host)}
                        />
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
      <Stack.Screen
        options={{
          title: serverTitle,
          headerRight: () => (
            <Pressable onPress={handleAddHost} style={styles.androidHeaderButton}>
              <Text style={[styles.androidHeaderButtonText, isDark && styles.androidHeaderButtonTextDark]}>+</Text>
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Search hosts..."
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {filteredTree.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖥️</Text>
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
              {searchText ? 'No Results' : 'No SSH Hosts'}
            </Text>
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
              {searchText 
                ? `No hosts match "${searchText}"` 
                : 'Add an SSH host to connect to remote servers.'}
            </Text>
            {!searchText ? (
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                onPress={handleAddHost}
              >
                <Text style={styles.addButtonText}>Add SSH Host</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            <FlatList
              data={filteredTree}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#6200EE']}
                />
              }
              renderItem={({ item }) => {
                if (item.type === 'group') {
                  const groupIcon = item.isExpanded ? '📂' : '📁';
                  const expandIcon = item.isExpanded ? '▼' : '▶';
                  return (
                    <Pressable
                      onPress={() => toggleGroup(item.id)}
                      style={({ pressed }) => [
                        styles.groupRow,
                        { paddingLeft: 16 + item.depth * 16 },
                        isDark && styles.groupRowDark,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <Text style={[styles.groupName, isDark && styles.textDark]}>
                        {`${groupIcon} ${item.name}`}
                      </Text>
                      <Text style={[styles.expandIcon, isDark && styles.textSecondaryDark]}>
                        {expandIcon}
                      </Text>
                    </Pressable>
                  );
                }

                const host = item.host!;
                const hostInfo = `${host.username}@${host.host}:${String(host.port)}`;
                const authInfo = host.auth_type === 'password' ? '🔑 Password' : '🗝️ Private Key';

                return (
                  <Pressable
                    onPress={() => handleHostPress(host)}
                    onLongPress={() => {
                      Alert.alert(
                        host.name,
                        hostInfo,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Connect', onPress: () => handleHostPress(host) },
                          { text: 'Edit', onPress: () => handleEditHost(host) },
                          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteHost(host) },
                        ]
                      );
                    }}
                    style={({ pressed }) => [
                      styles.hostCard,
                      { marginLeft: item.depth * 16 },
                      isDark && styles.hostCardDark,
                      pressed && styles.hostCardPressed,
                    ]}
                    android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
                  >
                    <View style={styles.hostInfo}>
                      <Text style={[styles.hostName, isDark && styles.textDark]}>{host.name}</Text>
                      <Text style={[styles.hostDetails, isDark && styles.textSecondaryDark]}>{hostInfo}</Text>
                      <Text style={[styles.authType, isDark && styles.textSecondaryDark]}>{authInfo}</Text>
                    </View>
                    <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
            <Pressable
              style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
              onPress={handleAddHost}
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
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainerDark: {
    backgroundColor: '#121212',
  },
  searchInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  searchInputDark: {
    backgroundColor: '#2C2C2C',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
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
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
  },
  groupRowDark: {
    backgroundColor: '#1E1E1E',
  },
  rowPressed: {
    opacity: 0.9,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  expandIcon: {
    fontSize: 14,
    color: '#666666',
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
  },
  hostCardDark: {
    backgroundColor: '#1E1E1E',
  },
  hostCardPressed: {
    opacity: 0.9,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  hostDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  authType: {
    fontSize: 12,
    color: '#999999',
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
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#AAAAAA',
  },
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

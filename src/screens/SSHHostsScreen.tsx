import React, { useCallback, useEffect, useState, useLayoutEffect } from 'react';
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
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Symbols from 'expo-symbols';
import { useServers } from '../context/ServersContext';
import type { RootStackScreenProps } from '../navigation/types';
import type { TreeNode, SSHHost } from '../types';

interface FlattenedNode {
  type: 'group' | 'server';
  id: string;
  name: string;
  depth: number;
  host?: SSHHost;
  isExpanded?: boolean;
  hasChildren?: boolean;
}

const useGlassAvailable = () => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
};

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

export function SSHHostsScreen({ navigation, route }: RootStackScreenProps<'SSHHosts'>) {
  const { serverId } = route.params;
  const { servers, getApiClient } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const glassAvailable = useGlassAvailable();
  
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const server = servers.find(s => s.id === serverId);
  const apiClient = getApiClient(serverId);

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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: server?.name ?? 'SSH Hosts',
      headerSearchBarOptions: Platform.OS === 'ios' ? {
        placeholder: 'Search hosts',
      } : undefined,
      headerRight: () => (
        Platform.OS === 'ios' ? (
          <TouchableOpacity 
            onPress={() => navigation.navigate('AddSSHHost', { serverId })}
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
  }, [navigation, server, serverId, isDark]);

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
    navigation.navigate('Terminal', {
      serverId,
      sshHostId: host.id,
      sshHostName: host.name,
    });
  }, [navigation, serverId]);

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

  const showHostActions = useCallback((host: SSHHost) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Connect', 'Edit', 'Delete'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: host.name,
          message: `${host.username}@${host.host}:${host.port}`,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleHostPress(host);
          else if (buttonIndex === 2) navigation.navigate('EditSSHHost', { serverId, hostId: host.id });
          else if (buttonIndex === 3) handleDeleteHost(host);
        }
      );
    } else {
      Alert.alert(
        host.name,
        `${host.username}@${host.host}:${host.port}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: () => handleHostPress(host) },
          { text: 'Edit', onPress: () => navigation.navigate('EditSSHHost', { serverId, hostId: host.id }) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteHost(host) },
        ]
      );
    }
  }, [handleHostPress, handleDeleteHost, navigation, serverId]);

  const renderRightActions = useCallback((host: SSHHost) => (
    <TouchableOpacity
      style={styles.swipeDeleteButton}
      onPress={() => handleDeleteHost(host)}
    >
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  ), [handleDeleteHost]);

  const flattenedTree = flattenTree(tree, 0, expandedGroups);

  const renderFloatingButton = () => {
    const buttonContent = (
      <>
        {Platform.OS === 'ios' ? (
          <Symbols.SymbolView
            name="plus"
            style={{ width: 24, height: 24 }}
            tintColor="#FFFFFF"
            weight="medium"
          />
        ) : (
          <Text style={styles.fabIcon}>+</Text>
        )}
      </>
    );

    if (Platform.OS === 'ios' && glassAvailable) {
      return (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('AddSSHHost', { serverId });
          }}
        >
          <GlassView 
            style={styles.glassFab} 
            glassEffectStyle="regular"
            isInteractive
          >
            {buttonContent}
          </GlassView>
        </Pressable>
      );
    }

    if (Platform.OS === 'ios') {
      return (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('AddSSHHost', { serverId });
          }}
        >
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.blurFab}>
            {buttonContent}
          </BlurView>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('AddSSHHost', { serverId });
        }}
      >
        {buttonContent}
      </Pressable>
    );
  };

  const renderItem = ({ item, index }: { item: FlattenedNode; index: number }) => {
    const paddingLeft = 16 + item.depth * 24;

    if (item.type === 'group') {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.groupRow,
            isDark && styles.groupRowDark,
            pressed && Platform.OS === 'ios' && styles.pressed,
          ]}
          android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
          onPress={() => toggleGroup(item.id)}
        >
          <View style={[styles.groupContent, { paddingLeft }]}>
            <Text style={[styles.groupIcon, isDark && styles.textDark]}>
              {item.isExpanded ? '📂' : '📁'}
            </Text>
            <Text style={[styles.groupName, isDark && styles.textDark]}>{item.name}</Text>
            {item.hasChildren && (
              <Text style={[styles.expandIcon, isDark && styles.expandIconDark]}>
                {item.isExpanded ? '▼' : '▶'}
              </Text>
            )}
          </View>
        </Pressable>
      );
    }

    const host = item.host!;
    const hostContent = (
      <Pressable
        style={({ pressed }) => [
          styles.hostRow,
          isDark && styles.hostRowDark,
          pressed && Platform.OS === 'ios' && styles.pressed,
        ]}
        android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
        onPress={() => handleHostPress(host)}
        onLongPress={() => showHostActions(host)}
      >
        <View style={[styles.hostContent, { paddingLeft }]}>
          <Text style={styles.hostIcon}>🖥️</Text>
          <View style={styles.hostInfo}>
            <Text style={[styles.hostName, isDark && styles.textDark]}>{host.name}</Text>
            <Text style={[styles.hostDetails, isDark && styles.textSecondaryDark]}>
              {host.username}@{host.host}:{host.port}
            </Text>
          </View>
          <View style={[
            styles.authBadge,
            host.auth_type === 'password' 
              ? (isDark ? styles.authPasswordDark : styles.authPassword)
              : (isDark ? styles.authKeyDark : styles.authKey)
          ]}>
            <Text style={styles.authBadgeText}>
              {host.auth_type === 'password' ? '🔑' : '🗝️'}
            </Text>
          </View>
          <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
        </View>
      </Pressable>
    );

    if (Platform.OS === 'ios') {
      return (
        <Swipeable
          renderRightActions={() => renderRightActions(host)}
          friction={2}
          rightThreshold={40}
        >
          {hostContent}
        </Swipeable>
      );
    }

    return hostContent;
  };

  if (!server) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <Text style={[styles.errorText, isDark && styles.textDark]}>Server not found</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={Platform.OS === 'ios' ? '#007AFF' : '#6200EE'} />
        <Text style={[styles.loadingText, isDark && styles.textSecondaryDark]}>Loading hosts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, isDark && styles.textDark]}>{error}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
          onPress={loadHosts}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isDark && styles.containerDark]}>
        <FlatList
          data={flattenedTree}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={flattenedTree.length === 0 ? styles.emptyContainer : styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={isDark ? '#0A84FF' : '#007AFF'}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No SSH Hosts</Text>
              <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
                Add an SSH host to connect to remote servers through this ternssh deployment.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}
                onPress={() => navigation.navigate('AddSSHHost', { serverId })}
              >
                <Text style={styles.addButtonText}>Add SSH Host</Text>
              </Pressable>
            </View>
          }
        />
        {flattenedTree.length > 0 && renderFloatingButton()}
      </View>
    </GestureHandlerRootView>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Platform.select({ ios: '#F2F2F7', android: '#FAFAFA' }),
    padding: 32,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
  groupRow: {
    backgroundColor: Platform.select({ ios: '#F2F2F7', android: '#F5F5F5' }),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  groupRowDark: {
    backgroundColor: Platform.select({ ios: '#1C1C1E', android: '#2C2C2C' }),
    borderBottomColor: '#38383A',
  },
  groupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
  },
  groupIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  groupName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
  },
  expandIcon: {
    fontSize: 10,
    color: '#8E8E93',
  },
  expandIconDark: {
    color: '#636366',
  },
  hostRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  hostRowDark: {
    backgroundColor: Platform.select({ ios: '#1C1C1E', android: '#1E1E1E' }),
    borderBottomColor: '#38383A',
  },
  hostContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
  },
  hostIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  hostDetails: {
    fontSize: 14,
    color: '#8E8E93',
  },
  authBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  authPassword: {
    backgroundColor: '#E3F2FD',
  },
  authPasswordDark: {
    backgroundColor: '#1E3A5F',
  },
  authKey: {
    backgroundColor: '#E8F5E9',
  },
  authKeyDark: {
    backgroundColor: '#1E3D2E',
  },
  authBadgeText: {
    fontSize: 14,
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
  swipeDeleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Platform.select({ ios: '#007AFF', android: '#6200EE' }),
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Platform.select({ ios: 10, android: 8 }),
  },
  buttonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
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
    backgroundColor: Platform.select({ ios: '#007AFF', android: '#6200EE' }),
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Platform.select({ ios: 10, android: 8 }),
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  headerButton: {
    color: '#007AFF',
    fontSize: 17,
  },
  headerButtonDark: {
    color: '#0A84FF',
  },
  glassFab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurFab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
});

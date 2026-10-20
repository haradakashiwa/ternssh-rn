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
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useServers } from '../context/ServersContext';
import type { MainTabScreenProps } from '../navigation/types';
import type { TernsshServer } from '../types';

export function ServersScreen({ navigation }: MainTabScreenProps<'Servers'>) {
  const { servers, loading, refreshServers, deleteServer } = useServers();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        Platform.OS === 'ios' ? (
          <TouchableOpacity onPress={() => navigation.navigate('AddServer')}>
            <Text style={[styles.headerButton, isDark && styles.headerButtonDark]}>Add</Text>
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
      `Are you sure you want to remove "${server.name}"? This will not affect the remote ternssh deployment.`,
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

  const renderRightActions = useCallback((server: TernsshServer) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteButton}
        onPress={() => handleDeleteServer(server)}
      >
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </TouchableOpacity>
    );
  }, [handleDeleteServer]);

  const renderServer = ({ item, index }: { item: TernsshServer; index: number }) => {
    const isFirst = index === 0;
    const isLast = index === servers.length - 1;

    const cardContent = (
      <View style={[
        styles.serverCard,
        isDark && styles.serverCardDark,
        Platform.OS === 'ios' && styles.serverCardIOS,
        Platform.OS === 'ios' && isFirst && styles.serverCardFirst,
        Platform.OS === 'ios' && isLast && styles.serverCardLast,
        Platform.OS === 'android' && styles.serverCardAndroid,
      ]}>
        <View style={styles.serverInfo}>
          <Text style={[styles.serverName, isDark && styles.textDark]}>{item.name}</Text>
          <Text style={[styles.serverUrl, isDark && styles.textSecondaryDark]}>{item.url}</Text>
          <View style={styles.serverMeta}>
            <View style={[
              styles.authBadge,
              item.authType === 'basic' && (isDark ? styles.authBasicDark : styles.authBasic),
              item.authType === 'access' && (isDark ? styles.authAccessDark : styles.authAccess),
              item.authType === 'none' && (isDark ? styles.authNoneDark : styles.authNone),
            ]}>
              <Text style={[styles.authBadgeText, isDark && styles.authBadgeTextDark]}>
                {item.authType === 'basic' ? 'Basic Auth' : item.authType === 'access' ? 'Cloudflare Access' : 'No Auth'}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
      </View>
    );

    const pressable = (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          navigation.navigate('SSHHosts', { serverId: item.id });
        }}
        onLongPress={() => showServerActions(item)}
        android_ripple={Platform.OS === 'android' ? { color: isDark ? '#333' : '#E0E0E0' } : undefined}
        style={({ pressed }) => [
          Platform.OS === 'ios' && pressed && styles.pressed,
        ]}
      >
        {cardContent}
      </Pressable>
    );

    if (Platform.OS === 'ios') {
      return (
        <Swipeable
          renderRightActions={() => renderRightActions(item)}
          friction={2}
          rightThreshold={40}
        >
          {pressable}
        </Swipeable>
      );
    }

    return pressable;
  };

  if (loading && servers.length === 0) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={Platform.OS === 'ios' ? '#007AFF' : '#6200EE'} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isDark && styles.containerDark]}>
        <FlatList
          data={servers}
          keyExtractor={(item) => item.id}
          renderItem={renderServer}
          contentContainerStyle={[
            servers.length === 0 ? styles.emptyContainer : styles.listContent,
            Platform.OS === 'ios' && styles.listContentIOS,
          ]}
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
              <Text style={styles.emptyIcon}>🖥️</Text>
              <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No Servers</Text>
              <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
                Add a ternssh server to get started. You can connect to multiple ternssh deployments.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  Platform.OS === 'android' && styles.addButtonAndroid,
                  pressed && styles.addButtonPressed,
                ]}
                onPress={() => navigation.navigate('AddServer')}
              >
                <Text style={styles.addButtonText}>Add Server</Text>
              </Pressable>
            </View>
          }
        />
        {Platform.OS === 'android' && servers.length > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              pressed && styles.fabPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('AddServer');
            }}
          >
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        )}
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
  },
  listContent: {
    paddingBottom: 100,
  },
  listContentIOS: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  serverCardDark: {
    backgroundColor: Platform.select({ ios: '#1C1C1E', android: '#1E1E1E' }),
  },
  serverCardIOS: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  serverCardFirst: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  serverCardLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 16,
  },
  serverCardAndroid: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
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
    color: '#8E8E93',
    marginBottom: 8,
  },
  serverMeta: {
    flexDirection: 'row',
  },
  authBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  authBasic: {
    backgroundColor: '#E3F2FD',
  },
  authBasicDark: {
    backgroundColor: '#1E3A5F',
  },
  authAccess: {
    backgroundColor: '#FFF3E0',
  },
  authAccessDark: {
    backgroundColor: '#4A3728',
  },
  authNone: {
    backgroundColor: '#F5F5F5',
  },
  authNoneDark: {
    backgroundColor: '#2C2C2E',
  },
  authBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555555',
  },
  authBadgeTextDark: {
    color: '#AAAAAA',
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
  addButtonAndroid: {
    elevation: 2,
  },
  addButtonPressed: {
    opacity: 0.8,
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

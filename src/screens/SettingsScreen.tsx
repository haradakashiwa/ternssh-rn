import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  useColorScheme,
} from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useServers } from '../context/ServersContext';
import type { MainTabScreenProps } from '../navigation/types';

export function SettingsScreen({ navigation }: MainTabScreenProps<'Settings'>) {
  const { servers, sessions, refreshServers } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleClearSessions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear Sessions',
      'This will clear all session history. Active connections will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Done', 'Session history cleared.');
          },
        },
      ]
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshServers();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [refreshServers]);

  const handleOpenDocs = useCallback(() => {
    Haptics.selectionAsync();
    Linking.openURL('https://ternssh.com/docs/home');
  }, []);

  const handleOpenGitHub = useCallback(() => {
    Haptics.selectionAsync();
    Linking.openURL('https://github.com/haradakashiwa/ternssh');
  }, []);

  return (
    <ScrollView 
      style={[styles.container, isDark && styles.containerDark]} 
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>STATISTICS</Text>
        <View style={[styles.statsCard, isDark && styles.cardDark]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isDark && styles.statValueDark]}>{servers.length}</Text>
              <Text style={[styles.statLabel, isDark && styles.textSecondaryDark]}>Servers</Text>
            </View>
            <View style={[styles.statDivider, isDark && styles.statDividerDark]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isDark && styles.statValueDark]}>{sessions.length}</Text>
              <Text style={[styles.statLabel, isDark && styles.textSecondaryDark]}>Sessions</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>DATA</Text>
        <View style={[styles.menuGroup, isDark && styles.cardDark]}>
          <Pressable 
            style={({ pressed }) => [
              styles.menuItem,
              isDark && styles.menuItemDark,
              pressed && (isDark ? styles.menuItemPressedDark : styles.menuItemPressed),
            ]}
            android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
            onPress={handleRefresh}
          >
            <Text style={[styles.menuItemText, isDark && styles.textDark]}>Refresh Servers</Text>
            <Text style={styles.menuItemIcon}>🔄</Text>
          </Pressable>
          <View style={[styles.separator, isDark && styles.separatorDark]} />
          <Pressable 
            style={({ pressed }) => [
              styles.menuItem,
              isDark && styles.menuItemDark,
              pressed && (isDark ? styles.menuItemPressedDark : styles.menuItemPressed),
            ]}
            android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
            onPress={handleClearSessions}
          >
            <Text style={[styles.menuItemText, styles.destructiveText]}>Clear Session History</Text>
            <Text style={styles.menuItemIcon}>🗑️</Text>
          </Pressable>
        </View>
      </View>

      {/* Resources Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>RESOURCES</Text>
        <View style={[styles.menuGroup, isDark && styles.cardDark]}>
          <Pressable 
            style={({ pressed }) => [
              styles.menuItem,
              isDark && styles.menuItemDark,
              pressed && (isDark ? styles.menuItemPressedDark : styles.menuItemPressed),
            ]}
            android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
            onPress={handleOpenDocs}
          >
            <Text style={[styles.menuItemText, isDark && styles.textDark]}>ternssh Documentation</Text>
            <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
          </Pressable>
          <View style={[styles.separator, isDark && styles.separatorDark]} />
          <Pressable 
            style={({ pressed }) => [
              styles.menuItem,
              isDark && styles.menuItemDark,
              pressed && (isDark ? styles.menuItemPressedDark : styles.menuItemPressed),
            ]}
            android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
            onPress={handleOpenGitHub}
          >
            <Text style={[styles.menuItemText, isDark && styles.textDark]}>GitHub Repository</Text>
            <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>ABOUT</Text>
        <View style={[styles.aboutCard, isDark && styles.cardDark]}>
          <Text style={[styles.appName, isDark && styles.textDark]}>ternssh Mobile</Text>
          <Text style={[styles.appVersion, isDark && styles.textSecondaryDark]}>
            Version {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
          <Text style={[styles.appDescription, isDark && styles.textSecondaryDark]}>
            A native mobile client for ternssh, the SSH workspace on Cloudflare.
            Connect to multiple ternssh deployments and manage your SSH hosts on the go.
          </Text>
        </View>
      </View>

      {/* Terminal Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>TERMINAL</Text>
        <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={[styles.infoText, isDark && styles.infoTextDark]}>
            The terminal view uses xterm.js in a WebView for accurate terminal emulation.
            All other app screens use native {Platform.OS === 'ios' ? 'iOS' : 'Android'} components.
          </Text>
        </View>
      </View>

      <Text style={[styles.footer, isDark && styles.footerDark]}>
        ternssh is licensed under GPL-3.0-or-later
      </Text>
    </ScrollView>
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
  content: {
    paddingBottom: 40,
  },
  section: {
    marginTop: Platform.select({ ios: 24, android: 16 }),
    marginHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6D6D72',
    marginBottom: 8,
    marginLeft: Platform.select({ ios: 16, android: 0 }),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderDark: {
    color: '#8E8E93',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: Platform.select({ ios: '#1C1C1E', android: '#1E1E1E' }),
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginVertical: 8,
  },
  statDividerDark: {
    backgroundColor: '#38383A',
  },
  statValue: {
    fontSize: 34,
    fontWeight: '700',
    color: Platform.select({ ios: '#007AFF', android: '#6200EE' }),
  },
  statValueDark: {
    color: Platform.select({ ios: '#0A84FF', android: '#BB86FC' }),
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  menuItemDark: {},
  menuItemPressed: {
    backgroundColor: '#E5E5EA',
  },
  menuItemPressedDark: {
    backgroundColor: '#2C2C2E',
  },
  menuItemText: {
    fontSize: 17,
    color: '#000000',
  },
  menuItemIcon: {
    fontSize: 18,
  },
  destructiveText: {
    color: Platform.select({ ios: '#FF3B30', android: '#CF6679' }),
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginLeft: 16,
  },
  separatorDark: {
    backgroundColor: '#38383A',
  },
  chevron: {
    fontSize: 22,
    color: '#C7C7CC',
  },
  chevronDark: {
    color: '#48484A',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: Platform.select({ ios: '#E3F2FD', android: '#E8EAF6' }),
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoCardDark: {
    backgroundColor: Platform.select({ ios: '#1E3A5F', android: '#1A237E' }),
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Platform.select({ ios: '#1565C0', android: '#3F51B5' }),
    lineHeight: 20,
  },
  infoTextDark: {
    color: Platform.select({ ios: '#64B5F6', android: '#9FA8DA' }),
  },
  footer: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 32,
    marginHorizontal: 16,
  },
  footerDark: {
    color: '#636366',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#8E8E93',
  },
});

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

// iOS Native UI Components
import {
  Host,
  Form,
  Section,
  Text as SwiftUIText,
  HStack,
  Button,
  LabeledContent,
} from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';

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

  // iOS: Native SwiftUI Form
  if (Platform.OS === 'ios') {
    return (
      <Host matchContents={false} style={styles.container}>
        <Form>
          <Section title="Statistics">
            <LabeledContent label="Servers">
              <SwiftUIText modifiers={[foregroundStyle('secondary')]}>
                {servers.length}
              </SwiftUIText>
            </LabeledContent>
            <LabeledContent label="Sessions">
              <SwiftUIText modifiers={[foregroundStyle('secondary')]}>
                {sessions.length}
              </SwiftUIText>
            </LabeledContent>
          </Section>

          <Section title="Data">
            <Button label="Refresh Servers" systemImage="arrow.clockwise" onPress={handleRefresh} />
            <Button label="Clear Session History" systemImage="trash" role="destructive" onPress={handleClearSessions} />
          </Section>

          <Section title="Resources">
            <Button label="ternssh Documentation" systemImage="book" onPress={handleOpenDocs} />
            <Button label="GitHub Repository" systemImage="chevron.left.forwardslash.chevron.right" onPress={handleOpenGitHub} />
          </Section>

          <Section title="About">
            <LabeledContent label="App">
              <SwiftUIText modifiers={[foregroundStyle('secondary')]}>
                ternssh Mobile
              </SwiftUIText>
            </LabeledContent>
            <LabeledContent label="Version">
              <SwiftUIText modifiers={[foregroundStyle('secondary')]}>
                {Constants.expoConfig?.version ?? '1.0.0'}
              </SwiftUIText>
            </LabeledContent>
          </Section>

          <Section footer="ternssh is licensed under GPL-3.0-or-later">
            <LabeledContent label="Terminal">
              <SwiftUIText modifiers={[font({ textStyle: 'caption' }), foregroundStyle('secondary')]}>
                xterm.js WebView
              </SwiftUIText>
            </LabeledContent>
          </Section>
        </Form>
      </Host>
    );
  }

  // Android: Material Design
  return (
    <ScrollView 
      style={[styles.scrollContainer, isDark && styles.containerDark]} 
      contentContainerStyle={styles.content}
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
            style={[styles.menuItem, isDark && styles.menuItemDark]}
            android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
            onPress={handleRefresh}
          >
            <Text style={[styles.menuItemText, isDark && styles.textDark]}>Refresh Servers</Text>
            <Text style={styles.menuItemIcon}>🔄</Text>
          </Pressable>
          <View style={[styles.separator, isDark && styles.separatorDark]} />
          <Pressable 
            style={[styles.menuItem, isDark && styles.menuItemDark]}
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
            style={[styles.menuItem, isDark && styles.menuItemDark]}
            android_ripple={{ color: isDark ? '#333' : '#E0E0E0' }}
            onPress={handleOpenDocs}
          >
            <Text style={[styles.menuItemText, isDark && styles.textDark]}>ternssh Documentation</Text>
            <Text style={[styles.chevron, isDark && styles.chevronDark]}>›</Text>
          </Pressable>
          <View style={[styles.separator, isDark && styles.separatorDark]} />
          <Pressable 
            style={[styles.menuItem, isDark && styles.menuItemDark]}
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
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6D6D72',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderDark: {
    color: '#8E8E93',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  statDividerDark: {
    backgroundColor: '#383838',
  },
  statValue: {
    fontSize: 34,
    fontWeight: '700',
    color: '#6200EE',
  },
  statValueDark: {
    color: '#BB86FC',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
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
  menuItemText: {
    fontSize: 17,
    color: '#000000',
  },
  menuItemIcon: {
    fontSize: 18,
  },
  destructiveText: {
    color: '#CF6679',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginLeft: 16,
  },
  separatorDark: {
    backgroundColor: '#383838',
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
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
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

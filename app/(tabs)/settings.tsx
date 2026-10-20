import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useServers } from '../../src/context/ServersContext';

// iOS Native UI Components
import {
  Host,
  Form,
  Section,
  LabeledContent,
  Button,
  Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import {
  foregroundStyle,
  buttonStyle,
} from '@expo/ui/swift-ui/modifiers';

export default function SettingsScreen() {
  const { servers, sessions, refreshServers } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const serverCount = String(servers.length);
  const activeSessionCount = String(sessions.filter(s => s.status === 'open').length);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshServers();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Servers refreshed');
  }, [refreshServers]);

  const handleAbout = useCallback(() => {
    Alert.alert(
      'ternssh Mobile',
      'Version 1.0.0\n\nA native mobile client for ternssh SSH gateway.',
      [{ text: 'OK' }]
    );
  }, []);

  // iOS: Native SwiftUI Form
  if (Platform.OS === 'ios') {
    return (
      <>
        <Stack.Screen options={{ title: 'Settings', headerLargeTitle: true }} />
        <Host matchContents={false} style={styles.container}>
          <Form>
            <Section title="Statistics">
              <LabeledContent label="Servers">
                <SwiftUIText modifiers={[foregroundStyle('secondary')]}>
                  {serverCount}
                </SwiftUIText>
              </LabeledContent>
              <LabeledContent label="Active Sessions">
                <SwiftUIText modifiers={[foregroundStyle('secondary')]}>
                  {activeSessionCount}
                </SwiftUIText>
              </LabeledContent>
            </Section>

            <Section title="Data">
              <Button
                label="Refresh Servers"
                systemImage="arrow.clockwise"
                onPress={handleRefresh}
                modifiers={[buttonStyle('glass')]}
              />
            </Section>

            <Section title="About">
              <Button
                label="About ternssh"
                systemImage="info.circle"
                onPress={handleAbout}
                modifiers={[buttonStyle('glass')]}
              />
              <LabeledContent label="Version">
                <SwiftUIText modifiers={[foregroundStyle('secondary')]}>
                  1.0.0
                </SwiftUIText>
              </LabeledContent>
            </Section>
          </Form>
        </Host>
      </>
    );
  }

  // Android: Material Design with React Native components
  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.content}>
          {/* Statistics Card */}
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>Statistics</Text>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, isDark && styles.textDark]}>Servers</Text>
              <Text style={[styles.rowValue, isDark && styles.textSecondaryDark]}>{serverCount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, isDark && styles.textDark]}>Active Sessions</Text>
              <Text style={[styles.rowValue, isDark && styles.textSecondaryDark]}>{activeSessionCount}</Text>
            </View>
          </View>

          {/* Data Card */}
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>Data</Text>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleRefresh}
            >
              <Text style={styles.buttonText}>Refresh Servers</Text>
            </Pressable>
          </View>

          {/* About Card */}
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>About</Text>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleAbout}
            >
              <Text style={styles.buttonText}>About ternssh</Text>
            </Pressable>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, isDark && styles.textDark]}>Version</Text>
              <Text style={[styles.rowValue, isDark && styles.textSecondaryDark]}>1.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1E1E1E',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: '#000000',
  },
  rowValue: {
    fontSize: 16,
    color: '#666666',
  },
  button: {
    backgroundColor: '#6200EE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#AAAAAA',
  },
});

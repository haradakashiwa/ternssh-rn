import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useServers } from '../src/context/ServersContext';
import { testConnection } from '../src/api/client';
import { getCredential } from '../src/storage/secureStorage';
import type { TernsshServer } from '../src/types';

// iOS Native UI Components
import {
  Host,
  Form,
  Section,
  Button,
  TextField,
  SecureField,
  LabeledContent,
  Text as SwiftUIText,
  HStack,
  Spacer,
  Image,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
} from '@expo/ui/swift-ui/modifiers';

type AuthType = TernsshServer['authType'];
const AUTH_OPTIONS: AuthType[] = ['basic', 'access', 'none'];
const AUTH_LABELS: Record<AuthType, string> = {
  basic: 'Basic Auth',
  access: 'Cloudflare Access',
  none: 'None',
};

export default function EditServerScreen() {
  const router = useRouter();
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { servers, updateServer } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const server = servers.find(s => s.id === serverId);
  
  // iOS native state
  const nameState = useNativeState(server?.name ?? '');
  const urlState = useNativeState(server?.url ?? '');
  const usernameState = useNativeState(server?.username ?? '');
  const passwordState = useNativeState('');
  
  // Shared state
  const [authType, setAuthType] = useState<AuthType>(server?.authType ?? 'basic');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Android state
  const [name, setName] = useState(server?.name ?? '');
  const [url, setUrl] = useState(server?.url ?? '');
  const [username, setUsername] = useState(server?.username ?? '');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (serverId) {
      getCredential(serverId).then(pwd => {
        if (pwd) {
          if (Platform.OS === 'ios') {
            passwordState.set(pwd);
          } else {
            setPassword(pwd);
          }
        }
      });
    }
  }, [serverId]);

  const getName = () => Platform.OS === 'ios' ? nameState.get() : name;
  const getUrl = () => Platform.OS === 'ios' ? urlState.get() : url;
  const getUsername = () => Platform.OS === 'ios' ? usernameState.get() : username;
  const getPassword = () => Platform.OS === 'ios' ? passwordState.get() : password;

  const handleTest = useCallback(async () => {
    const testUrl = getUrl();
    if (!testUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setTesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const result = await testConnection(
        testUrl,
        authType,
        authType === 'basic' ? getUsername() : undefined,
        authType === 'basic' ? getPassword() : undefined
      );

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Connection successful!');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Connection Failed', result.error ?? 'Connection failed');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  }, [authType, url, username, password]);

  const handleSave = useCallback(async () => {
    if (!serverId) return;
    
    const saveName = getName();
    const saveUrl = getUrl();
    const saveUsername = getUsername();
    const savePassword = getPassword();

    if (!saveName.trim()) {
      Alert.alert('Error', 'Please enter a server name');
      return;
    }
    if (!saveUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const serverData = {
        name: saveName.trim(),
        url: saveUrl.trim(),
        authType,
        username: authType === 'basic' ? saveUsername.trim() : undefined,
      };

      await updateServer(serverId, serverData, authType === 'basic' ? savePassword : undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save server');
    } finally {
      setSaving(false);
    }
  }, [serverId, authType, updateServer, router, name, url, username, password]);

  if (!server) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Server' }} />
        <View style={[styles.container, styles.centerContainer]}>
          <Text>Server not found</Text>
        </View>
      </>
    );
  }

  const testButtonLabel = testing ? 'Testing...' : 'Test Connection';
  const saveButtonLabel = saving ? 'Saving...' : 'Save Changes';

  // iOS: Native SwiftUI Form with native TextField/SecureField
  if (Platform.OS === 'ios') {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Server' }} />
        <Host matchContents={false} style={styles.container}>
          <Form>
            <Section header={<SwiftUIText>Server Details</SwiftUIText>}>
              <LabeledContent label="Name">
                <TextField placeholder="My ternssh Server" text={nameState} />
              </LabeledContent>
              <LabeledContent label="URL">
                <TextField placeholder="https://ternssh.example.com" text={urlState} />
              </LabeledContent>
            </Section>

            <Section header={<SwiftUIText>Authentication</SwiftUIText>}>
              {AUTH_OPTIONS.map((opt) => (
                <Button
                  key={opt}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAuthType(opt);
                  }}
                >
                  <HStack>
                    <SwiftUIText>{AUTH_LABELS[opt]}</SwiftUIText>
                    <Spacer />
                    {authType === opt ? (
                      <Image systemName="checkmark" color="#007AFF" />
                    ) : null}
                  </HStack>
                </Button>
              ))}
            </Section>

            {authType === 'basic' ? (
              <Section header={<SwiftUIText>Credentials</SwiftUIText>}>
                <LabeledContent label="Username">
                  <TextField placeholder="admin" text={usernameState} />
                </LabeledContent>
                <LabeledContent label="Password">
                  <SecureField placeholder="Password" text={passwordState} />
                </LabeledContent>
              </Section>
            ) : null}

            <Section>
              <Button 
                label={testButtonLabel}
                systemImage="network"
                onPress={handleTest}
                modifiers={[buttonStyle('glass')]}
              />
              <Button 
                label={saveButtonLabel}
                systemImage="checkmark.circle"
                onPress={handleSave}
                modifiers={[buttonStyle('glassProminent')]}
              />
            </Section>
          </Form>
        </Host>
      </>
    );
  }

  // Android: Material Design with React Native components
  return (
    <>
      <Stack.Screen options={{ title: 'Edit Server' }} />
      <ScrollView 
        style={[styles.container, isDark && styles.containerDark]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Server Details Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>Server Details</Text>
          <View style={styles.divider} />
          
          <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>Name</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="My ternssh Server"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={name}
            onChangeText={setName}
          />
          
          <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>URL</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="https://ternssh.example.com"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={url}
            onChangeText={setUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Authentication Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>Authentication</Text>
          <View style={styles.divider} />
          
          {AUTH_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              style={({ pressed }) => [
                styles.radioRow,
                pressed && styles.radioRowPressed,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setAuthType(opt);
              }}
            >
              <View style={[styles.radio, authType === opt && styles.radioSelected]}>
                {authType === opt ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={[styles.radioLabel, isDark && styles.textDark]}>{AUTH_LABELS[opt]}</Text>
            </Pressable>
          ))}
        </View>

        {/* Credentials Card */}
        {authType === 'basic' ? (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>Credentials</Text>
            <View style={styles.divider} />
            
            <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>Username</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="admin"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            
            <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>Password</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Password"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={handleTest}
            disabled={testing}
          >
            <Text style={styles.secondaryButtonText}>{testButtonLabel}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>{saveButtonLabel}</Text>
          </Pressable>
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
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  inputDark: {
    backgroundColor: '#2C2C2C',
    color: '#FFFFFF',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioRowPressed: {
    opacity: 0.7,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6200EE',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#6200EE',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6200EE',
  },
  radioLabel: {
    fontSize: 16,
    color: '#000000',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#6200EE',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E8EAF6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6200EE',
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

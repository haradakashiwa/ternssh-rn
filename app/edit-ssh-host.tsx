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
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useServers } from '../src/context/ServersContext';
import type { SSHHost } from '../src/types';

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

type AuthType = 'password' | 'privateKey';
const AUTH_OPTIONS: AuthType[] = ['password', 'privateKey'];
const AUTH_LABELS: Record<AuthType, string> = {
  password: 'Password',
  privateKey: 'Private Key',
};

export default function EditSSHHostScreen() {
  const router = useRouter();
  const { serverId, hostId } = useLocalSearchParams<{ serverId: string; hostId: string }>();
  const { getApiClient } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const apiClient = serverId ? getApiClient(serverId) : null;
  
  const [loading, setLoading] = useState(true);
  const [hostData, setHostData] = useState<SSHHost | null>(null);
  
  // iOS native state
  const nameState = useNativeState('');
  const hostState = useNativeState('');
  const portState = useNativeState('22');
  const usernameState = useNativeState('');
  const passwordState = useNativeState('');
  const privateKeyState = useNativeState('');
  
  // Shared state
  const [authType, setAuthType] = useState<AuthType>('password');
  const [saving, setSaving] = useState(false);
  
  // Android state
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    const loadHost = async () => {
      if (!apiClient || !hostId) return;
      
      try {
        const response = await apiClient.getServerTree();
        const findHost = (nodes: any[]): SSHHost | null => {
          for (const node of nodes) {
            if (node.type === 'server' && node.id === hostId) {
              return node;
            }
            if (node.type === 'group' && node.children) {
              const found = findHost(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const found = findHost(response.tree);
        if (found) {
          setHostData(found);
          if (Platform.OS === 'ios') {
            nameState.set(found.name);
            hostState.set(found.host);
            portState.set(String(found.port));
            usernameState.set(found.username);
          } else {
            setName(found.name);
            setHost(found.host);
            setPort(String(found.port));
            setUsername(found.username);
          }
          setAuthType(found.auth_type === 'private_key' ? 'privateKey' : 'password');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load host');
      } finally {
        setLoading(false);
      }
    };
    
    loadHost();
  }, [apiClient, hostId]);

  const getName = () => Platform.OS === 'ios' ? nameState.get() : name;
  const getHost = () => Platform.OS === 'ios' ? hostState.get() : host;
  const getPort = () => Platform.OS === 'ios' ? portState.get() : port;
  const getUsername = () => Platform.OS === 'ios' ? usernameState.get() : username;
  const getPassword = () => Platform.OS === 'ios' ? passwordState.get() : password;
  const getPrivateKey = () => Platform.OS === 'ios' ? privateKeyState.get() : privateKey;

  const handleSave = useCallback(async () => {
    if (!apiClient || !hostId) return;
    
    const saveName = getName();
    const saveHost = getHost();
    const savePort = getPort();
    const saveUsername = getUsername();
    const savePassword = getPassword();
    const savePrivateKey = getPrivateKey();

    if (!saveName.trim()) {
      Alert.alert('Error', 'Please enter a host name');
      return;
    }
    if (!saveHost.trim()) {
      Alert.alert('Error', 'Please enter a hostname or IP');
      return;
    }
    if (!saveUsername.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await apiClient.updateSSHHost(hostId, {
        name: saveName.trim(),
        host: saveHost.trim(),
        port: parseInt(savePort, 10) || 22,
        username: saveUsername.trim(),
        auth_type: authType === 'privateKey' ? 'private_key' : authType,
        credential: authType === 'password' ? savePassword : savePrivateKey,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save host');
    } finally {
      setSaving(false);
    }
  }, [apiClient, hostId, authType, router, name, host, port, username, password, privateKey]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit SSH Host' }} />
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!hostData) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit SSH Host' }} />
        <View style={[styles.container, styles.centerContainer]}>
          <Text>Host not found</Text>
        </View>
      </>
    );
  }

  const saveButtonLabel = saving ? 'Saving...' : 'Save Changes';

  // iOS: Native SwiftUI Form
  if (Platform.OS === 'ios') {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit SSH Host' }} />
        <Host matchContents={false} style={styles.container}>
          <Form>
            <Section header={<SwiftUIText>Host Details</SwiftUIText>}>
              <LabeledContent label="Name">
                <TextField placeholder="My Server" text={nameState} />
              </LabeledContent>
              <LabeledContent label="Host">
                <TextField placeholder="192.168.1.100" text={hostState} />
              </LabeledContent>
              <LabeledContent label="Port">
                <TextField placeholder="22" text={portState} />
              </LabeledContent>
              <LabeledContent label="Username">
                <TextField placeholder="root" text={usernameState} />
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

            {authType === 'password' ? (
              <Section
                header={<SwiftUIText>Password</SwiftUIText>}
                footer={<SwiftUIText>Leave blank to keep existing password</SwiftUIText>}
              >
                <LabeledContent label="Password">
                  <SecureField placeholder="Password" text={passwordState} />
                </LabeledContent>
              </Section>
            ) : null}

            {authType === 'privateKey' ? (
              <Section
                header={<SwiftUIText>Private Key</SwiftUIText>}
                footer={<SwiftUIText>Leave blank to keep existing key</SwiftUIText>}
              >
                <LabeledContent label="Private Key">
                  <TextField 
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" 
                    text={privateKeyState}
                    axis="vertical"
                  />
                </LabeledContent>
              </Section>
            ) : null}

            <Section>
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
      <Stack.Screen options={{ title: 'Edit SSH Host' }} />
      <ScrollView 
        style={[styles.container, isDark && styles.containerDark]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Host Details Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>Host Details</Text>
          <View style={styles.divider} />
          
          <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>Name</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="My Server"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={name}
            onChangeText={setName}
          />
          
          <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>Host</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="192.168.1.100"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={host}
            onChangeText={setHost}
            autoCapitalize="none"
          />
          
          <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>Port</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="22"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={port}
            onChangeText={setPort}
            keyboardType="number-pad"
          />
          
          <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>Username</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="root"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={username}
            onChangeText={setUsername}
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

        {/* Password Card */}
        {authType === 'password' ? (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>Password</Text>
            <Text style={[styles.cardSubtitle, isDark && styles.textSecondaryDark]}>
              Leave blank to keep existing password
            </Text>
            <View style={styles.divider} />
            
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

        {/* Private Key Card */}
        {authType === 'privateKey' ? (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>Private Key</Text>
            <Text style={[styles.cardSubtitle, isDark && styles.textSecondaryDark]}>
              Leave blank to keep existing key
            </Text>
            <View style={styles.divider} />
            
            <TextInput
              style={[styles.input, styles.multilineInput, isDark && styles.inputDark]}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={privateKey}
              onChangeText={setPrivateKey}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        ) : null}

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>{saveButtonLabel}</Text>
        </Pressable>
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666666',
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
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
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
  primaryButton: {
    backgroundColor: '#6200EE',
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
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#AAAAAA',
  },
});

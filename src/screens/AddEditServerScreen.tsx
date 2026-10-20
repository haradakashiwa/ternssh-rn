import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Symbols from 'expo-symbols';
import { useServers } from '../context/ServersContext';
import { testConnection } from '../api/client';
import { getCredential } from '../storage/secureStorage';
import type { RootStackScreenProps } from '../navigation/types';
import type { TernsshServer } from '../types';

// iOS Native UI Components
import {
  Host,
  Form,
  Section,
  Button,
} from '@expo/ui/swift-ui';

type AuthType = TernsshServer['authType'];
const AUTH_OPTIONS: AuthType[] = ['basic', 'access', 'none'];
const AUTH_LABELS = ['Basic Auth', 'Cloudflare Access', 'None'];

interface AddServerScreenProps extends RootStackScreenProps<'AddServer'> {}
interface EditServerScreenProps extends RootStackScreenProps<'EditServer'> {}

export function AddServerScreen({ navigation }: AddServerScreenProps) {
  return <ServerForm mode="add" navigation={navigation} />;
}

export function EditServerScreen({ navigation, route }: EditServerScreenProps) {
  return (
    <ServerForm 
      mode="edit" 
      serverId={route.params.serverId} 
      navigation={navigation} 
    />
  );
}

interface ServerFormProps {
  mode: 'add' | 'edit';
  serverId?: string;
  navigation: AddServerScreenProps['navigation'] | EditServerScreenProps['navigation'];
}

function ServerForm({ mode, serverId, navigation }: ServerFormProps) {
  const { servers, addServer, updateServer } = useServers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [authType, setAuthType] = useState<AuthType>('basic');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && serverId) {
      const server = servers.find(s => s.id === serverId);
      if (server) {
        setName(server.name);
        setUrl(server.url);
        setAuthType(server.authType);
        setUsername(server.username ?? '');
        getCredential(serverId).then(pwd => {
          if (pwd) setPassword(pwd);
        });
      }
    }
  }, [mode, serverId, servers]);

  const handleTest = useCallback(async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setTesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const result = await testConnection(
        url,
        authType,
        authType === 'basic' ? username : undefined,
        authType === 'basic' ? password : undefined
      );

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Connection successful!');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        let message = result.error ?? 'Connection failed';
        if (result.authMode === 'onboarding') {
          message = 'This server needs initial setup. Please complete setup in a web browser first.';
        } else if (result.authMode === 'basic' && authType !== 'basic') {
          message = 'This server requires Basic Authentication. Please select "Basic Auth" and provide credentials.';
        }
        Alert.alert('Connection Failed', message);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  }, [url, authType, username, password]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a server name');
      return;
    }
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }
    if (authType === 'basic' && !username.trim()) {
      Alert.alert('Error', 'Please enter a username for Basic Auth');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const serverData = {
        name: name.trim(),
        url: url.trim(),
        authType,
        username: authType === 'basic' ? username.trim() : undefined,
      };

      if (mode === 'add') {
        await addServer(serverData, authType === 'basic' ? password : undefined);
      } else if (serverId) {
        await updateServer(serverId, serverData, authType === 'basic' ? password : undefined);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save server');
    } finally {
      setSaving(false);
    }
  }, [mode, serverId, name, url, authType, username, password, addServer, updateServer, navigation]);

  // iOS: Native SwiftUI Form with RN TextInputs
  if (Platform.OS === 'ios') {
    return (
      <Host matchContents={false} style={styles.container}>
        <Form>
          <Section title="Server Details" footer="The URL of your ternssh deployment">
            <View style={styles.iosFormRow}>
              <Text style={styles.iosLabel}>Name</Text>
              <TextInput
                style={styles.iosInput}
                value={name}
                onChangeText={setName}
                placeholder="My ternssh Server"
                placeholderTextColor="#8E8E93"
              />
            </View>
            <View style={styles.iosFormRow}>
              <Text style={styles.iosLabel}>URL</Text>
              <TextInput
                style={styles.iosInput}
                value={url}
                onChangeText={setUrl}
                placeholder="https://ternssh.example.com"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </Section>

          <Section 
            title="Authentication" 
            footer={
              authType === 'basic' ? 'Enter the username and password for your ternssh deployment.' :
              authType === 'access' ? 'Cloudflare Access authentication will be handled by the system.' :
              'No authentication required (not recommended for production).'
            }
          >
            {AUTH_OPTIONS.map((opt, i) => (
              <Pressable
                key={opt}
                style={styles.iosFormRow}
                onPress={() => {
                  Haptics.selectionAsync();
                  setAuthType(opt);
                }}
              >
                <Text style={styles.iosLabel}>{AUTH_LABELS[i]}</Text>
                {authType === opt && (
                  <Symbols.SymbolView
                    name="checkmark"
                    style={{ width: 18, height: 18 }}
                    tintColor="#007AFF"
                    weight="semibold"
                  />
                )}
              </Pressable>
            ))}
          </Section>

          {authType === 'basic' && (
            <Section title="Credentials" footer="Password is stored securely on device using the system keychain.">
              <View style={styles.iosFormRow}>
                <Text style={styles.iosLabel}>Username</Text>
                <TextInput
                  style={styles.iosInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="admin"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.iosFormRow}>
                <Text style={styles.iosLabel}>Password</Text>
                <TextInput
                  style={styles.iosInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry
                />
              </View>
            </Section>
          )}

          <Section>
            <Button 
              label={testing ? "Testing..." : "Test Connection"} 
              onPress={handleTest}
            />
            <Button 
              label={saving ? "Saving..." : (mode === 'add' ? 'Add Server' : 'Save Changes')}
              onPress={handleSave}
            />
          </Section>
        </Form>
      </Host>
    );
  }

  // Android: Material Design
  return (
    <KeyboardAvoidingView 
      behavior={undefined}
      style={[styles.container, isDark && styles.containerDark]}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Server Details Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>SERVER DETAILS</Text>
          <View style={[styles.formGroup, isDark && styles.formGroupDark]}>
            <View style={styles.formRow}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Name</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={name}
                onChangeText={setName}
                placeholder="My ternssh Server"
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
              />
            </View>
            <View style={[styles.separator, isDark && styles.separatorDark]} />
            <View style={styles.formRow}>
              <Text style={[styles.label, isDark && styles.labelDark]}>URL</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={url}
                onChangeText={setUrl}
                placeholder="https://ternssh.example.com"
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          </View>
        </View>

        {/* Authentication Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>AUTHENTICATION</Text>
          <View style={[styles.formGroup, isDark && styles.formGroupDark]}>
            {AUTH_OPTIONS.map((opt, i) => (
              <React.Fragment key={opt}>
                {i > 0 && <View style={[styles.separator, isDark && styles.separatorDark]} />}
                <Pressable
                  style={styles.radioRow}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAuthType(opt);
                  }}
                >
                  <Text style={[styles.radioLabel, isDark && styles.labelDark]}>{AUTH_LABELS[i]}</Text>
                  <View style={[styles.radio, authType === opt && styles.radioSelected]} />
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Credentials Section (Basic Auth only) */}
        {authType === 'basic' && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>CREDENTIALS</Text>
            <View style={[styles.formGroup, isDark && styles.formGroupDark]}>
              <View style={styles.formRow}>
                <Text style={[styles.label, isDark && styles.labelDark]}>Username</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="admin"
                  placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={[styles.separator, isDark && styles.separatorDark]} />
              <View style={styles.formRow}>
                <Text style={[styles.label, isDark && styles.labelDark]}>Password</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.buttonSection}>
          <Pressable
            style={({ pressed }) => [styles.button, styles.testButton, isDark && styles.testButtonDark, pressed && styles.buttonPressed]}
            onPress={handleTest}
            disabled={testing || saving}
          >
            {testing ? (
              <ActivityIndicator color={isDark ? '#BB86FC' : '#6200EE'} />
            ) : (
              <Text style={[styles.testButtonText, isDark && styles.testButtonTextDark]}>Test Connection</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, styles.saveButton, pressed && styles.saveButtonPressed]}
            onPress={handleSave}
            disabled={testing || saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {mode === 'add' ? 'Add Server' : 'Save Changes'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
  formGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  formGroupDark: {
    backgroundColor: '#1E1E1E',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginLeft: 16,
  },
  separatorDark: {
    backgroundColor: '#383838',
  },
  label: {
    fontSize: 17,
    color: '#000000',
    width: 100,
  },
  labelDark: {
    color: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    textAlign: 'right',
  },
  inputDark: {
    color: '#FFFFFF',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  radioLabel: {
    fontSize: 17,
    color: '#000000',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#6200EE',
  },
  radioSelected: {
    backgroundColor: '#6200EE',
  },
  buttonSection: {
    marginTop: 32,
    marginHorizontal: 16,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  testButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6200EE',
    elevation: 2,
  },
  testButtonDark: {
    backgroundColor: '#1E1E1E',
  },
  testButtonText: {
    color: '#6200EE',
    fontSize: 17,
    fontWeight: '600',
  },
  testButtonTextDark: {
    color: '#BB86FC',
  },
  saveButton: {
    backgroundColor: '#6200EE',
    elevation: 2,
  },
  saveButtonPressed: {
    backgroundColor: '#3700B3',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  // iOS native form styles
  iosFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    minHeight: 44,
  },
  iosLabel: {
    fontSize: 17,
    color: '#000000',
  },
  iosInput: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    textAlign: 'right',
    marginLeft: 16,
  },
});

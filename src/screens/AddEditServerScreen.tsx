import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as Haptics from 'expo-haptics';
import { useServers } from '../context/ServersContext';
import { testConnection } from '../api/client';
import { getCredential } from '../storage/secureStorage';
import type { RootStackScreenProps } from '../navigation/types';
import type { TernsshServer } from '../types';

type AuthType = TernsshServer['authType'];
const AUTH_OPTIONS: AuthType[] = ['basic', 'access', 'none'];
const AUTH_LABELS = ['Basic Auth', 'CF Access', 'None'];

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

  const selectedAuthIndex = AUTH_OPTIONS.indexOf(authType);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, isDark && styles.containerDark]}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Server Details Section */}
        <View style={styles.section}>
          {Platform.OS === 'ios' && (
            <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>SERVER DETAILS</Text>
          )}
          <View style={[styles.formGroup, isDark && styles.formGroupDark]}>
            <View style={[styles.formRow, isDark && styles.formRowDark]}>
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
            <View style={[styles.formRow, isDark && styles.formRowDark]}>
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
          <Text style={[styles.footer, isDark && styles.footerDark]}>
            The URL of your ternssh deployment
          </Text>
        </View>

        {/* Authentication Section */}
        <View style={styles.section}>
          {Platform.OS === 'ios' && (
            <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>AUTHENTICATION</Text>
          )}
          <View style={[styles.formGroup, isDark && styles.formGroupDark, styles.segmentContainer]}>
            <SegmentedControl
              values={AUTH_LABELS}
              selectedIndex={selectedAuthIndex}
              onChange={(event) => {
                Haptics.selectionAsync();
                setAuthType(AUTH_OPTIONS[event.nativeEvent.selectedSegmentIndex]);
              }}
              style={styles.segmentedControl}
              appearance={isDark ? 'dark' : 'light'}
            />
          </View>
          <Text style={[styles.footer, isDark && styles.footerDark]}>
            {authType === 'basic' && 'Enter the username and password for your ternssh deployment.'}
            {authType === 'access' && 'Cloudflare Access authentication will be handled by the system.'}
            {authType === 'none' && 'No authentication required (not recommended for production).'}
          </Text>
        </View>

        {/* Credentials Section (Basic Auth only) */}
        {authType === 'basic' && (
          <View style={styles.section}>
            {Platform.OS === 'ios' && (
              <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>CREDENTIALS</Text>
            )}
            <View style={[styles.formGroup, isDark && styles.formGroupDark]}>
              <View style={[styles.formRow, isDark && styles.formRowDark]}>
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
              <View style={[styles.formRow, isDark && styles.formRowDark]}>
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
            <Text style={[styles.footer, isDark && styles.footerDark]}>
              Password is stored securely on device using the system keychain.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.buttonSection}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.testButton,
              isDark && styles.testButtonDark,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleTest}
            disabled={testing || saving}
          >
            {testing ? (
              <ActivityIndicator color={isDark ? '#0A84FF' : '#007AFF'} />
            ) : (
              <Text style={[styles.testButtonText, isDark && styles.testButtonTextDark]}>Test Connection</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.saveButton,
              pressed && styles.saveButtonPressed,
            ]}
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
    backgroundColor: Platform.select({ ios: '#F2F2F7', android: '#FAFAFA' }),
  },
  containerDark: {
    backgroundColor: Platform.select({ ios: '#000000', android: '#121212' }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: Platform.select({ ios: 24, android: 16 }),
    marginHorizontal: Platform.select({ ios: 16, android: 16 }),
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6D6D72',
    marginBottom: 8,
    marginLeft: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderDark: {
    color: '#8E8E93',
  },
  formGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  formGroupDark: {
    backgroundColor: Platform.select({ ios: '#1C1C1E', android: '#1E1E1E' }),
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  formRowDark: {},
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginLeft: 16,
  },
  separatorDark: {
    backgroundColor: '#38383A',
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
  footer: {
    fontSize: 13,
    color: '#6D6D72',
    marginTop: 8,
    marginHorizontal: 16,
    lineHeight: 18,
  },
  footerDark: {
    color: '#8E8E93',
  },
  segmentContainer: {
    padding: 12,
  },
  segmentedControl: {
    height: 32,
  },
  buttonSection: {
    marginTop: 32,
    marginHorizontal: 16,
    gap: 12,
  },
  button: {
    borderRadius: Platform.select({ ios: 10, android: 8 }),
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
    borderWidth: Platform.select({ ios: 0, android: 1 }),
    borderColor: Platform.select({ ios: undefined, android: '#6200EE' }),
  },
  testButtonDark: {
    backgroundColor: '#1C1C1E',
  },
  testButtonText: {
    color: Platform.select({ ios: '#007AFF', android: '#6200EE' }),
    fontSize: 17,
    fontWeight: '600',
  },
  testButtonTextDark: {
    color: '#0A84FF',
  },
  saveButton: {
    backgroundColor: Platform.select({ ios: '#007AFF', android: '#6200EE' }),
  },
  saveButtonPressed: {
    backgroundColor: Platform.select({ ios: '#0056B3', android: '#3700B3' }),
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

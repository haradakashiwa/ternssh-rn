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
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as Haptics from 'expo-haptics';
import { useServers } from '../context/ServersContext';
import type { RootStackScreenProps } from '../navigation/types';
import type { TreeNode, SSHHost } from '../types';

type AuthType = 'password' | 'private_key';
const AUTH_OPTIONS: AuthType[] = ['password', 'private_key'];
const AUTH_LABELS = ['Password', 'Private Key'];

interface AddSSHHostScreenProps extends RootStackScreenProps<'AddSSHHost'> {}
interface EditSSHHostScreenProps extends RootStackScreenProps<'EditSSHHost'> {}

export function AddSSHHostScreen({ navigation, route }: AddSSHHostScreenProps) {
  const { serverId } = route.params;
  return <SSHHostForm mode="add" serverId={serverId} navigation={navigation} />;
}

export function EditSSHHostScreen({ navigation, route }: EditSSHHostScreenProps) {
  const { serverId, hostId } = route.params;
  return (
    <SSHHostForm 
      mode="edit" 
      serverId={serverId}
      hostId={hostId}
      navigation={navigation} 
    />
  );
}

interface SSHHostFormProps {
  mode: 'add' | 'edit';
  serverId: string;
  hostId?: string;
  navigation: AddSSHHostScreenProps['navigation'] | EditSSHHostScreenProps['navigation'];
}

function findHost(nodes: TreeNode[], hostId: string): SSHHost | null {
  for (const node of nodes) {
    if (node.type === 'server' && node.id === hostId) {
      return node;
    }
    if (node.type === 'group') {
      const found = findHost(node.children, hostId);
      if (found) return found;
    }
  }
  return null;
}

function SSHHostForm({ mode, serverId, hostId, navigation }: SSHHostFormProps) {
  const { getApiClient } = useServers();
  const apiClient = getApiClient(serverId);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [authType, setAuthType] = useState<AuthType>('password');
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && hostId && apiClient) {
      apiClient.getServerTree().then(response => {
        const foundHost = findHost(response.tree, hostId);
        if (foundHost) {
          setName(foundHost.name);
          setHost(foundHost.host);
          setPort(String(foundHost.port));
          setUsername(foundHost.username);
          setAuthType(foundHost.auth_type);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
        Alert.alert('Error', 'Failed to load host details');
      });
    }
  }, [mode, hostId, apiClient]);

  const handleSave = useCallback(async () => {
    if (!apiClient) {
      Alert.alert('Error', 'API client not available');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a host');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      Alert.alert('Error', 'Please enter a valid port (1-65535)');
      return;
    }
    if (mode === 'add' && !credential.trim()) {
      Alert.alert('Error', `Please enter a ${authType === 'password' ? 'password' : 'private key'}`);
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (mode === 'add') {
        await apiClient.createSSHHost({
          name: name.trim(),
          host: host.trim(),
          port: portNum,
          username: username.trim(),
          auth_type: authType,
          credential: credential.trim(),
        });
      } else if (hostId) {
        await apiClient.updateSSHHost(hostId, {
          name: name.trim(),
          host: host.trim(),
          port: portNum,
          username: username.trim(),
          auth_type: authType,
          ...(credential.trim() ? { credential: credential.trim() } : {}),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save host');
    } finally {
      setSaving(false);
    }
  }, [mode, hostId, apiClient, name, host, port, username, authType, credential, navigation]);

  const selectedAuthIndex = AUTH_OPTIONS.indexOf(authType);

  if (loading) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={Platform.OS === 'ios' ? '#007AFF' : '#6200EE'} />
      </View>
    );
  }

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
        {/* Host Details Section */}
        <View style={styles.section}>
          {Platform.OS === 'ios' && (
            <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>HOST DETAILS</Text>
          )}
          <View style={[styles.formGroup, isDark && styles.formGroupDark]}>
            <View style={[styles.formRow, isDark && styles.formRowDark]}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Name</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={name}
                onChangeText={setName}
                placeholder="Production Server"
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
              />
            </View>
            <View style={[styles.separator, isDark && styles.separatorDark]} />
            <View style={[styles.formRow, isDark && styles.formRowDark]}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Host</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={host}
                onChangeText={setHost}
                placeholder="192.168.1.100"
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <View style={[styles.separator, isDark && styles.separatorDark]} />
            <View style={[styles.formRow, isDark && styles.formRowDark]}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Port</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={port}
                onChangeText={setPort}
                placeholder="22"
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.separator, isDark && styles.separatorDark]} />
            <View style={[styles.formRow, isDark && styles.formRowDark]}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Username</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={username}
                onChangeText={setUsername}
                placeholder="root"
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
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
        </View>

        {/* Credential Section */}
        <View style={styles.section}>
          {Platform.OS === 'ios' && (
            <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>
              {authType === 'password' ? 'PASSWORD' : 'PRIVATE KEY'}
            </Text>
          )}
          <View style={[styles.formGroup, isDark && styles.formGroupDark]}>
            {authType === 'password' ? (
              <View style={[styles.formRow, isDark && styles.formRowDark]}>
                <TextInput
                  style={[styles.inputFull, isDark && styles.inputDark]}
                  value={credential}
                  onChangeText={setCredential}
                  placeholder="Enter password"
                  placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                  secureTextEntry
                />
              </View>
            ) : (
              <TextInput
                style={[styles.multilineInput, isDark && styles.inputDark]}
                value={credential}
                onChangeText={setCredential}
                placeholder="Paste your private key here..."
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            )}
          </View>
          {mode === 'edit' && (
            <Text style={[styles.footer, isDark && styles.footerDark]}>
              Leave empty to keep the existing {authType === 'password' ? 'password' : 'key'}
            </Text>
          )}
        </View>

        {/* Save Button */}
        <View style={styles.buttonSection}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.saveButton,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {mode === 'add' ? 'Add SSH Host' : 'Save Changes'}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 90,
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
  inputFull: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
  },
  inputDark: {
    color: '#FFFFFF',
  },
  multilineInput: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    color: '#000000',
    padding: 16,
    minHeight: 140,
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
  },
  button: {
    borderRadius: Platform.select({ ios: 10, android: 8 }),
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
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

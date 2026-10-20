import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ServersProvider } from '../src/context/ServersContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaProvider>
      <ServersProvider>
        <Stack
          screenOptions={{
            headerLargeTitle: Platform.OS === 'ios',
            headerLargeTitleShadowVisible: false,
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="add-server"
            options={{
              title: 'Add Server',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.85, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="edit-server"
            options={{
              title: 'Edit Server',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.85, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="ssh-hosts"
            options={{
              title: 'SSH Hosts',
              headerLargeTitle: Platform.OS === 'ios',
            }}
          />
          <Stack.Screen
            name="add-ssh-host"
            options={{
              title: 'Add SSH Host',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.9, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="edit-ssh-host"
            options={{
              title: 'Edit SSH Host',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.9, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="terminal"
            options={{
              title: 'Terminal',
              headerLargeTitle: false,
              headerStyle: {
                backgroundColor: '#1e1e1e',
              },
              headerTitleStyle: {
                color: '#FFFFFF',
              },
              headerTintColor: Platform.OS === 'ios' ? '#0A84FF' : '#BB86FC',
              contentStyle: {
                backgroundColor: '#1e1e1e',
              },
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ServersProvider>
    </SafeAreaProvider>
  );
}

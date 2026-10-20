import React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Symbols from 'expo-symbols';

import { ServersScreen } from '../screens/ServersScreen';
import { SessionsScreen } from '../screens/SessionsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AddServerScreen, EditServerScreen } from '../screens/AddEditServerScreen';
import { SSHHostsScreen } from '../screens/SSHHostsScreen';
import { AddSSHHostScreen, EditSSHHostScreen } from '../screens/AddEditSSHHostScreen';
import { TerminalScreen } from '../screens/TerminalScreen';
import type { RootStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabBarIcon({ name, focused, color }: { name: 'servers' | 'sessions' | 'settings'; focused: boolean; color: string }) {
  const iconMap = {
    servers: 'server.rack' as const,
    sessions: 'terminal' as const,
    settings: 'gear' as const,
  };

  if (Platform.OS === 'ios') {
    return (
      <Symbols.SymbolView
        name={iconMap[name]}
        style={{ width: 24, height: 24 }}
        tintColor={color}
        weight="medium"
      />
    );
  }

  return null;
}

function MainTabs() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon 
            name={route.name.toLowerCase() as 'servers' | 'sessions' | 'settings'} 
            focused={focused}
            color={color}
          />
        ),
        headerLargeTitle: Platform.OS === 'ios',
        headerLargeTitleShadowVisible: false,
      })}
    >
      <Tab.Screen
        name="Servers"
        component={ServersScreen}
        options={{ title: 'Servers' }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{ title: 'Sessions' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerLargeTitle: Platform.OS === 'ios',
          headerLargeTitleShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddServer"
          component={AddServerScreen}
          options={{
            title: 'Add Server',
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'card',
            headerLargeTitle: false,
            sheetGrabberVisible: Platform.OS === 'ios',
          }}
        />
        <Stack.Screen
          name="EditServer"
          component={EditServerScreen}
          options={{
            title: 'Edit Server',
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'card',
            headerLargeTitle: false,
            sheetGrabberVisible: Platform.OS === 'ios',
          }}
        />
        <Stack.Screen
          name="SSHHosts"
          component={SSHHostsScreen}
          options={{
            title: 'SSH Hosts',
            headerLargeTitle: Platform.OS === 'ios',
          }}
        />
        <Stack.Screen
          name="AddSSHHost"
          component={AddSSHHostScreen}
          options={{
            title: 'Add SSH Host',
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'card',
            headerLargeTitle: false,
            sheetGrabberVisible: Platform.OS === 'ios',
          }}
        />
        <Stack.Screen
          name="EditSSHHost"
          component={EditSSHHostScreen}
          options={{
            title: 'Edit SSH Host',
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'card',
            headerLargeTitle: false,
            sheetGrabberVisible: Platform.OS === 'ios',
          }}
        />
        <Stack.Screen
          name="Terminal"
          component={TerminalScreen}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

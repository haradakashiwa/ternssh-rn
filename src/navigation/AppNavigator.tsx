import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
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

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Platform.OS === 'ios' ? '#007AFF' : '#6200EE',
    background: Platform.OS === 'ios' ? '#F2F2F7' : '#FAFAFA',
    card: Platform.OS === 'ios' ? 'transparent' : '#FFFFFF',
    text: '#000000',
    border: Platform.OS === 'ios' ? 'transparent' : '#E0E0E0',
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Platform.OS === 'ios' ? '#0A84FF' : '#BB86FC',
    background: Platform.OS === 'ios' ? '#000000' : '#121212',
    card: Platform.OS === 'ios' ? 'transparent' : '#1E1E1E',
    text: '#FFFFFF',
    border: Platform.OS === 'ios' ? 'transparent' : '#2C2C2C',
  },
};

function TabBarIcon({ name, focused }: { name: 'servers' | 'sessions' | 'settings'; focused: boolean }) {
  const iconMap = {
    servers: 'server.rack',
    sessions: 'terminal',
    settings: 'gear',
  };

  if (Platform.OS === 'ios' && Symbols.SymbolView) {
    return (
      <Symbols.SymbolView
        name={iconMap[name] as Symbols.SFSymbol}
        style={{ width: 24, height: 24 }}
        tintColor={focused ? '#007AFF' : '#8E8E93'}
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
        tabBarIcon: ({ focused }) => (
          <TabBarIcon 
            name={route.name.toLowerCase() as 'servers' | 'sessions' | 'settings'} 
            focused={focused} 
          />
        ),
        tabBarActiveTintColor: Platform.select({
          ios: isDark ? '#0A84FF' : '#007AFF',
          android: isDark ? '#BB86FC' : '#6200EE',
        }),
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          },
          android: {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            elevation: 8,
          },
        }),
        headerLargeTitle: Platform.OS === 'ios',
        headerLargeTitleShadowVisible: false,
        headerTransparent: Platform.OS === 'ios',
        headerBlurEffect: Platform.OS === 'ios' ? (isDark ? 'systemMaterialDark' : 'systemMaterial') : undefined,
        headerStyle: Platform.select({
          ios: {
            backgroundColor: 'transparent',
          },
          android: {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            elevation: 0,
          },
        }),
        headerTintColor: Platform.select({
          ios: isDark ? '#0A84FF' : '#007AFF',
          android: isDark ? '#BB86FC' : '#6200EE',
        }),
      })}
    >
      <Tab.Screen
        name="Servers"
        component={ServersScreen}
        options={{ 
          title: 'Servers',
          headerSearchBarOptions: Platform.OS === 'ios' ? {
            placeholder: 'Search servers',
          } : undefined,
        }}
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
  const theme = isDark ? CustomDarkTheme : LightTheme;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerLargeTitleShadowVisible: false,
          headerTransparent: Platform.OS === 'ios',
          headerBlurEffect: Platform.OS === 'ios' ? (isDark ? 'systemMaterialDark' : 'systemMaterial') : undefined,
          headerStyle: Platform.select({
            ios: {
              backgroundColor: 'transparent',
            },
            android: {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              elevation: 0,
            },
          }),
          headerTintColor: Platform.select({
            ios: isDark ? '#0A84FF' : '#007AFF',
            android: isDark ? '#BB86FC' : '#6200EE',
          }),
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          contentStyle: {
            backgroundColor: Platform.OS === 'ios' 
              ? (isDark ? '#000000' : '#F2F2F7')
              : (isDark ? '#121212' : '#FAFAFA'),
          },
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
            sheetCornerRadius: Platform.OS === 'ios' ? 20 : undefined,
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
            sheetCornerRadius: Platform.OS === 'ios' ? 20 : undefined,
          }}
        />
        <Stack.Screen
          name="SSHHosts"
          component={SSHHostsScreen}
          options={{
            title: 'SSH Hosts',
            headerLargeTitle: Platform.OS === 'ios',
            headerSearchBarOptions: Platform.OS === 'ios' ? {
              placeholder: 'Search hosts',
            } : undefined,
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
            sheetCornerRadius: Platform.OS === 'ios' ? 20 : undefined,
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
            sheetCornerRadius: Platform.OS === 'ios' ? 20 : undefined,
          }}
        />
        <Stack.Screen
          name="Terminal"
          component={TerminalScreen}
          options={{
            title: 'Terminal',
            headerLargeTitle: false,
            headerTransparent: false,
            headerBlurEffect: undefined,
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

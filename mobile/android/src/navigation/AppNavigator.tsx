import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OverviewScreen, AccountScreen, SettingsScreen, CountryControlScreen, RouteControlScreen } from '../screens';
import { useTheme } from '../theme/ThemeProvider';

export type MainTabParamList = {
  Overview: undefined;
  Account: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  CountryControl: undefined;
  RouteControl: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function MainTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.cyan,
        tabBarInactiveTintColor: theme.colors.mutedDark,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{ title: 'Overview' }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Account' }}
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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="CountryControl"
        component={CountryControlScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RouteControl"
        component={RouteControlScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

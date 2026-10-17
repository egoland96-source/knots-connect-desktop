import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { VpnProvider } from './src/store/VpnContext';
import { TelemetryProvider } from './src/store/TelemetryContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <VpnProvider>
          <TelemetryProvider>
            <NavigationContainer>
              <StatusBar style="light" />
              <AppNavigator />
            </NavigationContainer>
          </TelemetryProvider>
        </VpnProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

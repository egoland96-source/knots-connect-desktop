import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface StatusPillProps {
  label: string;
  variant?: 'on' | 'off' | 'premium';
}

export function StatusPill({ label, variant = 'on' }: StatusPillProps) {
  const { theme } = useTheme();

  const colors = {
    on: { dot: theme.colors.green, text: theme.colors.green },
    off: { dot: theme.colors.muted, text: theme.colors.muted },
    premium: { dot: theme.colors.purple, text: theme.colors.purple },
  };

  const c = colors[variant];

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: c.dot }]} />
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  label: { fontSize: 13, fontWeight: '600' },
});

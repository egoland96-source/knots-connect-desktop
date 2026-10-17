import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface RouteNodeProps {
  label: string;
  active?: boolean;
  connected?: boolean;
}

export function RouteNode({ label, active, connected }: RouteNodeProps) {
  const { theme } = useTheme();

  const borderColor = active ? theme.colors.cyan : theme.colors.borderLight;
  const bgColor = active ? theme.colors.cyan + '12' : theme.colors.surfaceAlt;
  const textColor = active ? theme.colors.cyan : theme.colors.muted;

  return (
    <View style={[styles.node, { borderColor, backgroundColor: bgColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {connected && <View style={[styles.statusDot, { backgroundColor: theme.colors.green }]} />}
    </View>
  );
}

interface RouteLineProps {
  active?: boolean;
  vertical?: boolean;
}

export function RouteLine({ active, vertical }: RouteLineProps) {
  const { theme } = useTheme();
  const color = active ? theme.colors.green : theme.colors.borderLight;

  if (vertical) {
    return <View style={[styles.lineVertical, { backgroundColor: color }]} />;
  }
  return <View style={[styles.lineHorizontal, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  node: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    position: 'relative',
  },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  statusDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#080E14',
  },
  lineHorizontal: { height: 2, flex: 1, borderRadius: 1 },
  lineVertical: { width: 2, height: 24, borderRadius: 1 },
});

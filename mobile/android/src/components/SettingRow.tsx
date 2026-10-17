import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface SettingRowProps {
  label: string;
  sublabel?: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  badge?: string;
  onPress?: () => void;
  showArrow?: boolean;
}

export function SettingRow({
  label,
  sublabel,
  value,
  toggle,
  toggleValue,
  onToggleChange,
  badge,
  onPress,
  showArrow,
}: SettingRowProps) {
  const { theme } = useTheme();

  const content = (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: theme.colors.purple + '22' }]}>
              <Text style={[styles.badgeText, { color: theme.colors.purple }]}>{badge}</Text>
            </View>
          )}
        </View>
        {sublabel && (
          <Text style={[styles.sublabel, { color: theme.colors.muted }]}>{sublabel}</Text>
        )}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          trackColor={{ false: theme.colors.borderLight, true: theme.colors.cyan }}
          thumbColor="#FFFFFF"
        />
      ) : value ? (
        <Text style={[styles.value, { color: theme.colors.muted }]}>{value}</Text>
      ) : showArrow ? (
        <Text style={[styles.arrow, { color: theme.colors.muted }]}>›</Text>
      ) : null}
    </View>
  );

  if (onPress || showArrow) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6} disabled={toggle}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '500' },
  sublabel: { fontSize: 13, marginTop: 2 },
  badge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  value: { fontSize: 14, fontWeight: '500' },
  arrow: { fontSize: 22, fontWeight: '300' },
});

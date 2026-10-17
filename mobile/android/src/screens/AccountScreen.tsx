import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { KnotsCard, SectionLabel, ScreenHeader } from '../components';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Main'>;

export function AccountScreen({ navigation }: { navigation: Nav }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScreenHeader title="Account" subtitle="YOUR IDENTITY" />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Knots ID */}
        <View style={{ paddingHorizontal: 20 }}>
          <KnotsCard style={styles.idCard}>
            <Text style={[styles.idLabel, { color: c.muted }]}>KNOTS ID</Text>
            <Text style={[styles.idValue, { color: c.text }]}>7F3A-91C2-6D84-B0E7</Text>
            <Text style={[styles.idNote, { color: c.mutedDark }]}>Saved on this device</Text>
          </KnotsCard>
        </View>

        {/* Identity section */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionLabel>Identity</SectionLabel>
          <KnotsCard style={styles.sectionCard}>
            <TouchableOpacity style={styles.row} activeOpacity={0.6}>
              <Text style={[styles.rowLabel, { color: c.text }]}>Create new identity</Text>
              <Text style={[styles.arrow, { color: c.muted }]}>›</Text>
            </TouchableOpacity>
            <View style={[styles.rowDivider, { backgroundColor: c.border }]} />
            <TouchableOpacity style={styles.row} activeOpacity={0.6}>
              <Text style={[styles.rowLabel, { color: c.text }]}>Restore identity</Text>
              <Text style={[styles.arrow, { color: c.muted }]}>›</Text>
            </TouchableOpacity>
          </KnotsCard>

          {/* Info card */}
          <View style={[styles.infoCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={styles.infoIcon}>🛡️</Text>
            <Text style={[styles.infoText, { color: c.muted }]}>
              Your identity stays on this device.
            </Text>
          </View>
        </View>

        {/* Account Access */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionLabel>Account Access</SectionLabel>
          <KnotsCard style={styles.sectionCard}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: c.text }]}>Premium membership</Text>
                <Text style={[styles.rowSub, { color: c.muted }]}>Not active</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: c.mutedDark + '30' }]}>
                <Text style={[styles.badgeText, { color: c.muted }]}>Free</Text>
              </View>
            </View>
            <View style={[styles.rowDivider, { backgroundColor: c.border }]} />
            <TouchableOpacity style={styles.row} activeOpacity={0.6}>
              <Text style={[styles.rowLabel, { color: c.text }]}>Manage account</Text>
              <Text style={[styles.arrow, { color: c.muted }]}>›</Text>
            </TouchableOpacity>
          </KnotsCard>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  idCard: { paddingVertical: 20 },
  idLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  idValue: { fontSize: 16, fontWeight: '600', marginTop: 8, letterSpacing: 0.5 },
  idNote: { fontSize: 12, marginTop: 6 },
  sectionCard: { paddingVertical: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 22, fontWeight: '300' },
  rowDivider: { height: 1, marginHorizontal: 16 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  infoIcon: { fontSize: 16, marginRight: 10 },
  infoText: { fontSize: 13, lineHeight: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

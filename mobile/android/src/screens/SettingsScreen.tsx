import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { KnotsCard, SectionLabel, ScreenHeader, SettingRow } from '../components';

export function SettingsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [startWithOS, setStartWithOS] = useState(true);
  const [reconnect, setReconnect] = useState(true);
  const [adBlocking, setAdBlocking] = useState(true);
  const [dnsProtection, setDnsProtection] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScreenHeader title="Settings" subtitle="HOW KNOTS WORKS" />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Connection */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <SectionLabel>Connection</SectionLabel>
          <KnotsCard style={styles.sectionCard}>
            <SettingRow
              label="Start with system"
              toggle
              toggleValue={startWithOS}
              onToggleChange={setStartWithOS}
            />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <SettingRow
              label="Reconnect if interrupted"
              toggle
              toggleValue={reconnect}
              onToggleChange={setReconnect}
            />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <SettingRow
              label="Split routing"
              badge="Premium"
              showArrow
            />
          </KnotsCard>
        </View>

        {/* Local Protection */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionLabel>Local Protection</SectionLabel>
          <KnotsCard style={styles.sectionCard}>
            <SettingRow
              label="Ad and tracker blocking"
              value="On"
            />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <SettingRow
              label="DNS protection"
              value="On"
            />
          </KnotsCard>
        </View>

        {/* About */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionLabel>About</SectionLabel>
          <KnotsCard style={styles.sectionCard}>
            <SettingRow label="Diagnostics" showArrow />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <SettingRow label="Version" value="1.2.0" />
          </KnotsCard>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionCard: { paddingVertical: 0 },
  divider: { height: 1, marginHorizontal: 16 },
});

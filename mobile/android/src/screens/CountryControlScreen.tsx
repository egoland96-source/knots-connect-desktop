import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { KnotsCard, SectionLabel, RouteNode, RouteLine, PremiumModal } from '../components';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CountryControl'>;

export function CountryControlScreen({ navigation }: { navigation: Nav }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [showPremium, setShowPremium] = useState(false);

  const [routeMode] = useState<'dpi' | 'split'>('dpi');

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: c.cyan }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Amsterdam</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Subtitle */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[styles.subtitle, { color: c.muted }]}>COUNTRY CONTROL</Text>
          <Text style={[styles.subtitle2, { color: c.text }]}>Choose how this route works</Text>
        </View>

        {/* Route diagram */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <KnotsCard style={styles.routeCard}>
            {/* DPI node */}
            <RouteNode label="DPI" active connected />

            {/* Line down */}
            <View style={styles.lineContainer}>
              <RouteLine vertical active={routeMode === 'split'} />
            </View>

            {/* VPN + Tor row */}
            <View style={styles.nodeRow}>
              <RouteNode label="VPN" active={routeMode === 'split'} connected={routeMode === 'split'} />
              <View style={{ width: 12 }} />
              <RouteNode label="Tor" active={false} />
            </View>

            {/* Instruction */}
            <Text style={[styles.instruction, { color: c.muted }]}>
              Hold DPI and move toward VPN to enable Split routing.
              Tor is a separate mode.
            </Text>
          </KnotsCard>
        </View>

        {/* Current mode */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <SectionLabel>Current Mode</SectionLabel>
          <KnotsCard style={styles.modeCard}>
            <View style={styles.modeRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeTitle, { color: c.text }]}>
                  {routeMode === 'split' ? 'Split routing' : 'DPI bypass'}
                </Text>
                <Text style={[styles.modeSub, { color: c.muted }]}>Amsterdam</Text>
              </View>
              <View style={[styles.modeBadge, { backgroundColor: c.green + '18' }]}>
                <View style={[styles.modeDot, { backgroundColor: c.green }]} />
                <Text style={[styles.modeBadgeText, { color: c.green }]}>Running</Text>
              </View>
            </View>
          </KnotsCard>
        </View>

        {/* Premium note */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <Text style={[styles.premiumNote, { color: c.mutedDark }]}>
            Premium route controls · Included with Premium
          </Text>
        </View>

        {/* Try Split Routing button */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            onPress={() => setShowPremium(true)}
          >
            <Text style={[styles.actionBtnText, { color: c.text }]}>Try Split Routing</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <PremiumModal
        visible={showPremium}
        onClose={() => setShowPremium(false)}
        onSeePremium={() => {
          setShowPremium(false);
          navigation.navigate('RouteControl');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
  },
  backBtn: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  subtitle2: { fontSize: 16, fontWeight: '600', marginTop: 6 },
  routeCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  lineContainer: { height: 24, justifyContent: 'center' },
  nodeRow: { flexDirection: 'row' },
  instruction: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  modeCard: {},
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeTitle: { fontSize: 16, fontWeight: '600' },
  modeSub: { fontSize: 13, marginTop: 2 },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modeDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  modeBadgeText: { fontSize: 12, fontWeight: '700' },
  premiumNote: { fontSize: 12, textAlign: 'center' },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { KnotsCard, SectionLabel, RouteNode, RouteLine } from '../components';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList, 'RouteControl'>;

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ['Resting', 'Hold', 'Move', 'Release'];
const STEP_DESCS = [
  'Choose a route · AMSTERDAM',
  'Keep holding. A route line will appear.',
  'Split preview: DPI for restricted traffic / VPN for selected apps',
  'Route updated · AMSTERDAM',
];

export function RouteControlScreen({ navigation }: { navigation: Nav }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [step, setStep] = useState<Step>(0);
  const [routeCreated, setRouteCreated] = useState(false);

  const advance = () => {
    if (step < 3) {
      setStep((step + 1) as Step);
      if (step === 2) setRouteCreated(true);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: c.cyan }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Route control</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Instruction */}
      <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
        <Text style={[styles.instruction, { color: c.muted }]}>
          Hold DPI, move toward VPN, and release to create a Split route.
        </Text>
      </View>

      {/* Stepper */}
      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <View style={styles.stepper}>
          {STEP_LABELS.map((label, idx) => (
            <React.Fragment key={idx}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: idx <= step ? c.cyan : c.surfaceAlt,
                    borderColor: idx <= step ? c.cyan : c.borderLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepNum,
                    { color: idx <= step ? '#080E14' : c.muted },
                  ]}
                >
                  {idx + 1}
                </Text>
              </View>
              {idx < STEP_LABELS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: idx < step ? c.cyan : c.borderLight },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
        <View style={styles.stepLabels}>
          {STEP_LABELS.map((label, idx) => (
            <Text
              key={idx}
              style={[
                styles.stepLabel,
                {
                  color: idx <= step ? c.text : c.mutedDark,
                  fontWeight: idx === step ? '700' : '500',
                },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Route diagram */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <Text style={[styles.sceneTitle, { color: c.text }]}>
            {STEP_DESCS[step]}
          </Text>

          <KnotsCard style={styles.routeCard}>
            {/* DPI node */}
            <RouteNode
              label="DPI"
              active={step >= 0}
              connected={step >= 3 || step === 0}
            />

            {/* Connection handle appears on Hold */}
            {step >= 1 && step <= 2 && (
              <View style={styles.handle}>
                <View style={[styles.handleDot, { backgroundColor: c.cyan }]} />
              </View>
            )}

            {/* Line down */}
            <View style={styles.lineContainer}>
              <RouteLine vertical active={step >= 2} />
            </View>

            {/* VPN + Tor */}
            <View style={styles.nodeRow}>
              <RouteNode
                label="VPN"
                active={step >= 2}
                connected={step >= 3}
              />
              <View style={{ width: 12 }} />
              <RouteNode label="Tor" active={false} />
            </View>

            {/* Step description */}
            <Text style={[styles.stepDesc, { color: c.muted }]}>
              {step === 0 && 'Your current route: DPI bypass'}
              {step === 1 && 'Release & keep'}
              {step === 2 && 'Drag toward VPN to preview Split routing'}
              {step === 3 && 'Split routing is now active'}
            </Text>
          </KnotsCard>
        </View>

        {/* Release result card */}
        {routeCreated && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <SectionLabel>Route Updated</SectionLabel>
            <View style={[styles.resultCard, { backgroundColor: c.green + '12', borderColor: c.green + '40' }]}>
              <View style={styles.resultRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultTitle, { color: c.green }]}>NEW ROUTE</Text>
                  <Text style={[styles.resultMode, { color: c.text }]}>Split routing</Text>
                </View>
                <View style={[styles.resultBadge, { backgroundColor: c.green }]}>
                  <Text style={styles.resultBadgeText}>●</Text>
                </View>
              </View>
              <View style={[styles.resultDivider, { backgroundColor: c.green + '30' }]} />
              <Text style={[styles.trafficLabel, { color: c.muted }]}>TRAFFIC RULES</Text>
              <View style={styles.trafficRow}>
                <Text style={[styles.trafficKey, { color: c.muted }]}>Restricted traffic:</Text>
                <Text style={[styles.trafficVal, { color: c.text }]}>DPI</Text>
              </View>
              <View style={styles.trafficRow}>
                <Text style={[styles.trafficKey, { color: c.muted }]}>Selected apps:</Text>
                <Text style={[styles.trafficVal, { color: c.text }]}>VPN</Text>
              </View>
              <View style={[styles.torNote, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[styles.torNoteText, { color: c.muted }]}>
                  Tor stays separate: Not available in Split
                </Text>
              </View>
            </View>
            <Text style={[styles.tipText, { color: c.mutedDark }]}>
              To change this later, press and hold DPI again.
            </Text>
          </View>
        )}

        {/* Action button */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 100 }}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: step < 3 ? c.cyan : c.surfaceAlt, borderColor: c.border }]}
          >
            <Text
              style={[styles.actionBtnText, { color: step < 3 ? '#080E14' : c.text }]}
            >
              {step < 3 ? `Next: ${STEP_LABELS[step + 1]}` : 'Done'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
  instruction: { fontSize: 13, lineHeight: 18 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepDot: {
    width: 32, height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 14, fontWeight: '700' },
  stepLine: { height: 2, flex: 1, borderRadius: 1 },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepLabel: { fontSize: 11 },
  sceneTitle: { fontSize: 15, fontWeight: '600', marginBottom: 16 },
  routeCard: { alignItems: 'center', paddingVertical: 28 },
  handle: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleDot: { width: 8, height: 8, borderRadius: 4 },
  lineContainer: { height: 24, justifyContent: 'center' },
  nodeRow: { flexDirection: 'row' },
  stepDesc: { fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 18 },
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  resultMode: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  resultBadge: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  resultBadgeText: { color: '#080E14', fontSize: 10 },
  resultDivider: { height: 1, marginVertical: 12 },
  trafficLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  trafficRow: { flexDirection: 'row', paddingVertical: 4 },
  trafficKey: { fontSize: 14, flex: 1 },
  trafficVal: { fontSize: 14, fontWeight: '600' },
  torNote: { borderRadius: 8, padding: 10, marginTop: 12 },
  torNoteText: { fontSize: 12, textAlign: 'center' },
  tipText: { fontSize: 12, marginTop: 12, textAlign: 'center' },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700' },
});

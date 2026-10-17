import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { KnotsCard, SectionLabel, StatusPill, ConnectionMap } from '../components';
import { useVpn } from '../store/VpnContext';
import { useTelemetry } from '../store/TelemetryContext';
import { formatLatency, formatMetric } from '../types/telemetry';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Main'>;

export function OverviewScreen({ navigation }: { navigation: Nav }) {
  const { theme } = useTheme();
  const { status, connect, disconnect } = useVpn();
  const { data, refresh, isRefreshing } = useTelemetry();
  const c = theme.colors;

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const statusText = isConnected
    ? 'Bağlı'
    : isConnecting
    ? 'Bağlanıyor…'
    : 'Bağlı değil';

  const statusSub = isConnected
    ? 'Trafik Knots üzerinden yönlendiriliyor.'
    : isConnecting
    ? 'VPN bağlantısı kuruluyor…'
    : 'Trafik korunmuyor.';

  const onDisconnect = () => {
    if (isConnected) disconnect();
    else if (!isConnecting) connect();
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>Overview</Text>
          <Text style={[styles.headerSub, { color: c.muted }]}>KNOTS CONNECT</Text>
        </View>
        <StatusPill
          label={statusText}
          variant={isConnected ? 'on' : 'off'}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={c.cyan}
          />
        }
      >
        {/* Connection status */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <SectionLabel>Connection</SectionLabel>
          <TouchableOpacity
            onPress={() => navigation.navigate('CountryControl')}
            activeOpacity={0.7}
            disabled={!isConnected}
          >
            <KnotsCard style={styles.connectionCard}>
              <View style={styles.connectionTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.connectedText, { color: c.text }]}>
                    {statusText}
                  </Text>
                  <Text style={[styles.connectedSub, { color: c.muted }]}>
                    {statusSub}
                  </Text>
                  {isConnected && (
                    <Text style={[styles.countryLink, { color: c.cyan }]}>
                      Amsterdam ›
                    </Text>
                  )}
                </View>
                {/* Gerçek HTTP gecikmesi — VPN sunucu gecikmesi değil */}
                <View style={styles.pingBox}>
                  <Text style={[styles.pingLabel, { color: c.mutedDark }]}>HTTP</Text>
                  <Text
                    style={[
                      styles.ping,
                      {
                        color:
                          data.httpLatency.state === 'ready'
                            ? c.green
                            : c.muted,
                      },
                    ]}
                  >
                    {formatLatency(data.httpLatency.value)}
                  </Text>
                </View>
              </View>
            </KnotsCard>
          </TouchableOpacity>
        </View>

        {/* Live connection map */}
        <View style={{ marginTop: 20 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={[styles.mapLabel, { color: c.muted }]}>Live connection map</Text>
          </View>
          <ConnectionMap />
          <View style={styles.mapLabels}>
            <View style={styles.mapLabelItem}>
              <View style={[styles.mapDot, { backgroundColor: c.blue }]} />
              <Text style={[styles.mapLabelText, { color: c.muted }]}>This device</Text>
            </View>
            <View style={styles.mapLabelItem}>
              <Text style={[styles.mapLabelText, { color: c.muted }]}>Secure exit</Text>
              <View style={[styles.mapDot, { backgroundColor: c.green }]} />
            </View>
          </View>
        </View>

        {/* Detail cards */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <KnotsCard style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: c.muted }]}>PRIVATE ROUTE</Text>
                <Text style={[styles.detailValue, { color: c.text }]}>
                  {isConnected ? 'Secured' : 'Not secured'}
                </Text>
                <Text style={[styles.detailSub, { color: c.mutedDark }]}>
                  Traffic is routed through Knots
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <View style={styles.detailRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: c.muted }]}>NETWORK RESTRICTIONS</Text>
                <Text style={[styles.detailValue, { color: c.text }]}>
                  {isConnected ? 'Handled' : 'Not handled'}
                </Text>
                <Text style={[styles.detailSub, { color: c.mutedDark }]}>
                  DPI bypass is running
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <View style={styles.detailRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: c.muted }]}>GENERAL IP</Text>
                <Text style={[styles.detailValue, { color: c.text }]}>
                  {formatMetric(data.publicIp)}
                </Text>
                <Text style={[styles.detailSub, { color: c.mutedDark }]}>
                  Kaynak: {data.publicIp.source || '—'}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <View style={styles.detailRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: c.muted }]}>NETWORK</Text>
                <Text style={[styles.detailValue, { color: c.text }]}>
                  {data.network.type
                    ? data.network.type === 'wifi'
                      ? 'Wi-Fi'
                      : data.network.type === 'cellular'
                      ? 'Mobil veri'
                      : data.network.type
                    : '—'}
                </Text>
                <Text style={[styles.detailSub, { color: c.mutedDark }]}>
                  {data.network.isConnected === null
                    ? '—'
                    : data.network.isConnected
                    ? 'İnternet erişimi var'
                    : 'İnternet erişimi yok'}
                </Text>
              </View>
            </View>
          </KnotsCard>
        </View>

        {/* Knots ID */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <KnotsCard style={styles.idCard}>
            <View style={styles.idRow}>
              <View>
                <Text style={[styles.detailLabel, { color: c.muted }]}>YOUR KNOTS ID</Text>
                <Text style={[styles.knotsId, { color: c.text }]}>7F3A-91C2-6D84-B0E7</Text>
              </View>
              <TouchableOpacity>
                <Text style={[styles.manageLink, { color: c.cyan }]}>Manage</Text>
              </TouchableOpacity>
            </View>
          </KnotsCard>
        </View>

        {/* Connect/Disconnect button */}
        <View style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 100 }}>
          <TouchableOpacity
            style={[
              styles.disconnectBtn,
              {
                backgroundColor: isConnected
                  ? c.cyan
                  : isConnecting
                  ? c.surfaceAlt
                  : c.purple,
                borderWidth: isConnecting ? 1 : 0,
                borderColor: c.border,
              },
            ]}
            onPress={onDisconnect}
            disabled={isConnecting}
          >
            <Text
              style={[
                styles.disconnectText,
                { color: isConnecting ? c.text : '#080E14' },
              ]}
            >
              {isConnected ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', letterSpacing: -0.5 },
  headerSub: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  connectionCard: { paddingVertical: 20 },
  connectionTop: { flexDirection: 'row', alignItems: 'flex-start' },
  connectedText: { fontSize: 18, fontWeight: 'bold' },
  connectedSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  countryLink: { fontSize: 13, marginTop: 6, fontWeight: '600' },
  pingBox: { alignItems: 'flex-end' },
  pingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  ping: { fontSize: 20, fontWeight: 'bold' },
  mapLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  mapLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  mapLabelItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapDot: { width: 8, height: 8, borderRadius: 4 },
  mapLabelText: { fontSize: 12, fontWeight: '500' },
  detailCard: { paddingVertical: 4 },
  detailRow: { paddingVertical: 16 },
  detailLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  detailValue: { fontSize: 16, fontWeight: '600' },
  detailSub: { fontSize: 12, marginTop: 4 },
  divider: { height: 1 },
  idCard: {},
  idRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  knotsId: { fontSize: 15, fontWeight: '600', marginTop: 6, letterSpacing: 0.5 },
  manageLink: { fontSize: 14, fontWeight: '600' },
  disconnectBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectText: { fontSize: 16, fontWeight: '700' },
});

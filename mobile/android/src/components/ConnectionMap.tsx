import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const { width } = Dimensions.get('window');

export function ConnectionMap() {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Grid background */}
      <View style={styles.gridBg}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={`h-${i}`}
 style={[styles.gridLineH, { top: (i + 1) * (180 / 9) }]}
          />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={`v-${i}`}
            style={[styles.gridLineV, { left: (i + 1) * (width - 40) / 13 }]}
          />
        ))}
      </View>

      {/* Stylized landmass shapes */}
      <View style={[styles.landmass, styles.land1]} />
      <View style={[styles.landmass, styles.land2]} />
      <View style={[styles.landmass, styles.land3]} />

      {/* Connection route — curved line */}
      <View style={styles.routeContainer}>
        {/* Start point (this device) */}
        <View style={[styles.devicePoint, { left: 30, top: 120 }]}>
          <View style={[styles.ring, { borderColor: theme.colors.blue }]} />
          <View style={[styles.ringInner, { backgroundColor: theme.colors.blue }]} />
        </View>

        {/* Route line segments (approximating curve) */}
        <View style={[styles.routeSeg, { left: 45, top: 132, width: 50, transform: [{ rotate: '-25deg' }] }]} />
        <View style={[styles.routeSeg, { left: 85, top: 110, width: 60, transform: [{ rotate: '15deg' }] }]} />
        <View style={[styles.routeSeg, { left: 140, top: 122, width: 55, transform: [{ rotate: '-10deg' }] }]} />
        <View style={[styles.routeSeg, { left: 190, top: 116, width: 50, transform: [{ rotate: '20deg' }] }]} />

        {/* End point (secure exit) */}
        <View style={[styles.exitPoint, { left: 240, top: 95 }]}>
          <View style={[styles.ring, { borderColor: theme.colors.green }]} />
          <View style={[styles.ringInner, { backgroundColor: theme.colors.green }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  gridBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(35, 50, 65, 0.5)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 1,
    backgroundColor: 'rgba(35, 50, 65, 0.5)',
  },
  landmass: {
    position: 'absolute',
    backgroundColor: 'rgba(20, 35, 50, 0.8)',
    borderRadius: 30,
  },
  land1: {
    left: 10, top: 90,
    width: 80, height: 50,
    borderRadius: 25,
    transform: [{ rotate: '10deg' }],
  },
  land2: {
    left: 80, top: 50,
    width: 120, height: 60,
    borderRadius: 30,
  },
  land3: {
    left: 200, top: 60,
    width: 60, height: 40,
    borderRadius: 20,
    transform: [{ rotate: '-15deg' }],
  },
  routeContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  devicePoint: {
    position: 'absolute',
    width: 24, height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitPoint: {
    position: 'absolute',
    width: 24, height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 24, height: 24,
    borderRadius: 12,
    borderWidth: 2,
    opacity: 0.4,
  },
  ringInner: {
    width: 10, height: 10,
    borderRadius: 5,
  },
  routeSeg: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#75F0A4',
    opacity: 0.7,
  },
});

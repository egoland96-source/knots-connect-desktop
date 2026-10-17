import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onSeePremium: () => void;
}

export function PremiumModal({ visible, onClose, onSeePremium }: PremiumModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Lock icon */}
          <View style={[styles.lockCircle, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>Premium needed</Text>
          <Text style={[styles.desc, { color: theme.colors.muted }]}>
            Custom country controls are available with Premium.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.purple }]}
          >
            <Text style={styles.primaryBtnText} onPress={onSeePremium}>See Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.secondaryBtn, { color: theme.colors.muted }]}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 8, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  lockCircle: {
    width: 64, height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockIcon: { fontSize: 28 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { fontSize: 15, fontWeight: '500', padding: 8 },
});

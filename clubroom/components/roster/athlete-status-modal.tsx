import React, { memo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { rosterService, ROSTER_STATUSES } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';

interface AthleteStatusModalProps {
  visible: boolean;
  currentStatus: RosterEntry['status'];
  onSelect: (status: RosterEntry['status']) => void;
  onClose: () => void;
}

export const AthleteStatusModal = memo(function AthleteStatusModal({
  visible,
  currentStatus,
  onSelect,
  onClose,
}: AthleteStatusModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: withAlpha(colors.text, 0.5) }]}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <Row gap="sm" align="center" justify="space-between" style={styles.header}>
            <ThemedText type="title">Update Status</ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Clickable>
          </Row>
          {ROSTER_STATUSES.map((s) => (
            <Clickable
              key={s}
              onPress={() => onSelect(s)}
              style={
                currentStatus === s
                  ? [
                      styles.optionRow,
                      { backgroundColor: withAlpha(rosterService.getStatusColor(s), 0.09) },
                    ]
                  : styles.optionRow
              }
            >
              <Row align="center" gap="md">
                <View
                  style={[styles.statusDot, { backgroundColor: rosterService.getStatusColor(s) }]}
                />
                <ThemedText style={styles.flex1}>{rosterService.formatStatus(s)}</ThemedText>
                {currentStatus === s && (
                  <Ionicons name="checkmark" size={20} color={rosterService.getStatusColor(s)} />
                )}
              </Row>
            </Clickable>
          ))}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  optionRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 52,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  flex1: { flex: 1 },
});

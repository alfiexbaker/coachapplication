import React, { memo, useCallback, useRef } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { GroupRegistration } from '@/constants/types';
import type { AttendanceStatus } from '@/hooks/use-group-roster';
import {
  getGroupRegistrationAthleteName,
  getGroupRegistrationParentName,
} from '@/utils/group-display';

export interface RollCallModalProps {
  visible: boolean;
  sessionTitle: string | undefined;
  participants: GroupRegistration[];
  attendance: Record<string, AttendanceStatus>;
  stats: { total: number; present: number; late: number; absent: number; unmarked: number };
  colors: ThemeColors;
  onClose: () => void;
  onMarkStatus: (id: string, status: AttendanceStatus) => void;
  onMarkAllPresent: () => void;
  onReset: () => void;
  onSave: () => void;
  onReportInjury: (registration: GroupRegistration) => void;
}

export const RollCallModal = memo(function RollCallModal({
  visible,
  sessionTitle,
  participants,
  attendance,
  stats,
  colors,
  onClose,
  onMarkStatus,
  onMarkAllPresent,
  onReset,
  onSave,
  onReportInjury,
}: RollCallModalProps) {
  const processingParticipantIdsRef = useRef<Set<string>>(new Set());

  const handleMarkStatus = useCallback(
    async (participantId: string, status: AttendanceStatus) => {
      if (processingParticipantIdsRef.current.has(participantId)) return;
      processingParticipantIdsRef.current.add(participantId);
      try {
        await Promise.resolve(onMarkStatus(participantId, status));
      } finally {
        processingParticipantIdsRef.current.delete(participantId);
      }
    },
    [onMarkStatus],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <Row style={[styles.header, { borderBottomColor: colors.border }]}>
          <Clickable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close roll call"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Clickable>
          <Column flex align="center">
            <ThemedText type="defaultSemiBold" style={Typography.heading}>
              Roll Call
            </ThemedText>
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              {sessionTitle}
            </ThemedText>
          </Column>
          <Clickable
            style={[
              styles.saveBtn,
              { backgroundColor: stats.unmarked === 0 ? colors.success : colors.border },
            ]}
            onPress={onSave}
            disabled={stats.unmarked > 0}
            accessibilityRole="button"
            accessibilityLabel="Save attendance"
            accessibilityState={{ disabled: stats.unmarked > 0 }}
          >
            <ThemedText
              style={{
                color: stats.unmarked === 0 ? colors.onPrimary : colors.muted,
                fontWeight: '600',
              }}
            >
              Save
            </ThemedText>
          </Clickable>
        </Row>

        <Animated.View
          entering={FadeIn.delay(100)}
          style={[styles.stats, { backgroundColor: colors.surface }]}
        >
          {[
            { label: 'Present', count: stats.present, color: colors.success },
            { label: 'Late', count: stats.late, color: colors.warning },
            { label: 'Absent', count: stats.absent, color: colors.error },
            { label: 'Remaining', count: stats.unmarked, color: colors.muted },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <ThemedText style={Typography.small}>{s.label}</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: s.color }}>
                {s.count}
              </ThemedText>
            </View>
          ))}
        </Animated.View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: Spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {participants.map((reg, i) => {
            const status = attendance[reg.id] || 'unmarked';
            const athleteName = getGroupRegistrationAthleteName(reg);
            const parentName = getGroupRegistrationParentName(reg);
            return (
              <Animated.View
                key={reg.id}
                entering={FadeInDown.delay(i * 30).springify()}
                style={[styles.item, { backgroundColor: colors.surface }]}
              >
                <Row gap="md" align="center" style={{ marginBottom: Spacing.sm }}>
                  <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
                    <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.tint }]}>
                      {athleteName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </ThemedText>
                  </View>
                  <Column flex>
                    <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
                    {parentName && (
                      <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                        Parent: {parentName}
                      </ThemedText>
                    )}
                  </Column>
                </Row>
                <Row gap="sm" justify="flex-end">
                  {(
                    [
                      ['present', 'checkmark', colors.success],
                      ['late', 'time', colors.warning],
                      ['absent', 'close', colors.error],
                    ] as const
                  ).map(([s, icon, color]) => (
                    <Clickable
                      key={s}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: status === s ? color : 'transparent',
                          borderColor: status === s ? color : colors.border,
                        },
                      ]}
                      onPress={() => {
                        void handleMarkStatus(reg.id, s);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${athleteName} as ${s}`}
                      accessibilityState={{ selected: status === s }}
                    >
                      <Ionicons
                        name={icon}
                        size={s === 'late' ? 18 : 20}
                        color={status === s ? colors.onPrimary : color}
                      />
                    </Clickable>
                  ))}
                  <Clickable
                    style={[
                      styles.injuryBtn,
                      {
                        backgroundColor: withAlpha(colors.error, 0.09),
                        borderColor: withAlpha(colors.error, 0.19),
                      },
                    ]}
                    onPress={() => onReportInjury(reg)}
                    accessibilityRole="button"
                    accessibilityLabel={`Report injury for ${athleteName}`}
                  >
                    <Ionicons name="medkit" size={16} color={colors.error} />
                  </Clickable>
                </Row>
              </Animated.View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>

        <Row
          style={[
            styles.quickActions,
            { borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Clickable
            style={[styles.quickBtn, { backgroundColor: withAlpha(colors.success, 0.09) }]}
            onPress={onMarkAllPresent}
            accessibilityRole="button"
            accessibilityLabel="Mark all present"
          >
            <Ionicons name="checkmark-done" size={18} color={colors.success} />
            <ThemedText style={[Typography.smallSemiBold, { color: colors.success }]}>
              All Present
            </ThemedText>
          </Clickable>
          <Clickable
            style={[styles.quickBtn, { backgroundColor: withAlpha(colors.muted, 0.09) }]}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Reset attendance"
          >
            <Ionicons name="refresh" size={18} color={colors.muted} />
            <ThemedText style={[Typography.smallSemiBold, { color: colors.muted }]}>
              Reset
            </ThemedText>
          </Clickable>
        </Row>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  saveBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  stats: {
    justifyContent: 'space-around',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  statItem: { alignItems: 'center', gap: Spacing.xxs },
  dot: { width: 10, height: 10, borderRadius: Radii.sm },
  item: { padding: Spacing.md, borderRadius: Radii.md, marginBottom: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  injuryBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xxs,
  },
  quickActions: {
    justifyContent: 'space-around',
    padding: Spacing.md,
    borderTopWidth: 1,
    paddingBottom: Spacing.lg,
  },
  quickBtn: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
});

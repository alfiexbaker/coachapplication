/**
 * Attendance Step — Step 1 of Session Completion Wizard
 *
 * Allows coach to mark each registered athlete as present, late, or absent.
 * Shows avatar, name, and attendance status buttons for each athlete.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ============================================================================
// TYPES
// ============================================================================

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AthleteAttendanceData {
  registrationId: string;
  userName: string;
  status: AttendanceStatus;
  badges: string[];
}

export interface AttendanceStepProps {
  athletes: AthleteAttendanceData[];
  colors: ThemeColors;
  onUpdateStatus: (registrationId: string, status: AttendanceStatus) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getAttendanceIcon(status: AttendanceStatus, colors: ThemeColors) {
  switch (status) {
    case 'present':
      return { name: 'checkmark-circle' as const, color: colors.success };
    case 'absent':
      return { name: 'close-circle' as const, color: colors.error };
    case 'late':
      return { name: 'time' as const, color: colors.warning };
  }
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'late', 'absent'];

// ============================================================================
// ATHLETE ROW
// ============================================================================

interface AthleteRowProps {
  athlete: AthleteAttendanceData;
  colors: ThemeColors;
  onUpdateStatus: (registrationId: string, status: AttendanceStatus) => void;
}

const AthleteRow = memo(function AthleteRow({ athlete, colors, onUpdateStatus }: AthleteRowProps) {
  const handlePress = useCallback(
    (status: AttendanceStatus) => {
      onUpdateStatus(athlete.registrationId, status);
    },
    [athlete.registrationId, onUpdateStatus],
  );

  return (
    <View style={[styles.athleteRow, { borderBottomColor: colors.border }]}>
      <Row align="center" gap="sm" style={styles.athleteInfo}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
            {athlete.userName.charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.athleteName}>
          <ThemedText type="defaultSemiBold">{athlete.userName}</ThemedText>
          {athlete.badges.length > 0 && (
            <Row align="center" gap="xxs" style={styles.badgePreview}>
              <Ionicons name="ribbon" size={12} color={colors.warning} />
              <ThemedText style={[styles.badgeCount, { color: colors.warning }]}>
                {athlete.badges.length} badge{athlete.badges.length !== 1 ? 's' : ''}
              </ThemedText>
            </Row>
          )}
        </View>
      </Row>

      <Row gap="xs">
        {ATTENDANCE_STATUSES.map(s => {
          const btnIcon = getAttendanceIcon(s, colors);
          const isSelected = athlete.status === s;
          return (
            <Clickable
              key={s}
              style={[
                styles.attendanceBtn,
                isSelected ? { backgroundColor: withAlpha(btnIcon.color, 0.09) } : undefined,
              ]}
              onPress={() => handlePress(s)}
              accessibilityLabel={`Mark ${athlete.userName} as ${s}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Ionicons
                name={btnIcon.name}
                size={24}
                color={isSelected ? btnIcon.color : colors.muted}
              />
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
});

// ============================================================================
// ATTENDANCE STEP
// ============================================================================

export const AttendanceStep = memo(function AttendanceStep({
  athletes,
  colors,
  onUpdateStatus,
}: AttendanceStepProps) {
  return (
    <SurfaceCard style={styles.section}>
      <Row align="center" gap="sm" style={styles.sectionHeader}>
        <Ionicons name="people" size={20} color={colors.tint} />
        <ThemedText type="subtitle">Attendance</ThemedText>
      </Row>

      {athletes.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
          No registered athletes for this session
        </ThemedText>
      ) : (
        athletes.map(athlete => (
          <AthleteRow
            key={athlete.registrationId}
            athlete={athlete}
            colors={colors}
            onUpdateStatus={onUpdateStatus}
          />
        ))
      )}
    </SurfaceCard>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  athleteRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.xs,
  },
  athleteInfo: {
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodySmallSemiBold,
  },
  athleteName: {
    flex: 1,
  },
  badgePreview: {
    marginTop: Spacing.micro,
  },
  badgeCount: {
    ...Typography.caption,
  },
  attendanceBtn: {
    padding: Spacing.xs,
    borderRadius: Radii.sm,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

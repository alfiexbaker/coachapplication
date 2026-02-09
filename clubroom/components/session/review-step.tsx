/**
 * Review Step — Step 4 of Session Completion Wizard
 *
 * Displays a summary of all data collected in previous steps and
 * allows coach to configure sharing preferences before submission.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ============================================================================
// TYPES
// ============================================================================

export interface ReviewStepProps {
  colors: ThemeColors;
  presentCount: number;
  absentCount: number;
  sessionSummary: string;
  skillsFocused: string[];
  totalBadgesAwarded: number;
  overallEffort: number;
  shareNotesWithParents: boolean;
  onShareNotesChange: (value: boolean) => void;
  shareAttendance: boolean;
  onShareAttendanceChange: (value: boolean) => void;
}

// ============================================================================
// REVIEW STEP
// ============================================================================

export const ReviewStep = memo(function ReviewStep({
  colors,
  presentCount,
  absentCount,
  sessionSummary,
  skillsFocused,
  totalBadgesAwarded,
  overallEffort,
  shareNotesWithParents,
  onShareNotesChange,
  shareAttendance,
  onShareAttendanceChange,
}: ReviewStepProps) {
  return (
    <>
      {/* Review Summary */}
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="eye" size={20} color={colors.tint} />
          <ThemedText type="subtitle">Review &amp; Share</ThemedText>
        </View>
        <ThemedText style={[styles.summaryHint, { color: colors.muted }]}>
          Review what will be shared with parents when you complete this session.
        </ThemedText>

        {/* Attendance summary */}
        <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
          <View style={styles.summaryLabel}>
            <Ionicons name="people-outline" size={18} color={colors.tint} />
            <ThemedText type="defaultSemiBold">Attendance</ThemedText>
          </View>
          <ThemedText style={{ color: colors.muted }}>
            {presentCount} present, {absentCount} absent
          </ThemedText>
        </View>

        {/* Notes summary */}
        <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
          <View style={styles.summaryLabel}>
            <Ionicons name="document-text-outline" size={18} color={colors.tint} />
            <ThemedText type="defaultSemiBold">Session Notes</ThemedText>
          </View>
          <ThemedText style={{ color: colors.muted }} numberOfLines={2}>
            {sessionSummary || 'No notes added'}
          </ThemedText>
        </View>

        {/* Skills */}
        {skillsFocused.length > 0 && (
          <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
            <View style={styles.summaryLabel}>
              <Ionicons name="football-outline" size={18} color={colors.tint} />
              <ThemedText type="defaultSemiBold">Skills</ThemedText>
            </View>
            <ThemedText style={{ color: colors.muted }}>
              {skillsFocused.join(', ')}
            </ThemedText>
          </View>
        )}

        {/* Badges */}
        {totalBadgesAwarded > 0 && (
          <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
            <View style={styles.summaryLabel}>
              <Ionicons name="ribbon-outline" size={18} color={colors.warning} />
              <ThemedText type="defaultSemiBold">Badges</ThemedText>
            </View>
            <ThemedText style={{ color: colors.muted }}>
              {totalBadgesAwarded} badge{totalBadgesAwarded !== 1 ? 's' : ''} awarded
            </ThemedText>
          </View>
        )}

        {/* Effort */}
        <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
          <View style={styles.summaryLabel}>
            <Ionicons name="fitness-outline" size={18} color={colors.tint} />
            <ThemedText type="defaultSemiBold">Group Effort</ThemedText>
          </View>
          <ThemedText style={{ color: colors.muted }}>{overallEffort}/5</ThemedText>
        </View>
      </SurfaceCard>

      {/* Sharing toggles */}
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="share-social" size={20} color={colors.tint} />
          <ThemedText type="subtitle">Sharing Preferences</ThemedText>
        </View>

        <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
          <View style={styles.toggleInfo}>
            <ThemedText type="defaultSemiBold">Share notes with parents</ThemedText>
            <ThemedText style={[styles.toggleHint, { color: colors.muted }]}>
              Parents will see your session notes and homework
            </ThemedText>
          </View>
          <Switch
            value={shareNotesWithParents}
            onValueChange={onShareNotesChange}
            trackColor={{ false: colors.border, true: withAlpha(colors.success, 0.38) }}
            thumbColor={shareNotesWithParents ? colors.success : colors.muted}
            accessibilityLabel="Share notes with parents"
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <ThemedText type="defaultSemiBold">Share attendance</ThemedText>
            <ThemedText style={[styles.toggleHint, { color: colors.muted }]}>
              Parents will see if their child attended
            </ThemedText>
          </View>
          <Switch
            value={shareAttendance}
            onValueChange={onShareAttendanceChange}
            trackColor={{ false: colors.border, true: withAlpha(colors.success, 0.38) }}
            thumbColor={shareAttendance ? colors.success : colors.muted}
            accessibilityLabel="Share attendance with parents"
          />
        </View>
      </SurfaceCard>
    </>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  summaryHint: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  summaryRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.xxs,
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  toggleInfo: {
    flex: 1,
    gap: Spacing.micro,
    marginRight: Spacing.sm,
  },
  toggleHint: {
    ...Typography.caption,
  },
});

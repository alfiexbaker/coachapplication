import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export interface ClubDetailStatsProps {
  memberCount: number;
  squadCount: number;
  activityCount: number;
  canExpand: boolean;
  isExpanded: boolean;
  onToggleMembers: () => void;
  colors: ThemeColors;
}

export const ClubDetailStats = function ClubDetailStats({
  memberCount,
  squadCount,
  activityCount,
  canExpand,
  isExpanded,
  onToggleMembers,
  colors,
}: ClubDetailStatsProps) {
  return (
    <Row style={[styles.row, { borderColor: colors.border }]}>
      {canExpand ? (
        <Clickable
          style={styles.item}
          onPress={onToggleMembers}
          accessibilityLabel={isExpanded ? 'Hide club members' : 'Show club members'}
        >
          <ThemedText type="title" style={Typography.heading}>
            {memberCount}
          </ThemedText>
          <Row style={styles.labelRow}>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>Members</ThemedText>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.muted}
            />
          </Row>
        </Clickable>
      ) : (
        <View style={styles.item}>
          <ThemedText type="title" style={Typography.heading}>
            {memberCount}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>Members</ThemedText>
        </View>
      )}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.item}>
        <ThemedText type="title" style={Typography.heading}>
          {squadCount}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>Squads</ThemedText>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.item}>
        <ThemedText type="title" style={Typography.heading}>
          {activityCount}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>Activities</ThemedText>
      </View>
    </Row>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  labelRow: {
    alignItems: 'center',
    gap: Spacing.micro,
  },
  divider: {
    width: 1,
    height: '100%',
  },
});

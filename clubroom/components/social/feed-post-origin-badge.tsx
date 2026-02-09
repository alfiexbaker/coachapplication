import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OriginBadgeProps {
  clubName: string;
  clubBadge?: string;
  clubId: string;
  feedType?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const OriginBadge = memo(function OriginBadge({
  clubName,
  clubBadge,
  clubId,
  feedType,
}: OriginBadgeProps) {
  const { colors: palette } = useTheme();

  const handleClubPress = () => {
    router.push(Routes.club(clubId));
  };

  if (feedType === 'PERSONAL') {
    return (
      <View style={styles.originBadgeRow}>
        <View
          style={[
            styles.clubBadge,
            { backgroundColor: withAlpha(palette.success, 0.06), borderColor: withAlpha(palette.success, 0.19) },
          ]}
        >
          <Ionicons name="person-circle-outline" size={16} color={palette.success} />
          <ThemedText style={[styles.clubBadgeText, { color: palette.success }]} numberOfLines={1}>
            Personal
          </ThemedText>
        </View>
      </View>
    );
  }

  if (feedType === 'BOTH') {
    return (
      <View style={styles.originBadgeRow}>
        <View
          style={[
            styles.clubBadge,
            { backgroundColor: withAlpha(palette.success, 0.06), borderColor: withAlpha(palette.success, 0.19) },
          ]}
        >
          <Ionicons name="person-circle-outline" size={16} color={palette.success} />
          <ThemedText style={[styles.clubBadgeText, { color: palette.success }]} numberOfLines={1}>
            Personal
          </ThemedText>
        </View>
        <Clickable
          onPress={handleClubPress}
          style={[
            styles.clubBadge,
            { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.19) },
          ]}
          hitSlop={8}
        >
          <View style={[styles.clubBadgeIcon, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.clubBadgeIconText, { color: palette.onPrimary }]}>
              {clubBadge?.slice(0, 2) || clubName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]} numberOfLines={1}>
            {clubName}
          </ThemedText>
          <Ionicons name="chevron-forward" size={12} color={palette.tint} />
        </Clickable>
      </View>
    );
  }

  return (
    <Clickable
      onPress={handleClubPress}
      style={[
        styles.clubBadge,
        { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.19) },
      ]}
      hitSlop={8}
    >
      <View style={[styles.clubBadgeIcon, { backgroundColor: palette.tint }]}>
        <ThemedText style={[styles.clubBadgeIconText, { color: palette.onPrimary }]}>
          {clubBadge?.slice(0, 2) || clubName.slice(0, 2).toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]} numberOfLines={1}>
        {clubName}
      </ThemedText>
      <Ionicons name="chevron-forward" size={12} color={palette.tint} />
    </Clickable>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  originBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  clubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingRight: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  clubBadgeIcon: {
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeIconText: {
    ...Typography.micro,
    fontSize: 8,
    letterSpacing: 0,
    textTransform: 'none',
  },
  clubBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    maxWidth: 150,
  },
});

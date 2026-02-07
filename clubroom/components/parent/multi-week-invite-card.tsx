/**
 * Multi-Week Invite Card
 *
 * Displayed when a recurring invite has weekSlots.
 * Each week is shown as a toggleable row (accept/decline per week).
 * Creates a BookingSeries for the accepted weeks only.
 */

import { useState, useCallback, memo } from 'react';
import { View, StyleSheet, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionInvite, WeekAcceptance } from '@/constants/types';
import { sessionInviteService } from '@/services/invite/session-invite-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MultiWeekInviteCard');

interface MultiWeekInviteCardProps {
  invite: SessionInvite;
  onResponded?: () => void;
}

function formatWeekDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
}

const WeekSeparator = () => <View style={{ height: Spacing.xs }} />;

const WeekToggleRow = memo(function WeekToggleRow({
  week,
  onToggle,
  palette,
}: {
  week: WeekAcceptance;
  onToggle: (weekDate: string) => void;
  palette: typeof Colors.light;
}) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(week.weekDate);
  }, [week.weekDate, onToggle]);

  return (
    <Clickable onPress={handlePress} style={[
      styles.weekRow,
      {
        backgroundColor: week.accepted ? withAlpha(palette.success, 0.04) : withAlpha(palette.muted, 0.04),
        borderColor: week.accepted ? withAlpha(palette.success, 0.2) : palette.border,
      },
    ]}>
      <View style={styles.weekRowLeft}>
        <ThemedText style={[Typography.smallSemiBold, { color: palette.text }]}>
          {formatWeekDate(week.weekDate)}
        </ThemedText>
        <View style={styles.weekDetailRow}>
          <Ionicons name="time-outline" size={12} color={palette.muted} />
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            {formatTime(week.startTime)} - {formatTime(week.endTime)}
          </ThemedText>
        </View>
        {week.location ? (
          <View style={styles.weekDetailRow}>
            <Ionicons name="location-outline" size={12} color={palette.tint} />
            <ThemedText style={[Typography.small, { color: palette.tint }]} numberOfLines={1}>
              {week.location}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <Ionicons
        name={week.accepted ? 'checkmark-circle' : 'close-circle-outline'}
        size={24}
        color={week.accepted ? palette.success : palette.muted}
      />
    </Clickable>
  );
});

export function MultiWeekInviteCard({
  invite,
  onResponded,
}: MultiWeekInviteCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const initialWeekSlots = invite.weekSlots ?? [];
  const [weekAcceptances, setWeekAcceptances] = useState<WeekAcceptance[]>(initialWeekSlots);
  const [submitting, setSubmitting] = useState(false);

  const acceptedCount = weekAcceptances.filter((w) => w.accepted).length;
  const totalCount = weekAcceptances.length;

  const handleToggle = useCallback((weekDate: string) => {
    setWeekAcceptances((prev) =>
      prev.map((w) =>
        w.weekDate === weekDate ? { ...w, accepted: !w.accepted } : w
      )
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const result = await sessionInviteService.respondToRecurringInvite(
        invite.id,
        weekAcceptances
      );

      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onResponded?.();
      } else {
        logger.error('Failed to respond to recurring invite', { error: result.error });
      }
    } catch (error) {
      logger.error('Error responding to recurring invite', error);
    } finally {
      setSubmitting(false);
    }
  }, [invite.id, weekAcceptances, onResponded]);

  const handleSelectAll = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWeekAcceptances((prev) => prev.map((w) => ({ ...w, accepted: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setWeekAcceptances((prev) => prev.map((w) => ({ ...w, accepted: false })));
  }, []);

  const coachFirstName = invite.coachName.split(' ')[0];
  const pricePerSession = invite.priceUsd ?? 0;
  const totalCost = pricePerSession * acceptedCount;

  const renderItem = useCallback(
    ({ item }: { item: WeekAcceptance }) => (
      <WeekToggleRow week={item} onToggle={handleToggle} palette={palette} />
    ),
    [handleToggle, palette]
  );

  const keyExtractor = useCallback((item: WeekAcceptance) => item.weekDate, []);

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <ThemedText style={[Typography.heading, { color: palette.tint }]}>
            {invite.coachName.split(' ').map((n) => n[0]).join('')}
          </ThemedText>
        </View>
        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold">
            Coach {coachFirstName} - {totalCount} Weeks
          </ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            {invite.sessionType} - {invite.focus}
          </ThemedText>
        </View>
      </View>

      {/* Athletes */}
      <View style={styles.athleteRow}>
        <Ionicons name="person-outline" size={16} color={palette.muted} />
        <ThemedText style={[Typography.small, { color: palette.text }]}>
          For: {invite.athleteNames.join(', ')}
        </ThemedText>
      </View>

      <Divider />

      {/* Selection controls */}
      <View style={styles.selectionControls}>
        <ThemedText style={[Typography.smallSemiBold, { color: palette.muted }]}>
          {acceptedCount} of {totalCount} weeks selected
        </ThemedText>
        <View style={styles.selectionButtons}>
          <Clickable onPress={handleSelectAll} style={styles.selectAllButton}>
            <ThemedText style={[Typography.small, { color: palette.tint }]}>
              Select All
            </ThemedText>
          </Clickable>
          <Clickable onPress={handleDeselectAll} style={styles.selectAllButton}>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              Clear
            </ThemedText>
          </Clickable>
        </View>
      </View>

      {/* Week rows */}
      <FlatList
        data={weekAcceptances}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        ItemSeparatorComponent={WeekSeparator}
      />

      <Divider />

      {/* Total */}
      <View style={styles.totalRow}>
        <ThemedText style={[Typography.smallSemiBold, { color: palette.muted }]}>
          Total ({acceptedCount} week{acceptedCount !== 1 ? 's' : ''})
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
          {'\u00A3'}{totalCost}
        </ThemedText>
      </View>

      {/* Action */}
      <Button
        variant="primary"
        onPress={handleSubmit}
        disabled={acceptedCount === 0 || submitting}
      >
        {submitting
          ? 'Booking...'
          : acceptedCount === 0
          ? 'Select weeks to accept'
          : `Accept ${acceptedCount} Week${acceptedCount !== 1 ? 's' : ''}`}
      </Button>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectAllButton: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  weekRowLeft: {
    flex: 1,
    gap: Spacing.micro,
  },
  weekDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

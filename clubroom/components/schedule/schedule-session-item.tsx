/**
 * ScheduleSessionItem — Individual session row within the day detail card.
 * Memoized for FlatList/map performance.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, type GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionData } from './schedule-types';
import { RsvpMiniBar } from '@/components/group/rsvp-mini-bar';
import { openLocationInMaps } from '@/utils/map-links';
import { uiFeedback } from '@/services/ui-feedback';

interface Props {
  session: SessionData;
  onPress: (session: SessionData) => void;
}

export const ScheduleSessionItem = memo(function ScheduleSessionItem({ session, onPress }: Props) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    onPress(session);
  }, [onPress, session]);
  const handleOpenMap = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      if (!session.location) return;

      void openLocationInMaps({ location: session.location }).then((opened) => {
        if (!opened) {
          uiFeedback.showToast('Could not open maps application.', 'error');
        }
      });
    },
    [session.location],
  );

  return (
    <Clickable
      onPress={handlePress}
      accessibilityLabel={`${session.athleteName || session.title} at ${session.time}`}
      style={[
        styles.item,
        {
          backgroundColor: colors.background,
          borderLeftColor: session.status === 'pending' ? colors.warning : colors.success,
        },
      ]}
    >
      <Column align="center" style={styles.timeCol}>
        <ThemedText type="defaultSemiBold" style={styles.timeText}>
          {session.time}
        </ThemedText>
        <ThemedText style={[styles.endTime, { color: colors.muted }]}>{session.endTime}</ThemedText>
      </Column>

      <Column flex gap="xxs">
        <Row align="center" gap="xs">
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.titleText}>
            {session.athleteName || session.title}
          </ThemedText>
          {session.type === 'offering' && session.athleteCount !== undefined && (
            <Row
              align="center"
              gap="micro"
              style={[styles.badge, { backgroundColor: withAlpha(colors.success, 0.1) }]}
            >
              <Ionicons name="people-outline" size={10} color={colors.success} />
              <ThemedText style={[styles.badgeText, { color: colors.success }]}>
                {session.athleteCount}
              </ThemedText>
            </Row>
          )}
          {session.seriesId && session.seriesTotalWeeks ? (
            <Row
              align="center"
              gap="micro"
              style={[styles.badge, { backgroundColor: withAlpha(colors.tint, 0.1) }]}
            >
              <Ionicons name="repeat-outline" size={10} color={colors.tint} />
              <ThemedText style={[styles.badgeText, { color: colors.tint }]}>
                {(session.seriesIndex ?? 0) + 1}/{session.seriesTotalWeeks}
              </ThemedText>
            </Row>
          ) : null}
        </Row>

        {session.location && (
          <Row align="center" gap="xxs">
            <Ionicons name="location-outline" size={12} color={colors.tint} />
            <ThemedText style={[styles.metaText, { color: colors.tint }]}>
              {session.location}
            </ThemedText>
          </Row>
        )}
        <Row
          align="center"
          gap="micro"
          style={[
            styles.contextBadge,
            {
              backgroundColor:
                session.businessContext === 'org'
                  ? withAlpha(colors.info, 0.1)
                  : withAlpha(colors.tint, 0.1),
            },
          ]}
        >
          <Ionicons
            name={session.businessContext === 'org' ? 'business-outline' : 'briefcase-outline'}
            size={10}
            color={session.businessContext === 'org' ? colors.info : colors.tint}
          />
          <ThemedText
            style={[
              styles.badgeText,
              { color: session.businessContext === 'org' ? colors.info : colors.tint },
            ]}
          >
            {session.businessLabel}
          </ThemedText>
        </Row>
        {session.isGroupSession && session.rsvpCounts && (
          <RsvpMiniBar counts={session.rsvpCounts} compact />
        )}
      </Column>

      <Row align="center" gap="xs">
        {session.location ? (
          <Clickable
            onPress={handleOpenMap}
            accessibilityLabel="Open training location in maps"
            style={[styles.mapButton, { backgroundColor: withAlpha(colors.tint, 0.08) }]}
          >
            <Ionicons name="navigate-outline" size={14} color={colors.tint} />
          </Clickable>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Row>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderLeftWidth: 3,
    gap: Spacing.md,
  },
  timeCol: {
    minWidth: 50,
  },
  timeText: {
    ...Typography.bodySemiBold,
  },
  endTime: {
    ...Typography.micro,
  },
  titleText: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  badgeText: {
    ...Typography.micro,
  },
  metaText: {
    ...Typography.caption,
  },
  mapButton: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
});

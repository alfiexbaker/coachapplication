/**
 * SessionRegistrations — Attendee roster for coach and registered athlete views.
 */
import { useState, useEffect, startTransition } from 'react';
import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { SessionOffering } from '@/constants/types';
import { getSessionRegistrationUserName } from '@/utils/session-display';

interface SessionRegistrationsProps {
  offering: SessionOffering;
  registeredCount: number;
  viewer: 'coach' | 'registered-athlete';
  currentUserId?: string;
  userNameMap?: Record<string, string>;
}

function SessionRegistrationsInner({
  offering,
  registeredCount,
  viewer,
  currentUserId,
  userNameMap,
}: SessionRegistrationsProps) {
  const { colors: palette } = useTheme();
  const confirmedRegistrations = offering.registrations.filter((r) => r.status === 'confirmed');
  const [visibleCount, setVisibleCount] = useState(10);
  // react-doctor-disable-next-line react-doctor/no-reset-all-state-on-prop-change -- pagination resets when the offering identity changes.
  useEffect(() => {
    startTransition(() => {
      setVisibleCount(10);
    });
  }, [offering.id]);
  const visibleRegistrations = confirmedRegistrations.slice(0, visibleCount);
  const remainingCount = Math.max(0, confirmedRegistrations.length - visibleCount);
  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, confirmedRegistrations.length));
  };
  const handleShowAll = () => {
    setVisibleCount(confirmedRegistrations.length);
  };
  const handleShowLess = () => {
    setVisibleCount(10);
  };
  const isCoachView = viewer === 'coach';
  const title = isCoachView
    ? `Registered Athletes (${registeredCount})`
    : `Who's attending (${registeredCount})`;

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {!isCoachView && (
        <ThemedText style={[styles.subhead, { color: palette.muted }]}>
          Visible only to athletes who are registered for this session.
        </ThemedText>
      )}
      {confirmedRegistrations.length === 0 ? (
        <ThemedText style={styles.emptyText}>No registrations yet</ThemedText>
      ) : (
        visibleRegistrations.map((reg) => {
          const athleteName = getSessionRegistrationUserName(reg, userNameMap);
          const initials = athleteName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('');
          const isCurrentUser = currentUserId ? reg.userId === currentUserId : false;

          return (
            <Row
              key={reg.id}
              align="center"
              gap="sm"
              style={[styles.registration, { borderBottomColor: palette.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
                <ThemedText style={[styles.avatarLabel, { color: palette.tint }]}>
                  {initials || 'A'}
                </ThemedText>
              </View>

              <View style={styles.nameBlock}>
                <ThemedText style={styles.regName} numberOfLines={1}>
                  {athleteName}
                </ThemedText>
                {!isCoachView && isCurrentUser && (
                  <View style={[styles.youPill, { backgroundColor: withAlpha(palette.success, 0.12) }]}>
                    <ThemedText style={[styles.youPillText, { color: palette.success }]}>You</ThemedText>
                  </View>
                )}
              </View>

              {isCoachView && (
                <ThemedText style={styles.regDate}>
                  {new Date(reg.bookedAt).toLocaleDateString()}
                </ThemedText>
              )}

              {!isCoachView && <Ionicons name="checkmark-circle" size={18} color={palette.success} />}
            </Row>
          );
        })
      )}
      {remainingCount > 0 && (
        <Clickable
          onPress={remainingCount <= 20 ? handleShowAll : handleShowMore}
          style={[styles.moreButton, { borderColor: palette.border }]}
        >
          <ThemedText style={[styles.moreButtonText, { color: palette.tint }]}>
            {remainingCount <= 20 ? `Show all (${confirmedRegistrations.length})` : 'Show 10 more'}
          </ThemedText>
        </Clickable>
      )}
      {visibleCount > 10 && confirmedRegistrations.length > 10 && (
        <Clickable
          onPress={handleShowLess}
          style={[styles.moreButton, { borderColor: palette.border }]}
        >
          <ThemedText style={[styles.moreButtonText, { color: palette.muted }]}>
            Show less
          </ThemedText>
        </Clickable>
      )}
    </SurfaceCard>
  );
}

export const SessionRegistrations = SessionRegistrationsInner;

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm, padding: Spacing.sm, gap: Spacing.sm },
  subhead: {
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
    marginTop: -Spacing.xxs,
  },
  emptyText: {
    fontSize: scaleFont(15),
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: Spacing.xxs,
    lineHeight: scaleFont(21),
  },
  registration: { paddingVertical: Spacing.xs + Spacing.xxs, borderBottomWidth: 1 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: scaleFont(13),
    fontWeight: '700',
  },
  nameBlock: {
    flex: 1,
    gap: Spacing.micro,
    minWidth: 0,
  },
  regName: {
    fontWeight: '600',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(21),
  },
  youPill: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
  },
  youPillText: {
    fontSize: scaleFont(11),
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  regDate: { fontSize: scaleFont(13), opacity: 0.5 },
  moreButton: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  moreButtonText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
});

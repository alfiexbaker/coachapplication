import { memo } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { GroupSession } from '@/constants/types';
import { getGroupSessionCoachName } from '@/utils/group-display';
import { Routes } from '@/navigation/routes';
import { openLocationInMaps } from '@/utils/map-links';

interface GroupSessionDetailsProps {
  session: GroupSession;
}

export const GroupSessionDetails = memo(function GroupSessionDetails({
  session,
}: GroupSessionDetailsProps) {
  const { colors } = useTheme();
  const coachName = getGroupSessionCoachName(session);
  const locationLabel = session.venueName
    ? `${session.venueName} · ${session.location}`
    : session.location;
  const handleOpenMap = () => {
    void openLocationInMaps({
      location: session.location,
      coordinates: session.locationCoordinates,
    }).then((opened) => {
      if (!opened) {
        Alert.alert('Error', 'Could not open maps application.');
      }
    });
  };

  return (
    <>
      {/* Description */}
      {session.description && (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.card}>
            <ThemedText type="defaultSemiBold">About</ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
              {session.description}
            </ThemedText>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Schedule */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold">Schedule</ThemedText>
          {session.schedule.map((sched, idx) => (
            <Row key={idx} gap="md" align="center">
              <View
                style={[styles.scheduleIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
              >
                <Ionicons name="calendar" size={16} color={colors.tint} />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">
                  {new Date(sched.date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </ThemedText>
                <ThemedText style={[Typography.small, { color: colors.muted }]}>
                  {sched.startTime} - {sched.endTime}
                </ThemedText>
              </View>
            </Row>
          ))}
        </SurfaceCard>
      </Animated.View>

      {/* Location */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <SurfaceCard style={styles.card}>
          <Clickable
            onPress={handleOpenMap}
            accessibilityLabel="Open training location in maps"
            style={styles.locationClickable}
          >
            <Row gap="md" align="center">
              <Ionicons name="location" size={20} color={colors.tint} />
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Location</ThemedText>
                <ThemedText style={{ color: colors.muted }}>{locationLabel}</ThemedText>
              </View>
              <Ionicons name="navigate-outline" size={18} color={colors.tint} />
            </Row>
          </Clickable>
        </SurfaceCard>
      </Animated.View>

      {/* Coach */}
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <SurfaceCard style={styles.card}>
          <Row gap="md" align="center">
            <View
              style={[
                styles.coachPhoto,
                { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Ionicons name="person" size={20} color={colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{coachName}</ThemedText>
              <ThemedText style={{ color: colors.muted }}>Coach</ThemedText>
            </View>
            <Clickable
              onPress={() => router.push(Routes.messagesWith({ coachId: session.coachId }))}
              style={[
                styles.messageButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Message coach ${coachName}`}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.tint} />
            </Clickable>
          </Row>
        </SurfaceCard>
      </Animated.View>

      {/* Requirements */}
      {(session.ageMin || session.ageMax || session.skillLevel || session.equipment?.length) && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <SurfaceCard style={styles.card}>
            <ThemedText type="defaultSemiBold">Requirements</ThemedText>
            {(session.ageMin || session.ageMax) && (
              <Row gap="xs" align="center">
                <Ionicons name="people-outline" size={16} color={colors.muted} />
                <ThemedText style={{ color: colors.muted }}>
                  Ages {session.ageMin || 'Any'} - {session.ageMax || 'Any'}
                </ThemedText>
              </Row>
            )}
            {session.skillLevel && session.skillLevel !== 'ALL' && (
              <Row gap="xs" align="center">
                <Ionicons name="star-outline" size={16} color={colors.muted} />
                <ThemedText style={{ color: colors.muted }}>{session.skillLevel} level</ThemedText>
              </Row>
            )}
            {session.equipment && session.equipment.length > 0 && (
              <Row gap="xs" align="center">
                <Ionicons name="bag-outline" size={16} color={colors.muted} />
                <ThemedText style={{ color: colors.muted }}>
                  Bring: {session.equipment.join(', ')}
                </ThemedText>
              </Row>
            )}
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Focus Areas */}
      {session.focus && session.focus.length > 0 && (
        <View style={styles.focusSection}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.xs }}>
            Focus Areas
          </ThemedText>
          <Row style={styles.focusRow}>
            {session.focus.map((f) => (
              <View
                key={f}
                style={[styles.focusTag, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
              >
                <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
                  {f}
                </ThemedText>
              </View>
            ))}
          </Row>
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachPhoto: { width: 48, height: 48, borderRadius: Radii.xl },
  locationClickable: { minHeight: 44, justifyContent: 'center' },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  focusSection: { marginTop: Spacing.sm },
  focusRow: { flexWrap: 'wrap', gap: Spacing.xs },
  focusTag: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
});

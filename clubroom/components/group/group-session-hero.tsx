import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { groupSessionService } from '@/services/group-session-service';
import { SESSION_TYPE_COLORS } from '@/hooks/use-group-session';
import type { GroupSession } from '@/constants/types';

interface GroupSessionHeroProps {
  session: GroupSession;
  isCoach: boolean;
}

export const GroupSessionHero = memo(function GroupSessionHero({
  session,
  isCoach,
}: GroupSessionHeroProps) {
  const { colors } = useTheme();
  const typeColor = SESSION_TYPE_COLORS[session.sessionType];

  return (
    <View style={styles.container}>
      {session.imageUrl ? (
        <Image source={{ uri: session.imageUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: typeColor }]}>
          <Ionicons name="calendar" size={48} color={withAlpha(colors.onPrimary, 0.6)} />
        </View>
      )}
      <View style={[styles.overlay, { backgroundColor: withAlpha(colors.text, 0.2) }]} />
      {isCoach && (
        <Clickable
          onPress={() => router.push(Routes.groupSessionRoster(session.id))}
          style={[styles.rosterButton, { backgroundColor: withAlpha(colors.text, 0.4) }]}
        >
          <Ionicons name="people" size={20} color={colors.onPrimary} />
        </Clickable>
      )}
      <Row gap="xs" style={styles.badgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
          <ThemedText style={[styles.typeText, { color: colors.onPrimary }]}>
            {groupSessionService.formatSessionType(session.sessionType)}
          </ThemedText>
        </View>
        {(session.status === 'CANCELLED' || session.status === 'COMPLETED') && (
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  session.status === 'CANCELLED' ? colors.error : colors.success,
              },
            ]}
          >
            <ThemedText style={[styles.typeText, { color: colors.onPrimary }]}>
              {session.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
            </ThemedText>
          </View>
        )}
      </Row>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: 'relative', height: 220 },
  image: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject },
  rosterButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
  },
  typeBadge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  typeText: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
});

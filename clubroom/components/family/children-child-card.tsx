/**
 * ChildrenChildCard — Primary profile card for a child.
 *
 * Entire card is pressable and opens the child's profile/development view.
 * Shows concise identity, profile signals, and core progress stats.
 */

import { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Routes } from '@/navigation/routes';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { POSITION_LABELS } from '@/constants/position-skills';
import { useTheme } from '@/hooks/useTheme';
import { childService, type ChildProfile, type Relationship } from '@/services/child-service';
import type { ChildStats } from '@/hooks/use-children-hub';

interface ChildrenChildCardProps {
  child: ChildProfile;
  stats: ChildStats;
  index: number;
  isActive?: boolean;
}

type ProfileSignalTone = 'neutral' | 'warning' | 'alert';

type ProfileSignal = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: ProfileSignalTone;
};

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  SON: 'Son',
  DAUGHTER: 'Daughter',
  WARD: 'Ward',
  GRANDCHILD: 'Grandchild',
  OTHER: 'Child',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function pluralize(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildSignals(child: ChildProfile): ProfileSignal[] {
  const signals: ProfileSignal[] = [];

  const supportCount = child.disabilities.length + child.specialNeeds.length;
  if (child.hasSpecialNeeds || supportCount > 0) {
    signals.push({
      id: 'support',
      icon: 'heart-outline',
      label: supportCount > 0 ? `${supportCount} support item${supportCount === 1 ? '' : 's'}` : 'Support plan',
      tone: 'warning',
    });
  }

  if (child.allergies.length > 0) {
    signals.push({
      id: 'allergies',
      icon: 'medical-outline',
      label: pluralize(child.allergies.length, 'allergy', 'allergies'),
      tone: 'alert',
    });
  }

  if (child.medicalConditions.length > 0) {
    signals.push({
      id: 'conditions',
      icon: 'fitness-outline',
      label: pluralize(child.medicalConditions.length, 'medical condition', 'medical conditions'),
      tone: 'warning',
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: 'clear',
      icon: 'checkmark-circle-outline',
      label: 'No key support alerts',
      tone: 'neutral',
    });
  }

  return signals.slice(0, 3);
}

export const ChildrenChildCard = memo(function ChildrenChildCard({
  child,
  stats,
  index,
  isActive = false,
}: ChildrenChildCardProps) {
  const { colors: palette } = useTheme();

  const fullName = `${child.firstName} ${child.lastName}`.trim();
  const displayName = child.nickname || child.firstName;
  const age = child.dateOfBirth ? childService.getAge(child.dateOfBirth) : null;

  const profileSignals = useMemo(() => buildSignals(child), [child]);
  const relationshipLabel = RELATIONSHIP_LABELS[child.relationship] ?? 'Child';
  const positionLabel = useMemo(() => {
    if (child.primaryPosition === null) {
      return 'Rotates';
    }
    if (child.primaryPosition) {
      return POSITION_LABELS[child.primaryPosition];
    }
    return null;
  }, [child.primaryPosition]);

  const handleOpenProfile = useCallback(async () => {
    await childService.setActiveChildId(child.id, displayName);
    router.push(Routes.developmentChildProgress(child.id));
  }, [child.id, displayName]);

  const supportToneStyles = useMemo(
    () => ({
      neutral: {
        backgroundColor: withAlpha(palette.tint, 0.06),
        iconColor: palette.tint,
        textColor: palette.tint,
      },
      warning: {
        backgroundColor: withAlpha(palette.warning, 0.08),
        iconColor: palette.warning,
        textColor: palette.warning,
      },
      alert: {
        backgroundColor: withAlpha(palette.error, 0.08),
        iconColor: palette.error,
        textColor: palette.error,
      },
    }),
    [palette.error, palette.tint, palette.warning],
  );

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).springify()}>
      <SurfaceCard
        onPress={handleOpenProfile}
        style={[
          styles.card,
          isActive && { borderWidth: 1.5, borderColor: withAlpha(palette.tint, 0.28) },
        ]}
        accessibilityLabel={`Open ${displayName}'s profile`}
        accessibilityHint="Shows development, badges, and feedback for this child."
      >
        <Row align="center" gap="md">
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {getInitials(fullName || displayName)}
            </ThemedText>
            {isActive && (
              <View style={[styles.activeBadge, { backgroundColor: palette.tint }]}>
                <Ionicons name="checkmark" size={10} color={palette.onPrimary} />
              </View>
            )}
          </View>

          <Column gap="micro" style={styles.infoFlex}>
            <Row align="center" gap="xs" wrap>
              <ThemedText type="defaultSemiBold" style={styles.childName} numberOfLines={1}>
                {displayName}
              </ThemedText>
              {age !== null && (
                <View style={[styles.metaPill, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
                  <ThemedText style={[styles.metaPillText, { color: palette.tint }]}>
                    {age} yrs
                  </ThemedText>
                </View>
              )}
              <View style={[styles.metaPill, { backgroundColor: withAlpha(palette.muted, 0.12) }]}>
                <ThemedText style={[styles.metaPillText, { color: palette.muted }]}>
                  {relationshipLabel}
                </ThemedText>
              </View>
              {positionLabel ? (
                <View style={[styles.metaPill, { backgroundColor: withAlpha(palette.info, 0.12) }]}>
                  <ThemedText style={[styles.metaPillText, { color: palette.info }]}>
                    {positionLabel}
                  </ThemedText>
                </View>
              ) : null}
              {isActive && (
                <View style={[styles.metaPill, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                  <ThemedText style={[styles.metaPillText, { color: palette.tint }]}>Active</ThemedText>
                </View>
              )}
            </Row>
            <ThemedText style={[styles.childMeta, { color: palette.muted }]} numberOfLines={1}>
              {fullName}
            </ThemedText>
          </Column>

          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Row>

        <Row gap="xs" wrap style={styles.signalsRow}>
          {profileSignals.map((signal) => {
            const tone = supportToneStyles[signal.tone];
            return (
              <Row
                key={signal.id}
                align="center"
                gap="xxs"
                style={[styles.signalChip, { backgroundColor: tone.backgroundColor }]}
              >
                <Ionicons name={signal.icon} size={13} color={tone.iconColor} />
                <ThemedText style={[styles.signalText, { color: tone.textColor }]}>
                  {signal.label}
                </ThemedText>
              </Row>
            );
          })}
        </Row>

        <Row style={[styles.statsRow, { borderTopColor: palette.border }]}>
          <Column style={styles.statCell} gap="micro">
            <ThemedText style={styles.statValue}>{stats.sessions}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
          </Column>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <Column style={styles.statCell} gap="micro">
            <ThemedText style={styles.statValue}>{stats.badges}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Badges
              {stats.unseenBadges > 0 ? ` (${stats.unseenBadges} new)` : ''}
            </ThemedText>
          </Column>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <Column style={styles.statCell} gap="micro">
            <ThemedText style={styles.statValue}>
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '--'}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Avg Rating</ThemedText>
          </Column>
        </Row>

        <Row
          align="center"
          justify="between"
          style={[styles.footerRow, { borderTopColor: palette.border }]}
        >
          <ThemedText style={[styles.footerHint, { color: palette.muted }]}>
            Tap to open profile
          </ThemedText>
          <Row align="center" gap="xxs">
            <Ionicons name="analytics-outline" size={14} color={palette.tint} />
            <ThemedText style={[styles.footerHintAccent, { color: palette.tint }]}>
              Progress & badges
            </ThemedText>
          </Row>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading,
  },
  activeBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoFlex: {
    flex: 1,
  },
  childName: {
    ...Typography.subheading,
  },
  childMeta: {
    ...Typography.small,
  },
  metaPill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  metaPillText: {
    ...Typography.micro,
  },
  signalsRow: {
    marginTop: -Spacing.xxs,
  },
  signalChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.rounded,
  },
  signalText: {
    ...Typography.caption,
  },
  statsRow: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    alignItems: 'stretch',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.bodySmallSemiBold,
  },
  statLabel: {
    ...Typography.caption,
  },
  divider: {
    width: 1,
    marginHorizontal: Spacing.xs,
  },
  footerRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  footerHint: {
    ...Typography.caption,
  },
  footerHintAccent: {
    ...Typography.caption,
    fontWeight: '600',
  },
});

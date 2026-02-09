import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

interface SessionOfferingCardProps {
  offering: SessionOffering;
  onPress?: () => void;
  showCoach?: boolean; // Show coach info (for athlete view)
  showCapacity?: boolean; // Show registration count (for coach view)
}

export function SessionOfferingCard({
  offering,
  onPress,
  showCoach = false,
  showCapacity = true
}: SessionOfferingCardProps) {
  const { colors: palette } = useTheme();

  const registeredCount = offering.registrations.filter(r => r.status === 'confirmed').length;
  const isFull = registeredCount >= offering.maxParticipants;
  const capacityText = `${registeredCount}/${offering.maxParticipants}`;

  const formatSchedule = () => {
    if (offering.isRecurring && offering.dayOfWeek !== undefined && offering.timeOfDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
    }
    const date = new Date(offering.scheduledAt);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {offering.title}
          </ThemedText>
          {offering.sessionType === 'group' && (
            <View style={[styles.typeBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
              <Ionicons name="people" size={12} color={palette.accent} />
              <ThemedText style={[styles.typeBadgeText, { color: palette.accent }]}>
                Group
              </ThemedText>
            </View>
          )}
          {offering.sessionType === '1on1' && (
            <View style={[styles.typeBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="person" size={12} color={palette.tint} />
              <ThemedText style={[styles.typeBadgeText, { color: palette.tint }]}>
                1:1
              </ThemedText>
            </View>
          )}
        </View>

        {showCoach && (
          <ThemedText style={styles.coachName}>with {offering.coachName}</ThemedText>
        )}
      </View>

      {offering.description && (
        <ThemedText style={styles.description} numberOfLines={2}>
          {offering.description}
        </ThemedText>
      )}

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color={palette.icon} />
          <ThemedText style={styles.detailText}>{formatSchedule()}</ThemedText>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color={palette.icon} />
          <ThemedText style={styles.detailText}>{offering.location}</ThemedText>
        </View>
      </View>

      {offering.footballSkill && (
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="football-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.detailText}>Focus: {offering.footballSkill}</ThemedText>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {offering.ageMin && offering.ageMax && (
          <View style={[styles.ageBadge, { backgroundColor: palette.border }]}>
            <ThemedText style={styles.ageText}>
              Ages {offering.ageMin}-{offering.ageMax}
            </ThemedText>
          </View>
        )}

        {showCapacity && offering.sessionType === 'group' && (
          <View style={[styles.capacityBadge, {
            backgroundColor: isFull ? withAlpha(palette.error, 0.09) : withAlpha(palette.success, 0.09)
          }]}>
            <ThemedText style={[styles.capacityText, {
              color: isFull ? palette.error : palette.success
            }]}>
              {isFull ? 'FULL' : showCoach
                ? `${registeredCount} attending · ${offering.maxParticipants - registeredCount} left`
                : `${capacityText} spots`}
            </ThemedText>
          </View>
        )}

        {offering.priceUsd !== undefined && offering.priceUsd > 0 && (
          <View style={styles.priceContainer}>
            <ThemedText style={styles.priceText}>£{offering.priceUsd}</ThemedText>
          </View>
        )}
      </View>

      {isFull && offering.status === 'active' && (
        <View style={[styles.fullOverlay, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
          <ThemedText style={[styles.fullText, { color: palette.error }]}>
            Session Full
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  header: {
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  title: {
    flex: 1,
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: scaleFont(25),
  },
  coachName: {
    fontSize: scaleFont(15),
    opacity: 0.6,
    fontWeight: '500',
    lineHeight: scaleFont(21),
    marginTop: Spacing.micro,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: scaleFont(15),
    opacity: 0.7,
    lineHeight: scaleFont(22),
    marginTop: Spacing.xxs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: Spacing.xxs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailText: {
    fontSize: scaleFont(14),
    flex: 1,
    opacity: 0.8,
    lineHeight: scaleFont(20),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  ageBadge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  ageText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  capacityBadge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  capacityText: {
    fontSize: scaleFont(13),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priceContainer: {
    marginLeft: 'auto',
  },
  priceText: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  fullOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm - 4,
    paddingVertical: Spacing.xs - 2,
    borderRadius: Radii.sm,
  },
  fullText: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

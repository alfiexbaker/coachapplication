import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
            <View style={[styles.typeBadge, { backgroundColor: `${palette.accent}15` }]}>
              <Ionicons name="people" size={12} color={palette.accent} />
              <ThemedText style={[styles.typeBadgeText, { color: palette.accent }]}>
                Group
              </ThemedText>
            </View>
          )}
          {offering.sessionType === '1on1' && (
            <View style={[styles.typeBadge, { backgroundColor: `${palette.tint}15` }]}>
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
            backgroundColor: isFull ? `${palette.error}15` : `${palette.success}15`
          }]}>
            <ThemedText style={[styles.capacityText, {
              color: isFull ? palette.error : palette.success
            }]}>
              {isFull ? 'FULL' : `${capacityText} spots`}
            </ThemedText>
          </View>
        )}

        {offering.priceUsd !== undefined && (
          <View style={styles.priceContainer}>
            <ThemedText style={styles.priceText}>${offering.priceUsd}</ThemedText>
          </View>
        )}
      </View>

      {isFull && offering.status === 'active' && (
        <View style={[styles.fullOverlay, { backgroundColor: `${palette.error}10` }]}>
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
    marginBottom: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    flex: 1,
    fontSize: 16,
  },
  coachName: {
    fontSize: 14,
    opacity: 0.7,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  ageBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  ageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  capacityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceContainer: {
    marginLeft: 'auto',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  fullOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  fullText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

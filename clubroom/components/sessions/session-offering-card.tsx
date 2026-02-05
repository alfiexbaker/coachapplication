import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

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

        {offering.priceUsd !== undefined && offering.priceUsd > 0 && (
          <View style={styles.priceContainer}>
            <ThemedText style={styles.priceText}>£{offering.priceUsd}</ThemedText>
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
    marginBottom: 16,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
    marginTop: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ageText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  capacityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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

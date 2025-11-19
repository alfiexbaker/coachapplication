import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { CoachProfile } from '@/constants/types';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDistance, formatNextAvailability, formatPriceRange } from '@/utils/format';

interface CoachCardProps {
  coach: CoachProfile;
  active?: boolean;
  onPress?: () => void;
}

type Palette = typeof Colors.light;
type IoniconName = keyof typeof Ionicons.glyphMap;

export function CoachCard({ coach, active, onPress }: CoachCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handlePress = () => {
    onPress?.();
  };

  return (
    <SurfaceCard
      accessibilityHint="Focus coach on map"
      onPress={handlePress}
      outlineGradient={
        active ? [palette.tint, palette.secondary] : undefined
      }
      style={[styles.card, styles.pressable]}
      gradientPadding={active ? 3 : 2}>
        <View style={styles.row}>
          <Image source={{ uri: coach.profilePhotoUrl }} style={styles.avatar} contentFit="cover" />
          <View style={styles.meta}>
            <ThemedText type="subtitle">{coach.fullName}</ThemedText>
            <InfoRow icon="location-outline" label={`${coach.city}, ${coach.state}`} color={palette.icon} />
            <InfoRow icon="navigate-outline" label={formatDistance(coach.distanceMiles)} color={palette.icon} />
            {coach.schoolName ? (
              <InfoRow icon="school-outline" label={coach.schoolName} color={palette.icon} />
            ) : null}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={palette.secondary} />
              <ThemedText type="defaultSemiBold" style={styles.ratingValue}>
                {coach.rating.average.toFixed(1)}
              </ThemedText>
              <ThemedText style={styles.ratingMeta}>({coach.rating.reviewCount})</ThemedText>
            </View>
          </View>
          <View style={styles.priceWrapper}>
            <View
              style={[
                styles.pricePill,
                {
                  borderColor: `${palette.tint}33`,
                  backgroundColor: scheme === 'light' ? `${palette.tint}18` : `${palette.tint}30`,
                  shadowColor: palette.tint,
                  shadowOpacity: scheme === 'light' ? 0.2 : 0.45,
                },
              ]}>
              <ThemedText type="defaultSemiBold">{formatPriceRange(coach.priceRange)}</ThemedText>
              <View style={styles.availabilityRow}>
                <Ionicons name="time-outline" size={12} color={palette.icon} />
                <ThemedText style={styles.priceHint}>
                  Next slot {formatNextAvailability(coach.nextAvailability)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
        <ThemedText style={styles.bio}>{coach.shortBio}</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
          style={styles.chipScroller}
          accessibilityLabel="Football focuses">
          {coach.footballFocuses.map((focus) => (
            <View
              key={focus}
              style={[
                styles.focusChip,
                {
                  borderColor: focusColorMap[focus],
                  backgroundColor: `${focusColorMap[focus]}18`,
                },
              ]}>
              <ThemedText style={[styles.chipLabel, { color: focusColorMap[focus] }]}>{focus}</ThemedText>
            </View>
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
          style={styles.chipScroller}>
          {coach.badges.map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.chip,
                {
                  backgroundColor: badgeToneBackground(badge.tone, palette),
                },
              ]}>
              <Ionicons name={badgeToneIcon(badge.tone)} size={14} color={badgeToneColor(badge.tone, palette)} />
              <ThemedText style={[styles.chipLabel, { color: badgeToneColor(badge.tone, palette) }]}>
                {badge.label}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
          style={styles.chipScroller}>
          {coach.sessionFormats.map((format) => (
            <View
              key={format}
              style={[
                styles.chip,
                {
                  backgroundColor: `${palette.icon}18`,
                },
              ]}>
              <Ionicons name={formatIconMap[format]} size={14} color={palette.text} />
              <ThemedText style={[styles.chipLabel, { color: palette.text }]}>{format}</ThemedText>
            </View>
          ))}
        </ScrollView>
    </SurfaceCard>
  );
}

const formatIconMap: Record<CoachProfile['sessionFormats'][number], IoniconName> = {
  'In-person': 'walk-outline',
  Virtual: 'videocam-outline',
  'Small group': 'people-outline',
};

const focusColorMap: Record<CoachProfile['footballFocuses'][number], string> = {
  Dribbling: '#F97316',
  Passing: '#0EA5E9',
  Defending: '#7C3AED',
  Finishing: '#EF4444',
  Goalkeeping: '#14B8A6',
  Conditioning: '#F59E0B',
};

function badgeToneColor(
  tone: CoachProfile['badges'][number]['tone'] = 'default',
  palette: Palette,
) {
  const toneColorMap = {
    success: palette.success,
    warning: palette.warning,
    default: palette.icon,
  } as const;
  return toneColorMap[tone];
}

function badgeToneBackground(
  tone: CoachProfile['badges'][number]['tone'] = 'default',
  palette: Palette,
) {
  return `${badgeToneColor(tone, palette)}22`;
}

function badgeToneIcon(tone: CoachProfile['badges'][number]['tone'] = 'default'): IoniconName {
  const iconMap = {
    success: 'ribbon-outline',
    warning: 'alert-circle-outline',
    default: 'sparkles-outline',
  } as const;
  return iconMap[tone];
}

interface InfoRowProps {
  icon: IoniconName;
  label: string;
  color: string;
}

function InfoRow({ icon, label, color }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color={color} />
      <ThemedText style={[styles.location, styles.infoLabel]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.md,
  },
  card: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  meta: {
    flex: 1,
    gap: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingValue: {
    marginLeft: 2,
  },
  ratingMeta: {
    opacity: 0.7,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radii.md,
  },
  location: {
    opacity: 0.8,
  },
  infoLabel: {
    flex: 1,
  },
  priceWrapper: {
    justifyContent: 'center',
  },
  pricePill: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: 172,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  priceHint: {
    opacity: 0.7,
  },
  bio: {
    opacity: 0.9,
  },
  chipScroller: {
    marginHorizontal: -Spacing.sm,
  },
  chipScrollContent: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  chipLabel: {
    fontWeight: '600',
  },
  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
});

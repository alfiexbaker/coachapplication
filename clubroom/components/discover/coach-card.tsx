import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
    <Animated.View entering={FadeInDown.duration(300).springify()}>
      <SurfaceCard
        accessibilityHint="View coach details"
        onPress={handlePress}
        outlineGradient={
          active ? [palette.tint, palette.secondary] : undefined
        }
        style={[styles.card, styles.pressable]}
        gradientPadding={active ? 2 : 0}>
          <View style={styles.row}>
            <Image source={{ uri: coach.profilePhotoUrl }} style={styles.avatar} contentFit="cover" />
            <View style={styles.meta}>
              <ThemedText type="subtitle">{coach.fullName}</ThemedText>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={12} color={palette.icon} />
                <ThemedText style={styles.infoText}>{formatDistance(coach.distanceMiles)} away</ThemedText>
                <View style={styles.dot} />
                <Ionicons name="star" size={12} color={palette.secondary} />
                <ThemedText style={styles.infoText}>{coach.rating.average.toFixed(1)}</ThemedText>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagRow}>
                {coach.footballFocuses.slice(0, 3).map((focus) => (
                  <View key={focus} style={[styles.tag, { backgroundColor: `${focusColorMap[focus]}20` }]}>
                    <ThemedText style={[styles.tagText, { color: focusColorMap[focus] }]}>{focus}</ThemedText>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={styles.priceColumn}>
              <ThemedText type="defaultSemiBold" style={styles.price}>{formatPriceRange(coach.priceRange)}</ThemedText>
              <ThemedText style={styles.priceLabel}>per session</ThemedText>
            </View>
          </View>
      </SurfaceCard>
    </Animated.View>
  );
}

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
    marginBottom: Spacing.sm,
  },
  card: {
    padding: Spacing.md,
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
  infoText: {
    fontSize: 13,
    opacity: 0.7,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#94A3B8',
    marginHorizontal: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  price: {
    fontSize: 16,
  },
  priceLabel: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  tagRow: {
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

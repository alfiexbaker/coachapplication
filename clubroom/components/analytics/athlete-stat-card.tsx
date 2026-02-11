import { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AthleteStatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  index: number;
}

export const AthleteStatCard = memo(function AthleteStatCard({
  icon,
  label,
  value,
  suffix,
  color,
  index,
}: AthleteStatCardProps) {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.09) }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <ThemedText type="heading" style={styles.value}>
        {value}
        {suffix && <ThemedText style={styles.suffix}>{suffix}</ThemedText>}
      </ThemedText>
      <ThemedText style={[styles.label, { color: colors.muted }]}>{label}</ThemedText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2,
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  value: { ...Typography.display },
  suffix: { ...Typography.bodySmall },
  label: { ...Typography.caption, marginTop: Spacing.micro },
});

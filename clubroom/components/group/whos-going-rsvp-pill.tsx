import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface RsvpPillProps {
  label: string;
  icon: string;
  isActive: boolean;
  activeColor: string;
  onPress: () => void;
  disabled: boolean;
}

export function RsvpPill({ label, icon, isActive, activeColor, onPress, disabled }: RsvpPillProps) {
  const { colors } = useTheme();

  return (
    <Clickable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pill,
        isActive
          ? { backgroundColor: withAlpha(activeColor, 0.15), borderColor: activeColor }
          : { backgroundColor: withAlpha(colors.muted, 0.06), borderColor: colors.border },
      ]}
      accessibilityLabel={`${label}${isActive ? ' selected' : ''}`}
      accessibilityState={{ selected: isActive }}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={14}
        color={isActive ? activeColor : colors.muted}
      />
      <ThemedText style={[Typography.caption, { color: isActive ? activeColor : colors.muted }]}>
        {label}
      </ThemedText>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
  },
});

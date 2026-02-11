import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { User } from '@/constants/app-types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface ChildSelectorProps {
  childOptions: User[];
  selectedChildId?: string;
  onSelectChild: (childId: string) => void;
  autoSelected?: boolean;
}

export function ChildSelector({
  childOptions,
  selectedChildId,
  onSelectChild,
  autoSelected,
}: ChildSelectorProps) {
  const { colors: palette } = useTheme();

  // If only one child (auto-selected), show simple banner
  if (autoSelected && childOptions.length === 1) {
    const child = childOptions[0];
    return (
      <Row
        style={[
          styles.banner,
          {
            backgroundColor: withAlpha(palette.tint, 0.06),
            borderColor: withAlpha(palette.tint, 0.19),
          },
        ]}
      >
        <Ionicons name="person" size={16} color={palette.tint} />
        <ThemedText style={[styles.bannerText, { color: palette.tint }]}>
          Session for {child.name}
        </ThemedText>
        <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
      </Row>
    );
  }

  // Multiple children - show minimal selector
  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: palette.muted }]}>ATHLETE</ThemedText>
      <Row style={styles.options}>
        {childOptions.map((child) => {
          const isSelected = child.id === selectedChildId;
          return (
            <Clickable
              key={child.id}
              onPress={() => onSelectChild(child.id)}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.optionText,
                  {
                    color: isSelected ? palette.onPrimary : palette.text,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {child.name}
              </ThemedText>
              {isSelected && <Ionicons name="checkmark" size={18} color={palette.onPrimary} />}
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  bannerText: { ...Typography.bodySmallSemiBold, flex: 1 },
  container: {
    gap: Spacing.xs,
  },
  label: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.8 },
  options: {
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  option: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  optionText: { ...Typography.body, letterSpacing: -0.2 },
});

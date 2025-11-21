import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { User } from '@/constants/app-types';

interface ChildSelectorProps {
  children: User[];
  selectedChildId?: string;
  onSelectChild: (childId: string) => void;
  autoSelected?: boolean;
}

export function ChildSelector({ children, selectedChildId, onSelectChild, autoSelected }: ChildSelectorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // If only one child (auto-selected), show simple banner
  if (autoSelected && children.length === 1) {
    const child = children[0];
    return (
      <View style={[styles.banner, { backgroundColor: palette.tint + '10', borderColor: palette.tint + '30' }]}>
        <Ionicons name="person" size={16} color={palette.tint} />
        <ThemedText style={[styles.bannerText, { color: palette.tint }]}>
          Session for {child.name}
        </ThemedText>
        <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
      </View>
    );
  }

  // Multiple children - show minimal selector
  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: palette.muted }]}>
        ATHLETE
      </ThemedText>
      <View style={styles.options}>
        {children.map((child) => {
          const isSelected = child.id === selectedChildId;
          return (
            <Pressable
              key={child.id}
              onPress={() => onSelectChild(child.id)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText
                style={[
                  styles.optionText,
                  {
                    color: isSelected ? '#fff' : palette.text,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}>
                {child.name}
              </ThemedText>
              {isSelected && (
                <Ionicons name="checkmark" size={18} color="#fff" />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  options: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
});

import { ScrollView, StyleSheet, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Child {
  childId: string;
  childName: string;
}

interface ChildSwitcherProps {
  childrenList: Child[];
  selectedId: string | null;
  onSelect: (childId: string | null) => void;
  showAll?: boolean; // Set false to hide "All" option (e.g., for badges)
}

export function ChildSwitcher({ childrenList, selectedId, onSelect, showAll = true }: ChildSwitcherProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const renderPill = (id: string | null, label: string) => {
    const isActive = selectedId === id;

    return (
      <Pressable
        key={id ?? 'all'}
        onPress={() => onSelect(id)}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: isActive ? palette.tint : 'transparent',
            borderColor: isActive ? palette.tint : palette.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.pillText,
            {
              color: isActive ? '#FFFFFF' : palette.text,
              fontWeight: isActive ? '600' : '500',
            },
          ]}
        >
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {showAll && renderPill(null, 'All')}
        {childrenList.map((child) => renderPill(child.childId, child.childName))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
});

/**
 * ChildSwitcher — Low-noise horizontal focus picker.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface SwitcherChild {
  id: string;
  name: string;
  initials: string;
  colorCode?: string;
}

interface ChildSwitcherProps {
  options: SwitcherChild[];
  selectedId: string | undefined;
  onSelect: (childId: string) => void;
  activeChildId?: string | null;
}

function debounce<T extends (...args: never[]) => void>(fn: T, waitMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), waitMs);
  };
}

function ChildSwitcherInner({
  options,
  selectedId,
  onSelect,
  activeChildId,
}: ChildSwitcherProps) {
  const { colors: palette } = useTheme();
  const [isSwitching, setIsSwitching] = useState(false);
  const [pendingChildId, setPendingChildId] = useState<string | null>(null);
  const debouncedSwitchRef = useRef<(childId: string) => void>(() => {});

  useEffect(() => {
    debouncedSwitchRef.current = debounce((childId: string) => {
      void (async () => {
        setIsSwitching(true);
        try {
          await Promise.resolve(onSelect(childId));
        } finally {
          setIsSwitching(false);
          setPendingChildId(null);
        }
      })();
    }, 300);
  }, [onSelect]);

  const handleSelect = useCallback(
    (childId: string) => {
      if (isSwitching) return;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setPendingChildId(childId);
      debouncedSwitchRef.current(childId);
    },
    [isSwitching],
  );

  if (options.length <= 1) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: withAlpha(palette.surface, 0.92),
          borderColor: withAlpha(palette.border, 0.9),
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((child) => {
          const isSelected = child.id === selectedId;
          const isActiveChild = child.id === activeChildId;
          const isPending = pendingChildId === child.id && isSwitching;
          const accentColor = child.colorCode || palette.tint;

          return (
            <Clickable
              key={child.id}
              onPress={() => handleSelect(child.id)}
              disabled={isSwitching}
              style={[
                styles.chip,
                {
                  borderColor: isSelected ? withAlpha(accentColor, 0.35) : palette.border,
                  backgroundColor: isSelected
                    ? withAlpha(accentColor, 0.12)
                    : withAlpha(palette.surface, 0.45),
                },
              ]}
              accessibilityRole="tab"
              accessibilityLabel={`View progress for ${child.name}`}
              accessibilityState={{ selected: isSelected, disabled: isSwitching }}
            >
              <Row align="center" gap="xs">
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isSelected ? accentColor : withAlpha(accentColor, 0.55),
                    },
                  ]}
                />

                <ThemedText
                  style={[
                    styles.chipName,
                    { color: isSelected ? palette.text : palette.muted },
                    isSelected && styles.chipNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {child.name}
                </ThemedText>

                {isPending ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : isSelected ? (
                  <Ionicons name="checkmark" size={12} color={accentColor} />
                ) : null}
                {isActiveChild && !isSelected && !isPending && (
                  <View
                    style={[
                      styles.activeHint,
                      { borderColor: withAlpha(accentColor, 0.5) },
                    ]}
                  />
                )}
              </Row>
            </Clickable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const ChildSwitcher = memo(ChildSwitcherInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  scrollContent: {
    gap: Spacing.xs,
  },
  chip: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    minHeight: 34,
    borderWidth: 1,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  activeHint: {
    width: 7,
    height: 7,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  chipName: {
    ...Typography.caption,
    fontWeight: '600',
  },
  chipNameActive: {
    fontWeight: '700',
  },
});

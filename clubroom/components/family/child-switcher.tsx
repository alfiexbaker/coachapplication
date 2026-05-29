/**
 * ChildSwitcher — Low-noise horizontal focus picker.
 */

import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { runAsyncFinally } from '@/utils/async-control';
import { ChildSwitcherList } from './child-switcher-list';

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

function ChildSwitcherInner({ options, selectedId, onSelect, activeChildId }: ChildSwitcherProps) {
  const { colors: palette } = useTheme();
  const [isSwitching, setIsSwitching] = useState(false);
  const [pendingChildId, setPendingChildId] = useState<string | null>(null);
  const debouncedSwitchRef = useRef<(childId: string) => void>(() => {});

  useEffect(() => {
    debouncedSwitchRef.current = debounce((childId: string) => {
      void (async () => {
        setIsSwitching(true);

        await runAsyncFinally(
          async () => {
            await Promise.resolve(onSelect(childId));
          },
          () => {
            setIsSwitching(false);
            setPendingChildId(null);
          },
        );
      })();
    }, 300);
  }, [onSelect]);

  const handleSelect = (childId: string) => {
    if (isSwitching) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPendingChildId(childId);
    debouncedSwitchRef.current(childId);
  };

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
      <ChildSwitcherList
        options={options}
        selectedId={selectedId}
        activeChildId={activeChildId}
        pendingChildId={pendingChildId}
        isSwitching={isSwitching}
        palette={palette}
        onSelect={handleSelect}
      />
    </View>
  );
}

export const ChildSwitcher = ChildSwitcherInner;

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
});

/**
 * ChildSelector — Child picker for multi-kid parents.
 *
 * Shows pill chips for each child. Selected child highlighted with tint color.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChildOption } from '@/hooks/use-group-session';

interface ChildSelectorProps {
  options: ChildOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function ChildSelectorComponent({ options, selectedId, onSelect }: ChildSelectorProps) {
  const { colors } = useTheme();

  if (options.length === 0) return null;

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold">Select Child</ThemedText>
      <Row gap="xs" style={{ marginTop: Spacing.xs, flexWrap: 'wrap' }}>
        {options.map((child) => {
          const isSelected = child.id === selectedId;
          return (
            <Clickable
              key={child.id}
              onPress={() => onSelect(child.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.tint : withAlpha(colors.muted, 0.06),
                  borderColor: isSelected ? colors.tint : colors.border,
                },
              ]}
              accessibilityLabel={`Select ${child.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Row align="center" gap="xs">
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(colors.onPrimary, 0.25)
                        : withAlpha(colors.tint, 0.12),
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      Typography.micro,
                      { color: isSelected ? colors.onPrimary : colors.tint, fontSize: 10 },
                    ]}
                  >
                    {child.initials}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    Typography.bodySmallSemiBold,
                    { color: isSelected ? colors.onPrimary : colors.text },
                  ]}
                >
                  {child.name}
                </ThemedText>
              </Row>
            </Clickable>
          );
        })}
      </Row>
    </SurfaceCard>
  );
}

export const ChildSelector = memo(ChildSelectorComponent);

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

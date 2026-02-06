import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SelectionTileProps {
  title: string;
  description?: string;
  meta?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress: () => void;
  rightAdornment?: ReactNode;
  layout?: 'row' | 'column';
}

export function SelectionTile({
  title,
  description,
  meta,
  iconName,
  selected = false,
  onPress,
  rightAdornment,
  layout = 'row',
}: SelectionTileProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Clickable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          borderColor: selected ? palette.tint : palette.border,
          backgroundColor: selected ? withAlpha(palette.tint, 0.07) : palette.surface,
          opacity: pressed ? 0.85 : 1,
          flexDirection: layout === 'row' ? 'row' : 'column',
        },
      ]}
    >
      <View style={[styles.content, layout === 'row' ? styles.rowContent : undefined]}>
        {iconName && (
          <View style={[styles.icon, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
            <Ionicons name={iconName} size={22} color={palette.tint} />
          </View>
        )}
        <View style={styles.copy}>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          {description ? <ThemedText style={{ color: palette.muted }}>{description}</ThemedText> : null}
          {meta ? (
            <ThemedText style={[styles.meta, { color: selected ? palette.tint : palette.muted }]}>{meta}</ThemedText>
          ) : null}
        </View>
      </View>
      {rightAdornment}
    </Clickable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1.25,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    gap: Spacing.xs / 2,
    alignSelf: 'stretch',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  copy: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { ...Typography.caption },
});

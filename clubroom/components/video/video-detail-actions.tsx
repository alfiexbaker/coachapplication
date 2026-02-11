import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface VideoDetailActionsProps {
  colors: ThemeColors;
  visibility: string;
  onAddAnnotation: () => void;
  onToggleVisibility: () => void;
}

export const VideoDetailActions = memo(function VideoDetailActions({
  colors,
  visibility,
  onAddAnnotation,
  onToggleVisibility,
}: VideoDetailActionsProps) {
  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold">Actions</ThemedText>
      <Row gap="sm">
        <Clickable
          onPress={onAddAnnotation}
          style={[styles.actionButton, { borderColor: colors.border }]}
        >
          <Ionicons name="bookmark-outline" size={18} color={colors.tint} />
          <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Add Annotation</ThemedText>
        </Clickable>
        <Clickable
          onPress={onToggleVisibility}
          style={[styles.actionButton, { borderColor: colors.border }]}
        >
          <Ionicons
            name={visibility === 'PRIVATE' ? 'share-outline' : 'lock-closed-outline'}
            size={18}
            color={colors.text}
          />
          <ThemedText style={{ fontWeight: '600' }}>
            {visibility === 'PRIVATE' ? 'Share' : 'Make Private'}
          </ThemedText>
        </Clickable>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});

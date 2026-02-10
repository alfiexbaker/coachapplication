import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Attachment } from '@/constants/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove?: () => void;
  compact?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIcon(type: string) {
  switch (type) {
    case 'IMAGE': return 'image';
    case 'VIDEO': return 'videocam';
    case 'DOCUMENT': return 'document';
    default: return 'attach';
  }
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const AttachmentPreview = memo(function AttachmentPreview({
  attachment,
  onRemove,
  compact = false,
}: AttachmentPreviewProps) {
  const { colors: palette } = useTheme();
  const iconName = getIcon(attachment.type) as keyof typeof Ionicons.glyphMap;

  if (compact) {
    return (
      <Row align="center" gap="xs" style={[styles.compactPreview, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Ionicons name={iconName} size={14} color={palette.tint} />
        <ThemedText style={styles.compactName} numberOfLines={1}>{attachment.name}</ThemedText>
        {onRemove && (
          <Clickable accessibilityLabel="Remove attachment" onPress={onRemove}>
            <Ionicons name="close-circle" size={16} color={palette.muted} />
          </Clickable>
        )}
      </Row>
    );
  }

  return (
    <Row align="center" gap="md" style={[styles.previewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {attachment.type === 'IMAGE' && attachment.thumbnailUrl ? (
        <Image source={{ uri: attachment.thumbnailUrl }} style={styles.previewImage} />
      ) : (
        <View style={[styles.previewPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name={iconName} size={32} color={palette.tint} />
        </View>
      )}
      <View style={styles.previewInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>{attachment.name}</ThemedText>
        <ThemedText style={[styles.previewMeta, { color: palette.muted }]}>
          {attachment.type} {formatSize(attachment.size)}
        </ThemedText>
      </View>
      {onRemove && (
        <Clickable accessibilityLabel="Remove attachment" onPress={onRemove} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={18} color={palette.error} />
        </Clickable>
      )}
    </Row>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactPreview: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.sm, borderWidth: 1, maxWidth: 150 },
  compactName: { ...Typography.caption, flex: 1 },
  previewCard: { padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  previewImage: { width: 48, height: 48, borderRadius: Radii.sm },
  previewPlaceholder: { width: 48, height: 48, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  previewInfo: { flex: 1, gap: Spacing.micro },
  previewMeta: { ...Typography.caption },
  removeButton: { padding: Spacing.xs },
});

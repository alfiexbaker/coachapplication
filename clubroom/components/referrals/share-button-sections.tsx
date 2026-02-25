import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── SharePreview ───────────────────────────────────────────────

export interface SharePreviewProps {
  code: string;
  userName: string;
  creditAmount: number;
}

export const SharePreview = memo(function SharePreview({
  code: _code,
  userName: _userName,
  creditAmount: _creditAmount,
}: SharePreviewProps) {
  const { colors: palette } = useTheme();

  return (
    <Row align="center" gap="xs" style={[styles.previewContainer, { backgroundColor: palette.background }]}>
      <Ionicons name="chatbubble-outline" size={16} color={palette.muted} />
      <Ionicons
        name="document-text-outline"
        size={14}
        color={palette.muted}
        style={styles.previewIcon}
      />
      <Ionicons name="link-outline" size={14} color={palette.tint} style={styles.previewIcon} />
    </Row>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  previewContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  previewIcon: {
    marginLeft: Spacing.xxs,
  },
});

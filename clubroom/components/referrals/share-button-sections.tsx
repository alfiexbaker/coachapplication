import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <View style={[styles.previewContainer, { backgroundColor: palette.background }]}>
      <Ionicons name="chatbubble-outline" size={16} color={palette.muted} />
      <Ionicons
        name="document-text-outline"
        size={14}
        color={palette.muted}
        style={styles.previewIcon}
      />
      <Ionicons name="link-outline" size={14} color={palette.tint} style={styles.previewIcon} />
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: Spacing.xs,
  },
  previewIcon: {
    marginLeft: Spacing.xxs,
  },
});

import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii } from '@/constants/theme';
import { referralService } from '@/services/referral-service';
import { useTheme } from '@/hooks/useTheme';

// ─── SharePreview ───────────────────────────────────────────────

export interface SharePreviewProps {
  code: string;
  userName: string;
  creditAmount: number;
}

export const SharePreview = memo(function SharePreview({
  code,
  userName,
  creditAmount,
}: SharePreviewProps) {
  const { colors: palette } = useTheme();

  // Generate share content (used for display purposes)
  referralService.getShareMessage(code, userName, creditAmount);
  referralService.getShareUrl(code);

  return (
    <Clickable style={[styles.previewContainer, { backgroundColor: palette.background }]}>
      <Ionicons name="chatbubble-outline" size={16} color={palette.muted} />
      <Ionicons
        name="document-text-outline"
        size={14}
        color={palette.muted}
        style={styles.previewIcon}
      />
      <Ionicons name="link-outline" size={14} color={palette.tint} style={styles.previewIcon} />
    </Clickable>
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

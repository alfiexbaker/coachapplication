import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { ShareButton } from './ShareButton';
import { Spacing, Radii, Components, withAlpha } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import type { ReferralCode } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── CompactCodeCard ────────────────────────────────────────────

export interface CompactCodeCardProps {
  referralCode: ReferralCode;
  userName: string;
  copied: boolean;
  onCopy: () => void;
  onShare?: () => void;
  palette: ThemeColors;
}

export const CompactCodeCard = memo(function CompactCodeCard({
  referralCode,
  userName,
  copied,
  onCopy,
  onShare,
  palette,
}: CompactCodeCardProps) {
  return (
    <SurfaceCard style={styles.compactCard}>
      <View style={styles.compactContent}>
        <View style={styles.compactLeft}>
          <ThemedText style={[styles.compactLabel, { color: palette.muted }]}>
            Your code
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.compactCode}>
            {referralCode.code}
          </ThemedText>
        </View>
        <View style={styles.compactActions}>
          <Clickable
            onPress={onCopy}
            style={[styles.iconButton, { backgroundColor: palette.surface }]}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={20}
              color={copied ? palette.success : palette.icon}
            />
          </Clickable>
          <ShareButton
            code={referralCode.code}
            userName={userName}
            creditAmount={referralCode.creditAmount}
            variant="icon"
            onShare={onShare}
          />
        </View>
      </View>
    </SurfaceCard>
  );
});

// ─── CodeDisplay ────────────────────────────────────────────────

export interface CodeDisplayProps {
  code: string;
  copied: boolean;
  onCopy: () => void;
  palette: ThemeColors;
}

export const CodeDisplay = memo(function CodeDisplay({
  code,
  copied,
  onCopy,
  palette,
}: CodeDisplayProps) {
  return (
    <View style={[styles.codeContainer, { backgroundColor: palette.background }]}>
      <ThemedText style={[styles.codeLabel, { color: palette.muted }]}>
        Your referral code
      </ThemedText>
      <View style={styles.codeRow}>
        <ThemedText type="title" style={styles.code}>
          {code}
        </ThemedText>
        <Clickable
          onPress={onCopy}
          style={[
            styles.copyButton,
            { backgroundColor: copied ? withAlpha(palette.success, 0.09) : palette.surface },
          ]}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={20}
            color={copied ? palette.success : palette.icon}
          />
          <ThemedText
            style={[
              styles.copyText,
              { color: copied ? palette.success : palette.text },
            ]}
          >
            {copied ? 'Copied!' : 'Copy'}
          </ThemedText>
        </Clickable>
      </View>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactCard: {
    padding: Components.card.padding,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    gap: Spacing.micro,
  },
  compactLabel: {
    fontSize: scaleFont(11),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactCode: {
    fontSize: scaleFont(18),
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  compactActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeContainer: {
    padding: Components.card.padding,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  codeLabel: {
    fontSize: scaleFont(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  code: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    gap: Spacing.xxs,
  },
  copyText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
});

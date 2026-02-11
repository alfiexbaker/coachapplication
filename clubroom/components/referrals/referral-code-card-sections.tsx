import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
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
      <Row align="center" justify="space-between">
        <View style={styles.compactLeft}>
          <ThemedText style={[styles.compactLabel, { color: palette.muted }]}>Your code</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.compactCode}>
            {referralCode.code}
          </ThemedText>
        </View>
        <Row gap="xs">
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
        </Row>
      </Row>
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
      <Row align="center" justify="space-between" gap="md">
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
          <ThemedText style={[styles.copyText, { color: copied ? palette.success : palette.text }]}>
            {copied ? 'Copied!' : 'Copy'}
          </ThemedText>
        </Clickable>
      </Row>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactCard: {
    padding: Components.card.padding,
  },
  // compactContent: layout moved to Row props
  // compactActions: layout moved to Row props
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
  // compactActions removed — layout moved to Row
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
  // codeRow removed — layout moved to Row props
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

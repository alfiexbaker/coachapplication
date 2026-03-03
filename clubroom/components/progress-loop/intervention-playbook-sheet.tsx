import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachFollowUpItem } from '@/services/progress/progress-practice-task-service';

function buildFlagReasons(row: CoachFollowUpItem): string[] {
  const reasons: string[] = [];
  if (row.overdueCount > 0) {
    reasons.push(`${row.overdueCount} overdue task${row.overdueCount > 1 ? 's' : ''}`);
  }
  if (row.dueSoonCount > 0) {
    reasons.push(`${row.dueSoonCount} due soon today`);
  }
  if (row.latestConfidence != null && row.latestConfidence <= 2) {
    reasons.push(`confidence ${row.latestConfidence}/5`);
  }
  if (row.latestMood != null && row.latestMood <= 2) {
    reasons.push(`mood ${row.latestMood}/5`);
  }
  if (reasons.length === 0) {
    reasons.push('watchlist trend');
  }
  return reasons;
}

interface InterventionPlaybookSheetProps {
  row: CoachFollowUpItem | null;
  isBusy: boolean;
  onClose: () => void;
  onMessage: (row: CoachFollowUpItem) => Promise<void>;
  onSetRecoveryCheckpoint: (row: CoachFollowUpItem) => Promise<void>;
  onOpenHistory: (row: CoachFollowUpItem) => Promise<void>;
}

export const InterventionPlaybookSheet = memo(function InterventionPlaybookSheet({
  row,
  isBusy,
  onClose,
  onMessage,
  onSetRecoveryCheckpoint,
  onOpenHistory,
}: InterventionPlaybookSheetProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['46%', '76%'], []);

  useEffect(() => {
    if (!row) {
      sheetRef.current?.close();
      return;
    }
    sheetRef.current?.snapToIndex(0);
  }, [row]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index < 0) {
        onClose();
      }
    },
    [onClose],
  );

  const reasons = useMemo(() => (row ? buildFlagReasons(row) : []), [row]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={[
        styles.sheetBackground,
        {
          backgroundColor: colors.surface,
        },
      ]}
      handleIndicatorStyle={[
        styles.handle,
        {
          backgroundColor: withAlpha(colors.muted, 0.34),
        },
      ]}
    >
      {!row ? (
        <BottomSheetView style={styles.content} />
      ) : (
        <BottomSheetView style={styles.content}>
          <Column gap="sm">
            <Column gap="xxs">
              <ThemedText style={styles.title} numberOfLines={1}>
                Intervention playbook
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
                {row.athleteName} needs follow-up now
              </ThemedText>
            </Column>

            <Column gap="xxs">
              <ThemedText style={styles.sectionTitle}>Why flagged</ThemedText>
              <Row gap="xs" wrap>
                {reasons.map((reason) => (
                  <View
                    key={reason}
                    style={[
                      styles.reasonPill,
                      {
                        borderColor: withAlpha(colors.warning, 0.4),
                        backgroundColor: withAlpha(colors.warning, 0.12),
                      },
                    ]}
                  >
                    <ThemedText style={[styles.reasonText, { color: colors.warning }]}>{reason}</ThemedText>
                  </View>
                ))}
              </Row>
            </Column>

            <ThemedText style={[styles.recommendation, { color: colors.text }]} numberOfLines={1}>
              {row.recommendedAction}
            </ThemedText>

            <Clickable
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                void onMessage(row);
              }}
              disabled={isBusy}
              accessibilityLabel={`Send message to ${row.athleteName}`}
            >
              <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Send message</ThemedText>
            </Clickable>

            <Clickable
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => {
                void onSetRecoveryCheckpoint(row);
              }}
              disabled={isBusy}
              accessibilityLabel={`Set 48 hour recovery checkpoint for ${row.athleteName}`}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: colors.text }]}>
                Set 48h recovery checkpoint
              </ThemedText>
            </Clickable>

            <Clickable
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => {
                void onOpenHistory(row);
              }}
              disabled={isBusy}
              accessibilityLabel={`Open ${row.athleteName} session history`}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: colors.text }]}>Open session history</ThemedText>
            </Clickable>
          </Column>
        </BottomSheetView>
      )}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: Radii['2xl'],
    borderTopRightRadius: Radii['2xl'],
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: Radii.pill,
  },
  content: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing['2xl'],
  },
  title: {
    ...Typography.bodySemiBold,
  },
  subtitle: {
    ...Typography.caption,
  },
  sectionTitle: {
    ...Typography.caption,
  },
  reasonPill: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
  },
  reasonText: {
    ...Typography.micro,
  },
  recommendation: {
    ...Typography.bodySmall,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  primaryButtonText: {
    ...Typography.bodySmallSemiBold,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  secondaryButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});

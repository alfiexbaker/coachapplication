/**
 * Dynamic Comparison Screen
 *
 * Displays comparison for specific coach IDs passed in the URL.
 * URL format: /compare/coach1,coach2,coach3
 */

import { useCallback, useMemo, type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { ComparisonTable } from '@/components/compare/ComparisonTable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('CompareScreen');

export default function DynamicCompareScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });

  // Parse coach IDs from comma-separated string
  const coachIds = useMemo(() => (ids ? ids.split(',').filter(Boolean) : []), [ids]);

  const handleCoachRemoved = useCallback(
    (removedId: string) => {
      const remainingIds = coachIds.filter((id) => id !== removedId);
      if (remainingIds.length === 0) {
        router.back();
      } else {
        router.replace(Routes.compareCoaches(remainingIds.join(',')));
      }
    },
    [coachIds],
  );

  const handleShare = useCallback(async () => {
    logger.press('ShareComparison', { coachCount: coachIds.length });
    const shareUrl = `clubroom://compare/${coachIds.join(',')}`;
    try {
      await Share.share({
        message: `Compare these coaches on Clubroom: ${shareUrl}`,
        url: shareUrl,
        title: 'Coach Comparison',
      });
    } catch (error) {
      logger.error('Failed to share', error);
      uiFeedback.alert('Share', `Share this link: ${shareUrl}`);
    }
  }, [coachIds]);
  const renderBackAction = () => (
    <Clickable
      accessibilityLabel="Go back"
      onPress={() => router.back()}
      style={({ pressed }) => [
        styles.backButton,
        {
          backgroundColor: pressed ? palette.tintPressed : palette.tint,
        },
      ]}
    >
      <Row align="center" gap="xs">
        <Ionicons name="arrow-back" size={18} color={palette.onPrimary} />
        <ThemedText style={[styles.backButtonText, { color: palette.onPrimary }]}>Go Back</ThemedText>
      </Row>
    </Clickable>
  );
  const renderErrorState = (icon: ReactNode, title: string, message: string) => (
    <View style={styles.errorState}>
      <View style={[styles.errorIcon, { backgroundColor: palette.surfaceSecondary }]}>{icon}</View>
      <ThemedText type="subtitle" style={styles.errorTitle}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.errorText, { color: palette.muted }]}>{message}</ThemedText>
      {renderBackAction()}
    </View>
  );
  const renderScreen = (content: ReactNode, headerRight?: () => ReactNode) => (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Compare Coaches',
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
          ...(headerRight ? { headerRight } : {}),
        }}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        {content}
      </SafeAreaView>
    </>
  );

  if (coachIds.length === 0) {
    return renderScreen(
      renderErrorState(
        <Ionicons name="alert-circle" size={48} color={palette.error} />,
        'Invalid Comparison Link',
        'No coach IDs were provided in the URL. Please use a valid comparison link.',
      ),
    );
  }

  if (coachIds.length > 3) {
    return renderScreen(
      renderErrorState(
        <Ionicons name="warning" size={48} color={palette.warning} />,
        'Too Many Coaches',
        'You can compare a maximum of 3 coaches at once. Please reduce your selection.',
      ),
    );
  }

  return renderScreen(
    <>
        {/* Status bar */}
        <Row style={[styles.statusBar, { borderBottomColor: palette.border }]}>
          <Row style={styles.statusInfo}>
            <Ionicons name="git-compare" size={18} color={palette.icon} />
            <ThemedText style={styles.statusText}>
              Comparing {coachIds.length} {coachIds.length === 1 ? 'coach' : 'coaches'}
            </ThemedText>
          </Row>
          <View style={[styles.badge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <ThemedText style={[styles.badgeText, { color: palette.success }]}>
              Shared Comparison
            </ThemedText>
          </View>
        </Row>

        {/* Comparison table with specific IDs */}
        <ComparisonTable coachIds={coachIds} onCoachRemoved={handleCoachRemoved} />
    </>,
    () => (
      <Clickable accessibilityLabel="Share comparison" onPress={handleShare} style={styles.headerButton}>
        <Ionicons name="share-outline" size={22} color={palette.icon} />
      </Clickable>
    ),
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  statusInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.bodySmallSemiBold,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  badgeText: {
    ...Typography.caption,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  errorTitle: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  backButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
  },
  backButtonText: {
    ...Typography.bodySemiBold,
  },
});

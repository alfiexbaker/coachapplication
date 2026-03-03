import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { RecoveryTimeline } from '@/components/health';
import { InjurySummaryCard } from '@/components/health/injury-summary-card';
import { AddRecoveryNote } from '@/components/health/add-recovery-note';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useHealthDetail } from '@/hooks/use-health-detail';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

export default function InjuryDetailScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    injury,
    loading,
    status,
    error,
    refreshing,
    retry,
    showAddNote,
    noteText,
    noteProgress,
    saving,
    setNoteText,
    setNoteProgress,
    handleRefresh,
    handleAddNote,
    handleMarkHealed,
    cancelAddNote,
    openAddNote,
  } = useHealthDetail(id);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (loading) {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(<ErrorState message={error?.message ?? 'Failed to load injury.'} onRetry={retry} />);
  }

  if (status === 'empty' || !injury) {
    return renderShell(
      <EmptyState
        icon="alert-circle-outline"
        title="Injury not found"
        message="This injury record could not be located."
      />,
    );
  }

  const statusInfo = injuryService.getStatusInfo(injury.status);

  return renderShell(
    <>
      <Row justify="space-between" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <Row
          align="center"
          gap="xxs"
          style={[styles.statusBadge, { backgroundColor: withAlpha(statusInfo.color, 0.09) }]}
        >
          <Ionicons
            name={statusInfo.icon as keyof typeof Ionicons.glyphMap}
            size={14}
            color={statusInfo.color}
          />
          <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </ThemedText>
        </Row>
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <InjurySummaryCard injury={injury} colors={colors} />

        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <RecoveryTimeline injury={injury} />
        </Animated.View>

        {injury.status !== 'HEALED' && (
          <AddRecoveryNote
            colors={colors}
            showAddNote={showAddNote}
            noteText={noteText}
            noteProgress={noteProgress}
            saving={saving}
            statusColor={statusInfo.color}
            onOpenAddNote={openAddNote}
            onCancelAddNote={cancelAddNote}
            onSaveNote={handleAddNote}
            onChangeText={setNoteText}
            onChangeProgress={setNoteProgress}
          />
        )}

        {injury.status !== 'HEALED' && (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.actionsSection}>
            <Button
              onPress={handleMarkHealed}
              disabled={saving}
              style={[styles.healedButton, { backgroundColor: colors.success }]}
            >
              <Row gap="xs" align="center">
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.onPrimary} />
                <ThemedText style={{ color: colors.onPrimary, fontWeight: '600' }}>
                  Mark as Healed
                </ThemedText>
              </Row>
            </Button>
          </Animated.View>
        )}
      </ScrollView>
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  actionsSection: { marginTop: Spacing.xs, marginBottom: Spacing.sm },
  healedButton: { marginTop: 0 },
});

import { useEffect, useState, startTransition } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/screen-states';
import { DevAthleteHero } from '@/components/development/dev-athlete-hero';
import { DevSpecialNeedsCard } from '@/components/development/dev-special-needs-card';
import { DevProgressionCard } from '@/components/development/dev-progression-card';
import { DevSessionCard } from '@/components/development/dev-session-card';
import { Spacing, Typography, withAlpha, Radii } from '@/constants/theme';
import { POSITION_LABELS } from '@/constants/position-skills';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAthleteDevelopment } from '@/hooks/use-athlete-development';
import { Routes } from '@/navigation/routes';
import { PageHeader } from '@/components/primitives/page-header';
import { PositionSelector } from '@/components/session/position-selector';
import { childService } from '@/services/child-service';
import type { PositionRole } from '@/types/progress-types';
import { useRequiredParam } from '@/hooks/use-required-param';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncFinally } from '@/utils/async-control';

export default function AthleteDetailScreen() {
  const athleteIdParam = useRequiredParam('athleteId');
  const resolvedAthleteId = athleteIdParam.valid ? athleteIdParam.value : undefined;
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    athlete,
    currentUser,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    sortedSessions,
    sessions,
    awards,
    childProfile,
    progressionSummary,
    trend,
    level,
  } = useAthleteDevelopment(resolvedAthleteId ?? '');
  const [editingPosition, setEditingPosition] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const [positionDraft, setPositionDraft] = useState<PositionRole | null>(null);
  const header = (
    <PageHeader
      title="Athlete Progress"
      showBack
      onBackPress={() => router.back()}
      centerTitle
    />
  );

  useEffect(() => {
    startTransition(() => {
      setPositionDraft(childProfile?.primaryPosition ?? null);
    });
  }, [childProfile?.primaryPosition]);

  const positionLabel = (() => {
    if (positionDraft === null) {
      return 'Rotates';
    }
    if (positionDraft) {
      return POSITION_LABELS[positionDraft];
    }
    return 'Not set';
  })();

  const handleToggleEditing = () => {
    setEditingPosition((prev) => !prev);
  };

  const handleClearPosition = () => {
    setPositionDraft(null);
  };

  const handleSpecialNeedsPress = () => {
    router.push(Routes.developmentAthleteSpecialNeeds(resolvedAthleteId!));
  };

  const handleSavePrimaryPosition = async () => {
    if (!childProfile) {
      return;
    }
    setSavingPosition(true);

    return await runAsyncFinally(async () => {
      const result = await childService.updateChild(childProfile.id, {
        primaryPosition: positionDraft ?? null,
      });
      if (!result.success) {
        uiFeedback.showToast(result.error.message);
        return;
      }
      setEditingPosition(false);
      onRefresh();
    }, () => {
      setSavingPosition(false);
    });
  };

  if (!athleteIdParam.valid) {
    return (
      <PageContainer>
        <EmptyState
          icon="alert-circle-outline"
          title="Athlete link is invalid"
          message="Open this athlete again from the roster."
        />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer edges={['top', 'bottom']} gap={Spacing.lg} header={header}>
        <LoadingState variant="hero" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer edges={['top', 'bottom']} gap={Spacing.lg} header={header}>
        <ErrorState
          title="Athlete progress unavailable"
          message={error?.message ?? 'Failed to load athlete progress.'}
          error={error ?? undefined}
          onRetry={retry}
        />
      </PageContainer>
    );
  }

  if (!athlete || !currentUser) {
    return (
      <PageContainer edges={['top', 'bottom']} gap={Spacing.lg} header={header}>
        <EmptyState
          icon="person-outline"
          title="Athlete not found"
          message="This athlete profile is unavailable."
        />
      </PageContainer>
    );
  }

  return (
      <PageContainer
        edges={['top', 'bottom']}
        gap={Spacing.lg}
        header={header}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <DevAthleteHero
          athleteName={athlete.name}
          avatar={athlete.avatar}
          sessions={sessions}
          sortedSessions={sortedSessions}
          trend={trend}
          level={level}
          colors={colors}
        />

        {childProfile ? (
          <SurfaceCard style={styles.positionCard}>
            <Row justify="between" align="center">
              <Column gap="micro" style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Primary Position</ThemedText>
                <ThemedText style={{ color: colors.muted }}>{positionLabel}</ThemedText>
              </Column>
              <Clickable
                onPress={handleToggleEditing}
                style={[
                  styles.positionEditButton,
                  {
                    borderColor: colors.tint,
                    backgroundColor: withAlpha(colors.tint, 0.1),
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={editingPosition ? 'Close position editor' : 'Edit primary position'}
              >
                <ThemedText style={[styles.positionEditText, { color: colors.tint }]}>
                  {editingPosition ? 'Close' : 'Edit'}
                </ThemedText>
              </Clickable>
            </Row>

            {editingPosition ? (
              <Column gap="xs">
                <PositionSelector
                  value={positionDraft}
                  onChange={setPositionDraft}
                />
                <Row gap="xs">
                  <Clickable
                    onPress={handleClearPosition}
                    style={[
                      styles.rotateButton,
                      {
                        borderColor: positionDraft === null ? colors.tint : colors.border,
                        backgroundColor:
                          positionDraft === null
                            ? withAlpha(colors.tint, 0.1)
                            : withAlpha(colors.surface, 0.6),
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Set athlete as rotating position"
                  >
                    <ThemedText
                      style={{
                        color: positionDraft === null ? colors.tint : colors.muted,
                        ...Typography.caption,
                        fontWeight: '600',
                      }}
                    >
                      They rotate
                    </ThemedText>
                  </Clickable>
                  <Clickable
                    onPress={handleSavePrimaryPosition}
                    disabled={savingPosition}
                    style={[
                      styles.saveButton,
                      {
                        borderColor: colors.tint,
                        backgroundColor: withAlpha(colors.tint, 0.14),
                        opacity: savingPosition ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Save primary position"
                  >
                    <ThemedText style={[styles.positionEditText, { color: colors.tint }]}>
                      {savingPosition ? 'Saving...' : 'Save'}
                    </ThemedText>
                  </Clickable>
                </Row>
              </Column>
            ) : null}
          </SurfaceCard>
        ) : null}

        <DevSpecialNeedsCard
          childProfile={childProfile}
          colors={colors}
          onPress={handleSpecialNeedsPress}
        />

        {progressionSummary && <DevProgressionCard summary={progressionSummary} colors={colors} />}

        <Column gap="xs" style={{ marginTop: Spacing.xs }}>
          <ThemedText type="heading">Session History</ThemedText>
          <ThemedText style={{ color: colors.muted }}>
            {sortedSessions.length} sessions completed. Tap any card to open feedback.
          </ThemedText>
        </Column>

        <Column gap="sm">
          {sortedSessions.map((session) => (
            <DevSessionCard
              key={session.id}
              session={session}
              awards={awards}
              colors={colors}
            />
          ))}
        </Column>
      </PageContainer>
  );
}

const styles = StyleSheet.create({
  positionCard: {
    gap: Spacing.sm,
  },
  positionEditButton: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionEditText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  rotateButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
});

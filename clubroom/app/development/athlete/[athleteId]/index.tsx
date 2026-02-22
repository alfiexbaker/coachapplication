import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, EmptyState } from '@/components/ui/screen-states';
import { DevAthleteHero } from '@/components/development/dev-athlete-hero';
import { DevSpecialNeedsCard } from '@/components/development/dev-special-needs-card';
import { DevProgressionCard } from '@/components/development/dev-progression-card';
import { DevSessionCard } from '@/components/development/dev-session-card';
import { BadgeAwardModal, BADGE_REASONS } from '@/components/badges/badge-award-modal';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { POSITION_LABELS } from '@/constants/position-skills';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAthleteDevelopment } from '@/hooks/use-athlete-development';
import { Routes } from '@/navigation/routes';
import { PageHeader } from '@/components/primitives/page-header';
import { PositionSelector } from '@/components/session/position-selector';
import { childService } from '@/services/child-service';
import type { PositionRole } from '@/types/progress-types';

export default function AthleteDetailScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId?: string | string[] }>();
  const resolvedAthleteId = Array.isArray(athleteId) ? athleteId[0] : athleteId;
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    athlete,
    currentUser,
    loading,
    sortedSessions,
    sessions,
    awards,
    selectedSession,
    showBadgeModal,
    childProfile,
    progressionSummary,
    trend,
    level,
    selectedSessionLabel,
    handleOpenBadgeModal,
    handleSelectSession,
    handleCloseModal,
    handleOnAwarded,
  } = useAthleteDevelopment(resolvedAthleteId ?? '');
  const [editingPosition, setEditingPosition] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const [positionDraft, setPositionDraft] = useState<PositionRole | null>(null);

  useEffect(() => {
    setPositionDraft(childProfile?.primaryPosition ?? null);
  }, [childProfile?.primaryPosition]);

  const positionLabel = useMemo(() => {
    if (positionDraft === null) {
      return 'Rotates';
    }
    if (positionDraft) {
      return POSITION_LABELS[positionDraft];
    }
    return 'Not set';
  }, [positionDraft]);

  const handleSavePrimaryPosition = useCallback(async () => {
    if (!childProfile) {
      return;
    }
    setSavingPosition(true);
    try {
      const result = await childService.updateChild(childProfile.id, {
        primaryPosition: positionDraft ?? null,
      });
      if (!result.success) {
        Alert.alert('Could not save', result.error.message);
        return;
      }
      setEditingPosition(false);
    } finally {
      setSavingPosition(false);
    }
  }, [childProfile, positionDraft]);

  if (!resolvedAthleteId) {
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
      <PageContainer>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (!athlete || !currentUser) {
    return (
      <PageContainer>
        <EmptyState
          icon="person-outline"
          title="Athlete not found"
          message="This athlete profile is unavailable."
        />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        edges={['top', 'bottom']}
        gap={Spacing.lg}
        header={
          <PageHeader
            title="Athlete Progress"
            showBack
            onBackPress={() => router.back()}
            centerTitle
          />
        }
      >
        <DevAthleteHero
          athleteName={athlete.name}
          avatar={athlete.avatar}
          sessions={sessions}
          sortedSessions={sortedSessions}
          trend={trend}
          level={level}
          colors={colors}
          onAwardBadge={handleOpenBadgeModal}
        />

        {childProfile ? (
          <SurfaceCard style={styles.positionCard}>
            <Row justify="between" align="center">
              <Column gap="micro" style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Primary Position</ThemedText>
                <ThemedText style={{ color: colors.muted }}>{positionLabel}</ThemedText>
              </Column>
              <Clickable
                onPress={() => setEditingPosition((prev) => !prev)}
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
                    onPress={() => setPositionDraft(null)}
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
          onPress={() => router.push(Routes.developmentAthleteSpecialNeeds(resolvedAthleteId))}
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
              onSelectForBadge={handleSelectSession}
            />
          ))}
        </Column>
      </PageContainer>

      <BadgeAwardModal
        visible={!!selectedSession || showBadgeModal}
        athleteId={athlete.id}
        athleteName={athlete.name}
        coachId={currentUser.id}
        coachName={currentUser.name}
        sessionId={selectedSession?.id}
        sessionLabel={selectedSession ? selectedSessionLabel : undefined}
        initialReason={selectedSession?.nextFocusAreas?.find((focus) =>
          BADGE_REASONS.includes(focus),
        )}
        onClose={handleCloseModal}
        onAwarded={handleOnAwarded}
      />
    </>
  );
}

const styles = StyleSheet.create({
  positionCard: {
    gap: Spacing.sm,
  },
  positionEditButton: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 999,
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
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
});

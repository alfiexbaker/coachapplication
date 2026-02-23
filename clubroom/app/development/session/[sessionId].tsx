import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { LoadingState, EmptyState } from '@/components/ui/screen-states';
import { PageHeader } from '@/components/primitives/page-header';
import { DevSessionInfo } from '@/components/development/dev-session-info';
import { DevSessionRatings } from '@/components/development/dev-session-ratings';
import { DevSessionSkills } from '@/components/development/dev-session-skills';
import { DevSessionNotes } from '@/components/development/dev-session-notes';
import { DevSessionMedia } from '@/components/development/dev-session-media';
import { DevSessionVisibility } from '@/components/development/dev-session-visibility';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useDevSession } from '@/hooks/use-dev-session';

export default function SessionDetailScreen() {
  const { sessionId, prefillFromQuickRate, athleteId } = useLocalSearchParams<{
    sessionId?: string | string[];
    prefillFromQuickRate?: string | string[];
    athleteId?: string | string[];
  }>();
  const resolvedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  const resolvedPrefillFlag = Array.isArray(prefillFromQuickRate)
    ? prefillFromQuickRate[0]
    : prefillFromQuickRate;
  const resolvedPrefillAthleteId = Array.isArray(athleteId) ? athleteId[0] : athleteId;
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    session,
    athlete,
    currentUser,
    loading,
    saving,
    publicNotes,
    setPublicNotes,
    privateNotes,
    setPrivateNotes,
    rating,
    setRating,
    effortRating,
    setEffortRating,
    selectedSkills,
    skillRatings,
    improvements,
    setImprovements,
    homework,
    setHomework,
    videoUrls,
    imageUrls,
    visibility,
    setVisibility,
    sessionBadges,
    handleSave,
    toggleSubSkill,
    updateSkillRating,
    removeSkillRating,
    handleAddImage,
    handleRemoveImage,
    handleAddVideo,
    handleRemoveVideo,
    formatDate,
    positionsPlayed,
    handlePositionToggle,
    positionalSkills,
    characterSkills,
    positionLabel,
    previousRatings,
    subSkillRatings,
    updateSubSkillRating,
    removeParentRatings,
    derivedParentAverages,
  } = useDevSession({
    sessionId: resolvedSessionId,
    prefillFromQuickRate: resolvedPrefillFlag === 'true',
    athleteId: resolvedPrefillAthleteId,
  });

  const header = (
    <PageHeader title="Session Feedback" showBack centerTitle onBackPress={() => router.back()} />
  );

  if (!resolvedSessionId) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <EmptyState
          icon="alert-circle-outline"
          title="Session link is invalid"
          message="Open this session again from Development."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (!session || !athlete || !currentUser) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <EmptyState
          icon="document-text-outline"
          title="Session not found"
          message="This session could not be loaded."
        />
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader
            title="Session Feedback"
            showBack
            onBackPress={() => router.back()}
            centerTitle
            containerStyle={styles.header}
          />

          <DevSessionInfo
            athleteName={athlete.name}
            avatar={athlete.avatar}
            sessionDate={formatDate(session.completedAt)}
            sessionBadges={sessionBadges}
            colors={colors}
          />

          <DevSessionRatings
            rating={rating}
            effortRating={effortRating}
            onRatingChange={setRating}
            onEffortChange={setEffortRating}
            colors={colors}
          />

          <DevSessionSkills
            colors={colors}
            positionsPlayed={positionsPlayed}
            onPositionToggle={handlePositionToggle}
            positionalSkills={positionalSkills}
            characterSkills={characterSkills}
            positionLabel={positionLabel}
            previousRatings={previousRatings}
            subSkillRatings={subSkillRatings}
            derivedParentAverages={derivedParentAverages}
            onUpdateSubSkillRating={updateSubSkillRating}
            onRemoveParentRatings={removeParentRatings}
          />

          <DevSessionNotes
            publicNotes={publicNotes}
            privateNotes={privateNotes}
            improvements={improvements}
            homework={homework}
            onPublicNotesChange={setPublicNotes}
            onPrivateNotesChange={setPrivateNotes}
            onImprovementsChange={setImprovements}
            onHomeworkChange={setHomework}
            colors={colors}
          />

          <DevSessionMedia
            videoUrls={videoUrls}
            imageUrls={imageUrls}
            onAddVideo={handleAddVideo}
            onRemoveVideo={handleRemoveVideo}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            colors={colors}
          />

          <DevSessionVisibility
            visibility={visibility}
            onVisibilityChange={setVisibility}
            colors={colors}
          />

          <Clickable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: saving ? colors.muted : colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Row align="center" justify="center" gap="xs">
              {saving ? (
                <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>
                  Saving...
                </ThemedText>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
                  <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>
                    Save & Submit
                  </ThemedText>
                </>
              )}
            </Row>
          </Clickable>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 0,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  saveBtn: { padding: Spacing.md, borderRadius: Radii.lg, marginTop: Spacing.sm },
});

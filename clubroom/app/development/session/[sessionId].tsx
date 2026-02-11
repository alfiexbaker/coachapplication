import { StyleSheet, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { LoadingState, EmptyState } from '@/components/ui/screen-states';
import { DevSessionInfo } from '@/components/development/dev-session-info';
import { DevSessionRatings } from '@/components/development/dev-session-ratings';
import { DevSessionSkills } from '@/components/development/dev-session-skills';
import { DevSessionNotes } from '@/components/development/dev-session-notes';
import { DevSessionMedia } from '@/components/development/dev-session-media';
import { DevSessionVisibility } from '@/components/development/dev-session-visibility';
import { BadgeAwardModal } from '@/components/badges/badge-award-modal';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useDevSession } from '@/hooks/use-dev-session';

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
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
    showBadgeModal,
    sessionBadges,
    handleSave,
    toggleSkill,
    updateSkillRating,
    handleAddImage,
    handleRemoveImage,
    handleAddVideo,
    handleRemoveVideo,
    handleBadgeAwarded,
    handleOpenBadgeModal,
    handleCloseBadgeModal,
    formatDate,
  } = useDevSession(sessionId);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (!session || !athlete || !currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="document-text-outline"
          title="Session not found"
          message="This session could not be loaded."
        />
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Row
            align="center"
            justify="space-between"
            style={{ paddingTop: Spacing.md, paddingBottom: Spacing.sm }}
          >
            <Clickable onPress={() => router.back()} style={{ padding: Spacing.xs }}>
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </Clickable>
            <ThemedText type="title">Session Feedback</ThemedText>
            <View style={{ width: 24 }} />
          </Row>

          <DevSessionInfo
            athleteName={athlete.name}
            avatar={athlete.avatar}
            sessionDate={formatDate(session.completedAt)}
            sessionBadges={sessionBadges}
            colors={colors}
            onAwardBadge={handleOpenBadgeModal}
          />

          <DevSessionRatings
            rating={rating}
            effortRating={effortRating}
            onRatingChange={setRating}
            onEffortChange={setEffortRating}
            colors={colors}
          />

          <DevSessionSkills
            selectedSkills={selectedSkills}
            skillRatings={skillRatings}
            onToggleSkill={toggleSkill}
            onUpdateRating={updateSkillRating}
            colors={colors}
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

      <BadgeAwardModal
        visible={showBadgeModal}
        athleteId={athlete.id}
        athleteName={athlete.name}
        coachId={currentUser.id}
        coachName={currentUser.name || 'Coach'}
        sessionId={sessionId}
        sessionLabel={formatDate(session.completedAt)}
        onClose={handleCloseBadgeModal}
        onAwarded={handleBadgeAwarded}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  saveBtn: { padding: Spacing.md, borderRadius: Radii.lg, marginTop: Spacing.sm },
});

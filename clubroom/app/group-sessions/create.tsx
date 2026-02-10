/**
 * Create Group Session Screen
 *
 * Multi-step wizard for creating group sessions: type, details,
 * schedule, pricing, review, and optional squad invite.
 */

import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SquadInviteModal } from '@/components/squad/squad-invite-modal';
import { CreateSessionTypeStep } from '@/components/group/create-session-type-step';
import { CreateSessionDetailsStep } from '@/components/group/create-session-details-step';
import { CreateSessionScheduleStep } from '@/components/group/create-session-schedule-step';
import { CreateSessionPricingStep } from '@/components/group/create-session-pricing-step';
import { CreateSessionReviewStep } from '@/components/group/create-session-review-step';
import { CreateSessionInviteStep } from '@/components/group/create-session-invite-step';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateGroupSession, DEFAULT_CLUB_ID } from '@/hooks/use-create-group-session';
import { groupSessionService } from '@/services/group-session-service';

export default function CreateGroupSessionScreen() {
  const { colors: palette } = useTheme();
  const {
    form, step, steps, currentStepIndex, loading,
    createdSessionId, showSquadInviteModal, squadInviteSent,
    isSquadSession, currentUser,
    setField, canProceed, goNext, goBack,
    handleCreate, handleSquadInviteSuccess, handleFinish,
    openSquadInviteModal, closeSquadInviteModal,
  } = useCreateGroupSession();

  const renderStep = () => {
    switch (step) {
      case 'type':
        return <CreateSessionTypeStep sessionType={form.sessionType} inviteType={form.inviteType} onSessionTypeChange={(t) => setField('sessionType', t)} onInviteTypeChange={(t) => setField('inviteType', t)} />;
      case 'details':
        return <CreateSessionDetailsStep title={form.title} description={form.description} location={form.location} ageMin={form.ageMin} ageMax={form.ageMax} skillLevel={form.skillLevel} focus={form.focus} isSquadSession={isSquadSession} clubId={DEFAULT_CLUB_ID} selectedSquadIds={form.selectedSquadIds} onFieldChange={setField} />;
      case 'schedule':
        return <CreateSessionScheduleStep scheduleDate={form.scheduleDate} scheduleStartTime={form.scheduleStartTime} scheduleEndTime={form.scheduleEndTime} isRecurring={form.isRecurring} recurringDayOfWeek={form.recurringDayOfWeek} recurringUntil={form.recurringUntil} onFieldChange={setField} />;
      case 'pricing':
        return <CreateSessionPricingStep maxParticipants={form.maxParticipants} price={form.price} waitlistEnabled={form.waitlistEnabled} onFieldChange={setField} />;
      case 'review':
        return <CreateSessionReviewStep sessionType={form.sessionType} inviteType={form.inviteType} title={form.title} location={form.location} scheduleDate={form.scheduleDate} scheduleStartTime={form.scheduleStartTime} scheduleEndTime={form.scheduleEndTime} maxParticipants={form.maxParticipants} price={form.price} focus={form.focus} isRecurring={form.isRecurring} recurringDayOfWeek={form.recurringDayOfWeek} recurringUntil={form.recurringUntil} />;
      case 'invite':
        return <CreateSessionInviteStep selectedSquadIds={form.selectedSquadIds} squadInviteSent={squadInviteSent} onInvitePress={openSquadInviteModal} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Row align="center" gap="md" style={styles.header}>
          <Clickable accessibilityLabel="Go back" onPress={goBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>Create Session</ThemedText>
          <View style={{ width: 24 }} />
        </Row>

        <Row justify="center" gap="xs" style={styles.progressContainer}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.progressDot, { backgroundColor: i <= currentStepIndex ? palette.tint : palette.border }]} />
          ))}
        </Row>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'invite' ? (
            <Button onPress={handleFinish}>{squadInviteSent ? 'View Session' : 'Skip & View Session'}</Button>
          ) : step === 'review' ? (
            <Button onPress={handleCreate} disabled={loading}>{loading ? 'Creating...' : isSquadSession ? 'Create Session' : 'Create & Publish'}</Button>
          ) : (
            <Button onPress={goNext} disabled={!canProceed()}>Continue</Button>
          )}
        </View>
      </KeyboardAvoidingView>

      {createdSessionId && currentUser && (
        <SquadInviteModal
          visible={showSquadInviteModal}
          onClose={closeSquadInviteModal}
          onSuccess={handleSquadInviteSuccess}
          clubId={DEFAULT_CLUB_ID}
          inviteType="SESSION"
          targetId={createdSessionId}
          targetTitle={form.title}
          preSelectedSquadIds={form.selectedSquadIds}
          multiSelect={false}
          sessionProps={{
            coachId: currentUser.id,
            coachName: currentUser.name || 'Coach',
            coachPhotoUrl: currentUser.avatar,
            proposedSlots: [{ id: `slot_${Date.now()}`, date: form.scheduleDate, startTime: form.scheduleStartTime, endTime: form.scheduleEndTime }],
            sessionType: groupSessionService.formatSessionType(form.sessionType),
            focus: form.focus.length > 0 ? form.focus.join(', ') : 'General Training',
            notes: form.description,
            priceUsd: parseFloat(form.price) || 0,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  progressContainer: { paddingBottom: Spacing.md },
  progressDot: { width: 8, height: 8, borderRadius: Radii.xs },
  scrollContent: { padding: Spacing.lg, paddingTop: 0 },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});

import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { CreateEventTypeStep } from '@/components/event/create-event-type-step';
import { CreateEventDetailsStep } from '@/components/event/create-event-details-step';
import { CreateEventScheduleStep } from '@/components/event/create-event-schedule-step';
import { CreateEventAudienceStep } from '@/components/event/create-event-audience-step';
import { CreateEventReviewStep } from '@/components/event/create-event-review-step';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useCreateEvent, STEPS } from '@/hooks/use-create-event';

export default function CreateEventScreen() {
  const {
    status,
    error,
    retry,
    colors: palette,
  } = useScreen<boolean>({
    load: async () => ok(true),
    isEmpty: () => false,
    refetchOnFocus: true,
  });
  const {
    form,
    step,
    loading,
    squads,
    currentStepIndex,
    setField,
    canProceed,
    goNext,
    goBack,
    handleCreate,
  } = useCreateEvent();

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <ErrorState
          message={error?.message || 'Failed to open event creation flow.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <EmptyState
          icon="calendar-outline"
          title="Creation unavailable"
          message="The event creation flow is currently unavailable."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'type':
        return (
          <CreateEventTypeStep
            eventType={form.eventType}
            onEventTypeChange={(t) => setField('eventType', t)}
          />
        );
      case 'details':
        return (
          <CreateEventDetailsStep
            title={form.title}
            description={form.description}
            venue={form.venue}
            address={form.address}
            isVirtual={form.isVirtual}
            meetingLink={form.meetingLink}
            onFieldChange={setField}
          />
        );
      case 'schedule':
        return (
          <CreateEventScheduleStep
            date={form.date}
            startTime={form.startTime}
            endTime={form.endTime}
            rsvpDeadline={form.rsvpDeadline}
            onFieldChange={setField}
          />
        );
      case 'audience':
        return (
          <CreateEventAudienceStep
            clubId="club_lions"
            targetAudience={form.targetAudience}
            selectedSquadIds={form.selectedSquadIds}
            selectedAthleteIds={form.selectedAthleteIds}
            squads={squads}
            maxAttendees={form.maxAttendees}
            price={form.price}
            rsvpRequired={form.rsvpRequired}
            onFieldChange={setField}
          />
        );
      case 'review':
        return (
          <CreateEventReviewStep
            eventType={form.eventType}
            title={form.title}
            description={form.description}
            date={form.date}
            startTime={form.startTime}
            endTime={form.endTime}
            isVirtual={form.isVirtual}
            venue={form.venue}
            targetAudience={form.targetAudience}
            selectedSquadIds={form.selectedSquadIds}
            selectedAthleteIds={form.selectedAthleteIds}
            price={form.price}
          />
        );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Row align="center" gap="md" style={styles.header}>
          <Clickable onPress={goBack} hitSlop={8} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>
            Create Event
          </ThemedText>
          <View style={{ width: 24 }} />
        </Row>

        <Row justify="center" gap="xs" style={styles.progressContainer}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                { backgroundColor: i <= currentStepIndex ? palette.tint : palette.border },
              ]}
            />
          ))}
        </Row>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'review' ? (
            <Row gap="sm" style={styles.reviewButtons}>
              <Button
                variant="outline"
                onPress={() => handleCreate(false)}
                disabled={loading}
                style={styles.reviewButton}
              >
                Save Draft
              </Button>
              <Button
                onPress={() => handleCreate(true)}
                disabled={loading}
                style={styles.reviewButton}
              >
                {loading ? 'Creating...' : 'Publish'}
              </Button>
            </Row>
          ) : (
            <Button onPress={goNext} disabled={!canProceed()}>
              Continue
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  progressContainer: { paddingBottom: Spacing.md },
  progressDot: { width: 8, height: 8, borderRadius: Radii.xs },
  scrollContent: { padding: Spacing.lg, paddingTop: 0 },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  reviewButtons: {},
  reviewButton: { flex: 1 },
});

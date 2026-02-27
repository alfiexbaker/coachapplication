/**
 * Assign Drill Screen
 *
 * Screen for coaches to assign a drill to an athlete.
 * Allows setting due date, notes, repetitions, and priority.
 */

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Routes } from '@/navigation/routes';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { AssignDrillForm } from '@/components/drills/assign-drill-form';
import { Spacing } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useDrillAssign } from '@/hooks/use-drill-assign';

export default function AssignDrillScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    drill,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    athletes,
    submitting,
    selectedAthlete,
    notes,
    setNotes,
    repetitions,
    setRepetitions,
    repetitionsError,
    priority,
    daysFromNow,
    formattedDate,
    handleDateSelect,
    handlePrioritySelect,
    handleAthleteSelect,
    handleSubmit,
  } = useDrillAssign();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="form" />);
  }

  if (status === 'error') {
    return renderShell(<ErrorState message={error?.message ?? 'Failed to load drill.'} onRetry={retry} />);
  }

  if (status === 'empty' || !drill) {
    return renderShell(
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <EmptyState
          icon="alert-circle-outline"
          title="No drill selected"
          message="Select a drill from your library before assigning it."
          actionLabel="Go to library"
          onPressAction={() => router.push(Routes.DRILLS_LIBRARY)}
        />
      </ScrollView>,
    );
  }

  return renderShell(
    <>
      <PageHeader
        title="Assign Drill"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
        containerStyle={styles.header}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <AssignDrillForm
            drill={drill}
            athletes={athletes}
            selectedAthlete={selectedAthlete}
            daysFromNow={daysFromNow}
            formattedDate={formattedDate}
            priority={priority}
            repetitions={repetitions}
            repetitionsError={repetitionsError}
            notes={notes}
            colors={colors}
            onAthleteSelect={handleAthleteSelect}
            onDateSelect={handleDateSelect}
            onPrioritySelect={handlePrioritySelect}
            onRepetitionsChange={setRepetitions}
            onNotesChange={setNotes}
          />

          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={{ marginTop: Spacing.md }}
          >
            <Button onPress={handleSubmit} disabled={submitting || !selectedAthlete || !!repetitionsError}>
              {submitting
                ? 'Assigning...'
                : selectedAthlete
                  ? `Assign to ${selectedAthlete.name.split(' ')[0]}`
                  : 'Select an Athlete'}
            </Button>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
});

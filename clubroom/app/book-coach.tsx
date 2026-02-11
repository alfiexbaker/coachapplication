/**
 * Book Coach Screen
 *
 * Multi-step booking: athletes → service → time → objectives → confirm.
 * All state/logic in useBookCoach hook.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AthletePicker } from '@/components/ui/booking/AthletePicker';
import { AvailabilityPicker } from '@/components/ui/booking/availability-picker';
import { BookingStepper } from '@/components/ui/booking/booking-stepper';
import { CoachSummaryCard } from '@/components/ui/booking/coach-summary-card';
import { ObjectiveSelector } from '@/components/ui/booking/objective-selector';
import { ServiceSelectionList } from '@/components/ui/booking/service-selection-list';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useBookCoach, TOTAL_STEPS } from '@/hooks/use-book-coach';

export default function BookCoachScreen() {
  const c = useBookCoach();
  const palette = c.colors;

  if (!c.coach || !c.coachProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" justify="between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
        </Row>
        <EmptyState
          icon="person-outline"
          title="Coach not found"
          message="We could not load this coach profile. Please go back and choose another coach."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Row align="center" justify="between" style={styles.header}>
        <Clickable onPress={c.handleBack} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
        <ThemedText type="subtitle">{c.stepTitle}</ThemedText>
        <View style={{ width: 24 }} />
      </Row>

      <BookingStepper step={c.step} totalSteps={TOTAL_STEPS[c.userHasChildren ? 'parent' : 'athlete']} isParent={c.userHasChildren} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.onRefresh} tintColor={palette.tint} />}
      >
        <CoachSummaryCard coach={c.coach} coachProfile={c.coachProfile} />

        {c.step === 0 && c.userHasChildren && (
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <AthletePicker athletes={(c.currentUser?.children ?? []).map((child) => ({ id: child.childId, name: child.childName }))}
              selectedIds={c.selectedAthleteIds} onSelectionChange={c.setSelectedAthleteIds}
              includeSelf={c.userIsAthlete} selfId={c.currentUser?.id} selfName="Myself" />
          </View>
        )}

        {c.step === 1 && <ServiceSelectionList services={c.serviceList} selectedServiceId={c.selectedServiceId} onSelect={c.setSelectedServiceId} />}

        {c.step === 2 && (
          c.loadingAvailability ? (
            <LoadingState variant="list" />
          ) : c.availabilityError ? (
            <ErrorState message={c.availabilityError} onRetry={c.retry} />
          ) : c.filteredAvailability.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No available slots"
              message="This coach has no available times in the next 2 weeks. Pull to refresh, try another service type, or check back later."
              actionLabel="Refresh availability"
              onPressAction={c.onRefresh}
            />
          ) : (
            <AvailabilityPicker availability={c.filteredAvailability} selectedDayId={c.selectedDayId}
              selectedSlotId={c.selectedSlotId} selectedService={c.selectedService}
              onSelectDay={c.setSelectedDayId as (dayId: string) => void}
              onSelectSlot={c.setSelectedSlotId as (slotId: string) => void} />
          )
        )}

        {c.step === 3 && <ObjectiveSelector objectives={c.footballObjectives} selectedObjectives={c.selectedObjectives} onToggle={c.toggleObjective} />}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Clickable onPress={c.handleContinue} disabled={c.continueDisabled}
          style={({ pressed }) => [styles.continueButton, {
            backgroundColor: c.continueDisabled ? palette.border : palette.tint, opacity: pressed ? 0.8 : 1,
          }]}>
          <ThemedText style={[styles.continueButtonText, { color: palette.onPrimary }]}>
            {c.step === 3 ? 'Review Booking' : 'Continue'}
          </ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: Spacing['2xl'] },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  continueButton: { paddingVertical: Spacing.md, borderRadius: Spacing.md, alignItems: 'center' },
  continueButtonText: { ...Typography.subheading },
});

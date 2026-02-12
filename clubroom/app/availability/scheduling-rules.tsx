import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useTheme } from '@/hooks/useTheme';
import { useSchedulingRules } from '@/hooks/use-scheduling-rules';
import { SchedulingRulesForm } from '@/components/coach/scheduling-rules-form';

export default function SchedulingRulesScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    saving,
    hasChanges,
    minimumAdvanceHours,
    maxAdvanceDays,
    bufferMinutes,
    allowSameDayBookings,
    allowRescheduling,
    rescheduleDeadlineHours,
    setMinimumAdvanceHours,
    setMaxAdvanceDays,
    setBufferMinutes,
    setAllowSameDayBookings,
    setAllowRescheduling,
    setRescheduleDeadlineHours,
    handleSave,
    updateField,
    handleBack,
  } = useSchedulingRules();

  if (status === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <PageHeader
          title="Booking Rules"
          showBack
          onBack={handleBack}
        />
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <PageHeader
          title="Booking Rules"
          showBack
          onBack={handleBack}
        />
        <ErrorState
          message={error?.message || 'Failed to load scheduling rules.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <PageHeader
          title="Booking Rules"
          showBack
          onBack={handleBack}
        />
        <EmptyState
          icon="options-outline"
          title="No rules available"
          message="Scheduling rules could not be loaded."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <PageHeader
        title="Booking Rules"
        showBack
        onBack={handleBack}
      />
      <SchedulingRulesForm
        palette={palette}
        refreshing={refreshing}
        onRefresh={onRefresh}
        saving={saving}
        hasChanges={hasChanges}
        minimumAdvanceHours={minimumAdvanceHours}
        maxAdvanceDays={maxAdvanceDays}
        bufferMinutes={bufferMinutes}
        allowSameDayBookings={allowSameDayBookings}
        allowRescheduling={allowRescheduling}
        rescheduleDeadlineHours={rescheduleDeadlineHours}
        setMinimumAdvanceHours={setMinimumAdvanceHours}
        setMaxAdvanceDays={setMaxAdvanceDays}
        setBufferMinutes={setBufferMinutes}
        setAllowSameDayBookings={setAllowSameDayBookings}
        setAllowRescheduling={setAllowRescheduling}
        setRescheduleDeadlineHours={setRescheduleDeadlineHours}
        updateField={updateField}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

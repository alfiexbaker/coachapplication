import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { BlockDateForm } from '@/components/availability/block-date-form';

const logger = createLogger('BlockDate');

const REASON_OPTIONS = [
  { key: 'holiday', label: 'Holiday/Vacation', icon: 'airplane-outline' },
  { key: 'personal', label: 'Personal Day', icon: 'person-outline' },
  { key: 'illness', label: 'Illness', icon: 'medical-outline' },
  { key: 'training', label: 'Coach Training', icon: 'school-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function BlockDateScreen() {
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
  const { currentUser } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reason, setReason] = useState('personal');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);

  const dates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

  const handleSave = async () => {
    if (!currentUser?.id) return;

    const reasonText =
      reason === 'other' ? customReason : REASON_OPTIONS.find((r) => r.key === reason)?.label;
    if (reason === 'other' && !customReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for blocking this date');
      return;
    }

    setSaving(true);
    try {
      await availabilityService.saveOverride({
        coachId: currentUser.id,
        date: toDateStr(selectedDate),
        isBlocked: true,
        reason: reasonText,
      });

      Alert.alert('Date Blocked', `${formatDate(selectedDate)} has been blocked`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
      logger.success('DateBlocked', { date: selectedDate.toISOString(), reason: reasonText });
    } catch (saveError) {
      logger.error('Failed to block date', saveError);
      Alert.alert('Error', 'Failed to block date');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <PageHeader title="Block Date" showBack onBackPress={() => router.back()} />
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <PageHeader title="Block Date" showBack onBackPress={() => router.back()} />
        <ErrorState message={error?.message || 'Failed to open block-date flow.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <PageHeader title="Block Date" showBack onBackPress={() => router.back()} />
        <EmptyState
          icon="close-circle-outline"
          title="Block-date flow unavailable"
          message="Date blocking is currently unavailable."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <PageHeader title="Block Date" showBack onBackPress={() => router.back()} />
      <BlockDateForm
        colors={palette}
        dates={dates}
        selectedDate={selectedDate}
        reason={reason}
        customReason={customReason}
        saving={saving}
        reasonOptions={REASON_OPTIONS}
        formatDate={formatDate}
        isSameDay={isSameDay}
        onSelectDate={setSelectedDate}
        onSelectReason={setReason}
        onSetCustomReason={setCustomReason}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

export default function ReviewCreateAliasScreen() {
  const { bookingId, coachId } = useLocalSearchParams<{ bookingId?: string; coachId?: string }>();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  if (bookingId) {
    const coachQuery = coachId ? `?coachId=${encodeURIComponent(coachId)}` : '';
    return renderShell(<Redirect href={`/review/${encodeURIComponent(bookingId)}${coachQuery}`} />);
  }

  if (coachId) {
    return renderShell(<Redirect href={`/rate-coach?coachId=${encodeURIComponent(coachId)}`} />);
  }

  return renderShell(<Redirect href="/(tabs)/bookings" />);
}

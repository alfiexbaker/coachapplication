import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReviewCreateAliasScreen() {
  const { bookingId, coachId } = useLocalSearchParams<{ bookingId?: string; coachId?: string }>();

  if (bookingId) {
    const coachQuery = coachId ? `?coachId=${encodeURIComponent(coachId)}` : '';
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Redirect href={`/review/${encodeURIComponent(bookingId)}${coachQuery}`} />
      </SafeAreaView>
    );
  }

  if (coachId) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Redirect href={`/rate-coach?coachId=${encodeURIComponent(coachId)}`} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Redirect href="/(tabs)/bookings" />
    </SafeAreaView>
  );
}

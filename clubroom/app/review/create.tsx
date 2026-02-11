import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ReviewCreateAliasScreen() {
  const { bookingId, coachId } = useLocalSearchParams<{ bookingId?: string; coachId?: string }>();

  if (bookingId) {
    const coachQuery = coachId ? `?coachId=${encodeURIComponent(coachId)}` : '';
    return <Redirect href={`/review/${encodeURIComponent(bookingId)}${coachQuery}`} />;
  }

  if (coachId) {
    return <Redirect href={`/rate-coach?coachId=${encodeURIComponent(coachId)}`} />;
  }

  return <Redirect href="/(tabs)/bookings" />;
}

import { Redirect, useLocalSearchParams } from 'expo-router';

export default function BookCoachEntryScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();

  if (!coachId) {
    return <Redirect href="/book-coach" />;
  }

  return <Redirect href={`/book/${encodeURIComponent(coachId)}/session-type`} />;
}

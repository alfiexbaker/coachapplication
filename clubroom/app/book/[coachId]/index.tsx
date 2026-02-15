import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookCoachEntryScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();

  if (!coachId) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Redirect href="/book-coach" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Redirect href={`/book/${encodeURIComponent(coachId)}/session-type`} />
    </SafeAreaView>
  );
}

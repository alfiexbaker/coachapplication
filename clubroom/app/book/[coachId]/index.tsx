import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

export default function BookCoachEntryScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  if (!coachId) {
    return renderShell(<Redirect href="/book-coach" />);
  }

  return renderShell(<Redirect href={`/book/${encodeURIComponent(coachId)}/session-type`} />);
}

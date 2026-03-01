import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

export default function AnalyticsAthleteGoalsAliasScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  if (!athleteId) {
    return renderShell(<Redirect href="/goals" />);
  }

  return renderShell(<Redirect href={`/goals?athleteId=${encodeURIComponent(athleteId)}`} />);
}

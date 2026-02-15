import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnalyticsAthleteGoalsAliasScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();

  if (!athleteId) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Redirect href="/goals" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Redirect href={`/goals?athleteId=${encodeURIComponent(athleteId)}`} />
    </SafeAreaView>
  );
}

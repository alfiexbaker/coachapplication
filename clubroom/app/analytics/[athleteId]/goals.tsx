import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AnalyticsAthleteGoalsAliasScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();

  if (!athleteId) {
    return <Redirect href="/goals" />;
  }

  return <Redirect href={`/goals?athleteId=${encodeURIComponent(athleteId)}`} />;
}

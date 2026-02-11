import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ChatAliasScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId?: string }>();
  const query = athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : '';

  return <Redirect href={`/(tabs)/messages${query}`} />;
}

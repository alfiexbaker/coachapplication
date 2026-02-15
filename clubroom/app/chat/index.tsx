import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatAliasScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId?: string }>();
  const query = athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : '';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Redirect href={`/(tabs)/messages${query}`} />
    </SafeAreaView>
  );
}

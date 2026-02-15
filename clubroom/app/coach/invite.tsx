import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Routes } from '@/navigation/routes';

export default function CoachInviteAliasScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Redirect
        href={Routes.sessionsCreateIntent({
          intent: 'existing',
          source: 'manual',
          athleteIds: athleteId,
        })}
      />
    </SafeAreaView>
  );
}

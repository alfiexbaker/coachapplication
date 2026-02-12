import { Redirect, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';

export default function CoachInviteAliasScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();

  return (
    <Redirect
      href={Routes.sessionsCreateIntent({
        intent: 'existing',
        source: 'manual',
        athleteIds: athleteId,
      })}
    />
  );
}

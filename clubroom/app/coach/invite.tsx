import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CoachInviteAliasScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const query = athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : '';

  return <Redirect href={`/session-invites/create${query}`} />;
}

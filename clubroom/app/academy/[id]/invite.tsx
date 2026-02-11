import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AcademyInviteAliasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return <Redirect href="/academy/join" />;
  }

  return <Redirect href={`/academy/${encodeURIComponent(id)}/staff?openInvite=1`} />;
}

import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AcademyStaffMemberAliasScreen() {
  const { id, staffId } = useLocalSearchParams<{ id: string; staffId: string }>();

  if (!id) {
    return <Redirect href="/academy/join" />;
  }

  const query = staffId ? `?staffId=${encodeURIComponent(staffId)}` : '';
  return <Redirect href={`/academy/${encodeURIComponent(id)}/staff${query}`} />;
}

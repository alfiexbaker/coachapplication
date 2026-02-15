import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AcademyStaffMemberAliasScreen() {
  const { id, staffId } = useLocalSearchParams<{ id: string; staffId: string }>();

  if (!id) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Redirect href="/academy/join" />
      </SafeAreaView>
    );
  }

  const query = staffId ? `?staffId=${encodeURIComponent(staffId)}` : '';
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Redirect href={`/academy/${encodeURIComponent(id)}/staff${query}`} />
    </SafeAreaView>
  );
}

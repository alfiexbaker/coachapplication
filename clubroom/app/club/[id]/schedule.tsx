import { useLocalSearchParams } from 'expo-router';

import { ClubScheduleScreen } from '@/components/club/ClubScheduleScreen';

export default function ClubScheduleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClubScheduleScreen clubId={id} scope="club" />;
}

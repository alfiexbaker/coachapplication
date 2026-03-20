import { useLocalSearchParams } from 'expo-router';

import { ClubScheduleScreen } from '@/components/club/ClubScheduleScreen';

export default function SquadScheduleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClubScheduleScreen squadId={id} scope="squad" />;
}

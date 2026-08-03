import { Redirect } from 'expo-router';
import { Routes } from '@/navigation/routes';

export default function AvailabilityScreen() {
  return <Redirect href={Routes.SCHEDULE_AVAILABILITY} />;
}

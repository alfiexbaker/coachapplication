import { Redirect } from 'expo-router';
import { Routes } from '@/navigation/routes';

export default function LegacyManageRoute() {
  return <Redirect href={Routes.MANAGE_BOOKINGS} />;
}

import { Redirect } from 'expo-router';
import { Routes } from '@/navigation/routes';

export default function RosterAliasScreen() {
  return <Redirect href={Routes.ATHLETES} />;
}

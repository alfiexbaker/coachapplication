import { Redirect } from 'expo-router';
import { Routes } from '@/navigation/routes';

export default function MoreAliasRedirect() {
  return <Redirect href={Routes.SETTINGS_INDEX} />;
}

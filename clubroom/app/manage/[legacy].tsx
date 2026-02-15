import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyManageRoute() {
  const { legacy } = useLocalSearchParams<{ legacy?: string }>();

  if (legacy === 'index') {
    return <Redirect href="/manage" />;
  }

  return <Redirect href="/manage" />;
}

import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyFamilyRoute() {
  const { legacy } = useLocalSearchParams<{ legacy?: string }>();

  if (legacy === 'index') {
    return <Redirect href="/family" />;
  }

  return <Redirect href="/family" />;
}

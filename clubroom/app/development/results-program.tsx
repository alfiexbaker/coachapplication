import { Redirect, useLocalSearchParams } from 'expo-router';

import { Routes } from '@/navigation/routes';

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0]?.trim();
    return first || undefined;
  }
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export default function ResultsProgramRouteAlias() {
  const { athleteId: athleteIdRaw } = useLocalSearchParams<{ athleteId?: string | string[] }>();
  const athleteId = normalizeParam(athleteIdRaw);

  return (
    <Redirect
      href={
        athleteId
          ? Routes.developmentProgressLoop({ athleteId })
          : Routes.DEVELOPMENT_PROGRESS_LOOP
      }
    />
  );
}

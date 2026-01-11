/**
 * Skills Layout
 *
 * Handles navigation between skill tree screens.
 */

import { Stack } from 'expo-router';

export default function SkillsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[category]" />
    </Stack>
  );
}

import { Stack } from 'expo-router';

export default function NotificationsSettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="preferences" />
    </Stack>
  );
}

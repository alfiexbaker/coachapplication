import { Stack } from 'expo-router';
import { BookingFlowProvider } from '@/context/booking-flow-context';

export default function BookingWizardLayout() {
  return (
    <BookingFlowProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </BookingFlowProvider>
  );
}

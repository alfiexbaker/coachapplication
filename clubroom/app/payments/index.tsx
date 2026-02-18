import { Redirect } from 'expo-router';
import { Routes } from '@/navigation/routes';

export default function PaymentsRedirect() {
  return <Redirect href={Routes.EARNINGS} />;
}

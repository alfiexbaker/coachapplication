import { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { CreateCodeForm } from '@/components/promo';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import type { PromoCode } from '@/constants/types';

export default function CreatePromoCodeScreen() {
  useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleSuccess = useCallback(
    (promoCode: PromoCode) => {
      Alert.alert(
        'Success',
        `Promo code "${promoCode.code}" created successfully!`,
        [
          {
            text: 'View Codes',
            onPress: () => router.back(),
          },
          {
            text: 'Create Another',
            style: 'cancel',
          },
        ]
      );
    },
    [router]
  );

  const handleError = useCallback((error: string) => {
    Alert.alert('Error', error);
  }, []);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <PageContainer
      header={
        <PageHeader
          title="Create Promo Code"
          subtitle="Add a new promotional code"
          showBack
        />
      }
      scrollable={false}
    >
      <View style={styles.container}>
        <CreateCodeForm
          adminUserId={currentUser?.id ?? 'admin'}
          adminUserName={currentUser?.name ?? 'Admin'}
          onSuccess={handleSuccess}
          onError={handleError}
          onCancel={handleCancel}
        />
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: -Spacing.md, // Offset the PageContainer padding
  },
});

import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import { CardForm } from '@/components/payment/card-form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';

export default function AddCardScreen() {
  const { colors: palette } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <View style={styles.content}>
        <ThemedText type="title">Add payment method</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Mock form—no real charges.</ThemedText>
        <CardForm
          onSave={() => {
            router.back();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
});

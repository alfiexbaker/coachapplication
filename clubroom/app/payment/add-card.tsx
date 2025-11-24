import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import { CardForm } from '@/components/payment/card-form';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';

export default function AddCardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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

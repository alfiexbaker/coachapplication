import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';

import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface LegalDocumentSection {
  title: string;
  body: string;
}

interface LegalDocumentScreenProps {
  title: string;
  lastUpdated: string;
  sections: LegalDocumentSection[];
}

export function LegalDocumentScreen({
  title,
  lastUpdated,
  sections,
}: LegalDocumentScreenProps) {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <PageHeader
        title={title}
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.lastUpdated, { color: palette.muted }]}>
          Last updated: {lastUpdated}
        </ThemedText>

        {sections.map((section) => (
          <View key={section.title}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <ThemedText style={[styles.body, { color: palette.text }]}>
              {section.body}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.sm,
  },
  lastUpdated: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.subheading,
    marginTop: Spacing.sm,
  },
  body: {
    ...Typography.bodySmall,
  },
});

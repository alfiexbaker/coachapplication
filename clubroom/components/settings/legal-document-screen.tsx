import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
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

export function LegalDocumentScreen({ title, lastUpdated, sections }: LegalDocumentScreenProps) {
  const { colors: palette } = useTheme();
  const sectionItems = getLegalSectionItems(sections, palette.text);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <PageHeader
        title={title}
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
      />

      <FlatList
        data={sectionItems}
        keyExtractor={keyLegalSectionItem}
        renderItem={renderLegalSectionItem}
        ListHeaderComponent={
          <ThemedText style={[styles.lastUpdated, { color: palette.muted }]}>
            Last updated: {lastUpdated}
          </ThemedText>
        }
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

interface LegalSectionItem extends LegalDocumentSection {
  textColor: string;
}

function getLegalSectionItems(
  sections: LegalDocumentSection[],
  textColor: string,
): LegalSectionItem[] {
  return sections.map((section) => ({ ...section, textColor }));
}

function keyLegalSectionItem(item: LegalSectionItem) {
  return item.title;
}

function renderLegalSectionItem({ item }: ListRenderItemInfo<LegalSectionItem>) {
  return (
    <View>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {item.title}
      </ThemedText>
      <ThemedText style={[styles.body, { color: item.textColor }]}>{item.body}</ThemedText>
    </View>
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

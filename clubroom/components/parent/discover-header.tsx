/**
 * DiscoverHeader — Sticky header with child selector tabs and postcode search.
 */
import { memo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DiscoverHeader');

interface ChildInfo {
  id: string;
  name: string;
}

interface DiscoverHeaderProps {
  childOptions: ChildInfo[];
  selectedChildId: string | undefined;
  onSelectChild: (id: string) => void;
  postcode: string;
  onPostcodeChange: (value: string) => void;
}

function DiscoverHeaderInner({
  childOptions,
  selectedChildId,
  onSelectChild,
  postcode,
  onPostcodeChange,
}: DiscoverHeaderProps) {
  const { colors: palette } = useTheme();

  const handlePostcodeChange = useCallback(
    (value: string) => {
      const stripped = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (!stripped) {
        onPostcodeChange('');
        return;
      }
      const withSpace =
        stripped.length > 3 ? `${stripped.slice(0, stripped.length - 3)} ${stripped.slice(-3)}` : stripped;
      onPostcodeChange(withSpace);
    },
    [onPostcodeChange],
  );

  return (
    <View style={[styles.stickyHeader, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Discover Coaches</ThemedText>
        {childOptions.length === 0 ? (
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Add children to your account to book sessions
          </ThemedText>
        ) : childOptions.length === 1 ? (
          <View style={styles.singleChild}>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              Booking for {childOptions[0].name}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.childTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
              {childOptions.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => {
                      onSelectChild(child.id);
                      logger.press('ChildTab', { childId: child.id, childName: child.name });
                    }}
                    accessibilityLabel={`Select ${child.name}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.childTab,
                      { borderBottomColor: isSelected ? palette.tint : 'transparent', opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.tabText,
                        { color: isSelected ? palette.tint : palette.muted, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {child.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {childOptions.length > 0 && (
        <Row align="center" gap="sm" style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search" size={20} color={palette.icon} />
          <TextInput
            value={postcode}
            onChangeText={handlePostcodeChange}
            placeholder="Search by postcode"
            placeholderTextColor={palette.muted}
            keyboardType="default"
            autoCapitalize="characters"
            accessibilityLabel="Search by postcode"
            style={[styles.searchInput, { color: palette.text }]}
          />
          {postcode ? (
            <Clickable accessibilityLabel="Clear postcode" onPress={() => onPostcodeChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={palette.icon} />
            </Clickable>
          ) : null}
        </Row>
      )}
    </View>
  );
}

export const DiscoverHeader = memo(DiscoverHeaderInner);

const styles = StyleSheet.create({
  stickyHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  header: { gap: Spacing.xs },
  title: { ...Typography.display, letterSpacing: -0.6 },
  subtitle: { ...Typography.bodySmall, lineHeight: 20 },
  singleChild: { marginTop: Spacing.micro },
  childTabs: { marginTop: Spacing.xs, marginHorizontal: -Spacing.lg },
  tabsContent: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  childTab: { paddingBottom: Spacing.sm, borderBottomWidth: 2, minHeight: 44 },
  tabText: { ...Typography.body, letterSpacing: 0.2 },
  searchBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  searchInput: { ...Typography.bodySemiBold, flex: 1, paddingVertical: 0 },
});

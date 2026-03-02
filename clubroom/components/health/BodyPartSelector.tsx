/**
 * BodyPartSelector Component
 *
 * Visual body part selector with anatomical figure.
 * Allows users to select injured body parts from categorized groups.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Platform, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives';
import type { BodyPart, BodyPartCategory } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';

import {
  CATEGORIES,
  BodyDiagram,
  CategoryAccordionItem,
  styles,
} from './body-part-selector-sections';

interface BodyPartSelectorProps {
  selectedPart: BodyPart | null;
  onSelect: (part: BodyPart) => void;
}

export function BodyPartSelector({ selectedPart, onSelect }: BodyPartSelectorProps) {
  const { colors: palette } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<BodyPartCategory | null>(
    selectedPart ? injuryService.getBodyPartCategory(selectedPart) : null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) return CATEGORIES;
    return CATEGORIES.filter((category) =>
      injuryService
        .getBodyPartsByCategory(category.id)
        .some((part) => injuryService.getBodyPartLabel(part).toLowerCase().includes(normalizedSearch)),
    );
  }, [normalizedSearch]);

  const handleCategoryPress = useCallback(
    (category: BodyPartCategory) => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedCategory(expandedCategory === category ? null : category);
    },
    [expandedCategory],
  );

  const handlePartSelect = useCallback(
    (part: BodyPart) => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelect(part);
    },
    [onSelect],
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <BodyDiagram selectedPart={selectedPart} onSelectPart={handlePartSelect} palette={palette} />

      <View style={styles.categoriesContainer}>
        <ThemedText style={[styles.diagramHint, { color: palette.muted }]}>
          Tap the body map or pick from the list.
        </ThemedText>
        <Row
          align="center"
          gap="sm"
          style={[
            styles.searchBar,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search body parts..."
            placeholderTextColor={palette.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: palette.text }]}

            maxLength={100}
          />
          {searchTerm ? (
            <Clickable onPress={() => setSearchTerm('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </Clickable>
          ) : null}
        </Row>

        {filteredCategories.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No body parts match "{searchTerm.trim()}"
          </ThemedText>
        ) : (
          filteredCategories.map((category) => (
            <CategoryAccordionItem
              key={category.id}
              category={category}
              isExpanded={expandedCategory === category.id}
              selectedPart={selectedPart}
              onCategoryPress={handleCategoryPress}
              onPartSelect={handlePartSelect}
              searchTerm={normalizedSearch}
              palette={palette}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

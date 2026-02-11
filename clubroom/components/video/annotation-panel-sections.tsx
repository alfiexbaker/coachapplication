/**
 * Extracted sub-components for AnnotationPanel.
 *
 * formatTimestamp — seconds → mm:ss.
 * ANNOTATION_TYPES — available filter types.
 * AnnotationSearchBar — search input (accepts palette).
 * AnnotationTypeFilters — horizontal filter chips (accepts palette).
 * AnnotationListItem — single annotation row (accepts palette).
 * AnnotationEmptyState — empty state (accepts palette).
 */

import React, { memo } from 'react';
import { View, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { styles } from './annotation-panel-styles';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ANNOTATION_TYPES: VideoAnnotationType[] = [
  'HIGHLIGHT',
  'IMPROVEMENT',
  'TECHNIQUE',
  'GENERAL',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── AnnotationSearchBar ─────────────────────────────────────────────────────

interface AnnotationSearchBarProps {
  searchQuery: string;
  onChangeQuery: (query: string) => void;
  palette: ThemeColors;
}

export const AnnotationSearchBar = memo(function AnnotationSearchBar({
  searchQuery,
  onChangeQuery,
  palette,
}: AnnotationSearchBarProps) {
  return (
    <Row align="center" gap="xs" style={[styles.searchContainer, { borderColor: palette.border }]}>
      <Ionicons name="search" size={18} color={palette.muted} />
      <TextInput
        style={[styles.searchInput, { color: palette.text }]}
        placeholder="Search annotations..."
        placeholderTextColor={palette.muted}
        value={searchQuery}
        onChangeText={onChangeQuery}
      />
      {searchQuery.length > 0 && (
        <Clickable accessibilityLabel="Clear search" onPress={() => onChangeQuery('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={palette.muted} />
        </Clickable>
      )}
    </Row>
  );
});

// ─── AnnotationTypeFilters ───────────────────────────────────────────────────

interface AnnotationTypeFiltersProps {
  selectedTypes: VideoAnnotationType[];
  allAnnotations: VideoAnnotation[];
  onToggleType: (type: VideoAnnotationType) => void;
  palette: ThemeColors;
}

export const AnnotationTypeFilters = memo(function AnnotationTypeFilters({
  selectedTypes,
  allAnnotations,
  onToggleType,
  palette,
}: AnnotationTypeFiltersProps) {
  return (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Row gap="xs">
          {ANNOTATION_TYPES.map((type) => {
            const config = ANNOTATION_TYPE_CONFIG[type];
            const isSelected = selectedTypes.includes(type);
            const count = allAnnotations.filter((a) => a.type === type).length;

            return (
              <Clickable
                key={type}
                onPress={() => onToggleType(type)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? withAlpha(config.color, 0.12) : palette.background,
                    borderColor: isSelected ? config.color : palette.border,
                  },
                ]}
              >
                <Ionicons
                  name={config.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={isSelected ? config.color : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.filterLabel,
                    { color: isSelected ? config.color : palette.text },
                  ]}
                >
                  {config.label} ({count})
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </ScrollView>
    </View>
  );
});

// ─── AnnotationListItem ──────────────────────────────────────────────────────

interface AnnotationListItemProps {
  annotation: VideoAnnotation;
  isActive: boolean;
  isEditable: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  palette: ThemeColors;
}

export const AnnotationListItem = memo(function AnnotationListItem({
  annotation,
  isActive,
  isEditable,
  onSelect,
  onEdit,
  onDelete,
  palette,
}: AnnotationListItemProps) {
  const config = ANNOTATION_TYPE_CONFIG[annotation.type];

  return (
    <Clickable
      onPress={onSelect}
      style={[
        styles.annotationItem,
        {
          backgroundColor: isActive ? withAlpha(config.color, 0.06) : 'transparent',
          borderColor: isActive ? config.color : palette.border,
        },
      ]}
    >
      <View style={[styles.typeIndicator, { backgroundColor: config.color }]} />

      <View style={styles.annotationContent}>
        <Row align="center" justify="between">
          <Row align="center" gap="xs">
            <View
              style={[styles.typeBadge, { backgroundColor: withAlpha(config.color, 0.12) }]}
            >
              <Ionicons
                name={config.icon as keyof typeof Ionicons.glyphMap}
                size={12}
                color={config.color}
              />
            </View>
            <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
              {formatTimestamp(annotation.timestamp)}
            </ThemedText>
          </Row>

          {isEditable && (
            <Row gap="xs">
              {onEdit && (
                <Clickable onPress={onEdit} hitSlop={8} style={styles.actionButton}>
                  <Ionicons name="pencil" size={16} color={palette.muted} />
                </Clickable>
              )}
              {onDelete && (
                <Clickable accessibilityLabel="Delete annotation" onPress={onDelete} hitSlop={8} style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={16} color={palette.error} />
                </Clickable>
              )}
            </Row>
          )}
        </Row>

        <ThemedText style={styles.annotationLabel}>
          {annotation.label}
        </ThemedText>

        {annotation.note && (
          <ThemedText
            style={[styles.annotationNote, { color: palette.muted }]}
            numberOfLines={2}
          >
            {annotation.note}
          </ThemedText>
        )}
      </View>
    </Clickable>
  );
});

// ─── AnnotationEmptyState ────────────────────────────────────────────────────

interface AnnotationEmptyStateProps {
  hasAnnotations: boolean;
  palette: ThemeColors;
}

export const AnnotationEmptyState = memo(function AnnotationEmptyState({
  hasAnnotations,
  palette,
}: AnnotationEmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="bookmark-outline" size={40} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        {hasAnnotations
          ? 'No annotations match your filters'
          : 'No annotations yet'}
      </ThemedText>
    </View>
  );
});

export { styles };

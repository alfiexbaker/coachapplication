/**
 * AnnotationPanel Component
 *
 * A side panel displaying all annotations for a video.
 * Supports filtering by type, searching, and interactive annotation selection.
 */

import { useState, useMemo, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  AnnotationSearchBar,
  AnnotationTypeFilters,
  AnnotationListItem,
  AnnotationEmptyState,
  styles,
} from './annotation-panel-sections';

interface AnnotationPanelProps {
  annotations: VideoAnnotation[];
  currentTime: number;
  onAnnotationSelect: (annotation: VideoAnnotation) => void;
  onAnnotationDelete?: (annotation: VideoAnnotation) => void;
  onAnnotationEdit?: (annotation: VideoAnnotation) => void;
  isEditable?: boolean;
  title?: string;
}

export function AnnotationPanel({
  annotations,
  currentTime,
  onAnnotationSelect,
  onAnnotationDelete,
  onAnnotationEdit,
  isEditable = false,
  title = 'Annotations',
}: AnnotationPanelProps) {
  const { colors: palette } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<VideoAnnotationType[]>([]);

  const filteredAnnotations = useMemo(() => {
    let filtered = [...annotations];

    if (selectedTypes.length > 0) {
      filtered = filtered.filter((ann) => selectedTypes.includes(ann.type));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ann) =>
          ann.label.toLowerCase().includes(query) ||
          ann.note?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }, [annotations, selectedTypes, searchQuery]);

  const toggleTypeFilter = useCallback((type: VideoAnnotationType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  }, []);

  const isAnnotationActive = useCallback(
    (annotation: VideoAnnotation): boolean => {
      return Math.abs(currentTime - annotation.timestamp) < 2;
    },
    [currentTime]
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.surface }]}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title} ({filteredAnnotations.length})
        </ThemedText>
      </View>

      <AnnotationSearchBar
        searchQuery={searchQuery}
        onChangeQuery={setSearchQuery}
        palette={palette}
      />

      <AnnotationTypeFilters
        selectedTypes={selectedTypes}
        allAnnotations={annotations}
        onToggleType={toggleTypeFilter}
        palette={palette}
      />

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredAnnotations.length === 0 ? (
          <AnnotationEmptyState
            hasAnnotations={annotations.length > 0}
            palette={palette}
          />
        ) : (
          filteredAnnotations.map((annotation, index) => (
            <Animated.View
              key={annotation.id}
              entering={FadeInDown.delay(index * 50).springify()}
              layout={Layout.springify()}
            >
              <AnnotationListItem
                annotation={annotation}
                isActive={isAnnotationActive(annotation)}
                isEditable={isEditable}
                onSelect={() => onAnnotationSelect(annotation)}
                onEdit={onAnnotationEdit ? () => onAnnotationEdit(annotation) : undefined}
                onDelete={onAnnotationDelete ? () => onAnnotationDelete(annotation) : undefined}
                palette={palette}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

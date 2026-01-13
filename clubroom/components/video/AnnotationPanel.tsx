/**
 * AnnotationPanel Component
 *
 * A side panel displaying all annotations for a video.
 * Supports filtering by type, searching, and interactive annotation selection.
 */

import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/primitives/chip';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<VideoAnnotationType[]>([]);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredAnnotations = useMemo(() => {
    let filtered = [...annotations];

    // Filter by type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((ann) => selectedTypes.includes(ann.type));
    }

    // Filter by search query
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

  const toggleTypeFilter = (type: VideoAnnotationType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const isAnnotationActive = (annotation: VideoAnnotation): boolean => {
    return Math.abs(currentTime - annotation.timestamp) < 2;
  };

  const annotationTypes: VideoAnnotationType[] = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];

  return (
    <View style={[styles.container, { backgroundColor: palette.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title} ({filteredAnnotations.length})
        </ThemedText>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { borderColor: palette.border }]}>
        <Ionicons name="search" size={18} color={palette.muted} />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search annotations..."
          placeholderTextColor={palette.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Clickable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Clickable>
        )}
      </View>

      {/* Type Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            {annotationTypes.map((type) => {
              const config = ANNOTATION_TYPE_CONFIG[type];
              const isSelected = selectedTypes.includes(type);
              const count = annotations.filter((a) => a.type === type).length;

              return (
                <Clickable
                  key={type}
                  onPress={() => toggleTypeFilter(type)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? `${config.color}20` : palette.background,
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
          </View>
        </ScrollView>
      </View>

      {/* Annotations List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredAnnotations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={40} color={palette.muted} />
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              {annotations.length === 0
                ? 'No annotations yet'
                : 'No annotations match your filters'}
            </ThemedText>
          </View>
        ) : (
          filteredAnnotations.map((annotation, index) => {
            const config = ANNOTATION_TYPE_CONFIG[annotation.type];
            const isActive = isAnnotationActive(annotation);

            return (
              <Animated.View
                key={annotation.id}
                entering={FadeInDown.delay(index * 50).springify()}
                layout={Layout.springify()}
              >
                <Clickable
                  onPress={() => onAnnotationSelect(annotation)}
                  style={[
                    styles.annotationItem,
                    {
                      backgroundColor: isActive ? `${config.color}10` : 'transparent',
                      borderColor: isActive ? config.color : palette.border,
                    },
                  ]}
                >
                  {/* Type indicator */}
                  <View
                    style={[styles.typeIndicator, { backgroundColor: config.color }]}
                  />

                  {/* Content */}
                  <View style={styles.annotationContent}>
                    <View style={styles.annotationHeader}>
                      <View style={styles.annotationMeta}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: `${config.color}20` },
                          ]}
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
                      </View>

                      {/* Actions */}
                      {isEditable && (
                        <View style={styles.actions}>
                          {onAnnotationEdit && (
                            <Clickable
                              onPress={() => onAnnotationEdit(annotation)}
                              hitSlop={8}
                              style={styles.actionButton}
                            >
                              <Ionicons name="pencil" size={16} color={palette.muted} />
                            </Clickable>
                          )}
                          {onAnnotationDelete && (
                            <Clickable
                              onPress={() => onAnnotationDelete(annotation)}
                              hitSlop={8}
                              style={styles.actionButton}
                            >
                              <Ionicons name="trash-outline" size={16} color={palette.error} />
                            </Clickable>
                          )}
                        </View>
                      )}
                    </View>

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
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: Radii.lg,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  annotationItem: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeIndicator: {
    width: 4,
  },
  annotationContent: {
    flex: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  annotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  annotationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: 4,
  },
  annotationLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  annotationNote: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

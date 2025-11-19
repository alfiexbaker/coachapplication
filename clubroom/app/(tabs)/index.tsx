import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachCard } from '@/components/discover/coach-card';
import { FilterTray } from '@/components/discover/filter-tray';
import { MapPreview } from '@/components/discover/map-preview';
import { SectionHeader } from '@/components/primitives/section-header';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { coachProfiles } from '@/constants/mock-data';
import { FootballObjective, TrainingFormat } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

const FOCUS_OPTIONS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];
const FORMAT_OPTIONS: TrainingFormat[] = ['In-person', 'Virtual', 'Small group'];

export default function DiscoverScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const isWide = width > 900;
  const [selectedCoachId, setSelectedCoachId] = useState(coachProfiles[0]?.id);
  const [focuses, setFocuses] = useState<FootballObjective[]>([]);
  const [formats, setFormats] = useState<TrainingFormat[]>([]);

  const filteredCoaches = useMemo(() => {
    return coachProfiles.filter((coach) => {
      const focusMatch = focuses.length
        ? coach.footballFocuses.some((focus) => focuses.includes(focus))
        : true;
      const formatMatch = formats.length
        ? coach.sessionFormats.some((format) => formats.includes(format))
        : true;
      return focusMatch && formatMatch;
    });
  }, [focuses, formats]);

  useEffect(() => {
    if (filteredCoaches.length && !filteredCoaches.find((coach) => coach.id === selectedCoachId)) {
      setSelectedCoachId(filteredCoaches[0].id);
    }
  }, [filteredCoaches, selectedCoachId]);

  const filterGroups = useMemo(() => {
    return [
      {
        id: 'focuses',
        label: 'Skill focus (football only)',
        chips: FOCUS_OPTIONS.map((focus) => ({
          id: focus,
          label: focus,
          active: focuses.includes(focus),
          onPress: () =>
            setFocuses((prev) =>
              prev.includes(focus) ? prev.filter((value) => value !== focus) : [...prev, focus]
            ),
        })),
      },
      {
        id: 'formats',
        label: 'Training format',
        chips: FORMAT_OPTIONS.map((format) => ({
          id: format,
          label: format,
          active: formats.includes(format),
          onPress: () =>
            setFormats((prev) =>
              prev.includes(format) ? prev.filter((value) => value !== format) : [...prev, format]
            ),
        })),
      },
    ];
  }, [focuses, formats]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        <SectionHeader
          eyebrow="Sprint 2 · Football"
          title="Find a football coach"
          subtitle="Filters lean into football focuses (Dribbling, Passing, Defending) so players find the right fit fast."
        />
        <FilterTray
          groups={filterGroups}
          onClear={() => {
            setFocuses([]);
            setFormats([]);
          }}
        />
        <View style={[styles.split, isWide && styles.splitWide]}>
          <View style={[styles.listColumn, isWide && styles.listColumnWide]}>
            <FlatList
              data={filteredCoaches}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CoachCard
                  coach={item}
                  active={item.id === selectedCoachId}
                  onPress={() => setSelectedCoachId(item.id)}
                />
              )}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <ThemedText type="subtitle">No coaches match these filters</ThemedText>
                  <ThemedText>Try clearing filters or expanding the radius.</ThemedText>
                </View>
              )}
            />
          </View>
          <View style={[styles.mapColumn, isWide && styles.mapColumnWide]}>
            <MapPreview
              coaches={filteredCoaches.length ? filteredCoaches : coachProfiles}
              selectedCoachId={selectedCoachId}
              onCoachFocus={setSelectedCoachId}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  split: {
    flex: 1,
  },
  splitWide: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  listColumn: {
    flex: 1,
  },
  listColumnWide: {
    maxWidth: 540,
  },
  listContent: {
    paddingBottom: Spacing['3xl'],
  },
  mapColumn: {
    flex: 1,
    marginTop: Spacing.lg,
  },
  mapColumnWide: {
    marginTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing['2xl'],
  },
});

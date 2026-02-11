/**
 * useInviteAthletes — State and filter logic for the invite athlete modal.
 */
import { useState, useMemo, useCallback } from 'react';

export interface Athlete {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
  photoUrl?: string;
  age?: number;
  lastSession?: string;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  squadId?: string;
  squadName?: string;
  tags?: string[];
}

export interface Squad {
  id: string;
  name: string;
}

export type SkillFilter = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type AgeFilter = 'ALL' | 'U8' | 'U10' | 'U12' | 'U14' | 'U16' | '16+';

function isInAgeRange(age: number | undefined, filter: AgeFilter): boolean {
  if (!age || filter === 'ALL') return true;
  switch (filter) {
    case 'U8':
      return age < 8;
    case 'U10':
      return age >= 8 && age < 10;
    case 'U12':
      return age >= 10 && age < 12;
    case 'U14':
      return age >= 12 && age < 14;
    case 'U16':
      return age >= 14 && age < 16;
    case '16+':
      return age >= 16;
    default:
      return true;
  }
}

export function useInviteAthletes(athletes: Athlete[], squads: Squad[]) {
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('ALL');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('ALL');
  const [squadFilter, setSquadFilter] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.parentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSkill = skillFilter === 'ALL' || a.skillLevel === skillFilter;
      const matchesAge = isInAgeRange(a.age, ageFilter);
      const matchesSquad = squadFilter === 'ALL' || a.squadId === squadFilter;
      return matchesSearch && matchesSkill && matchesAge && matchesSquad;
    });
  }, [athletes, searchQuery, skillFilter, ageFilter, squadFilter]);

  const availableSquads = useMemo(() => {
    if (squads.length > 0) return squads;
    const squadMap = new Map<string, string>();
    athletes.forEach((a) => {
      if (a.squadId && a.squadName) squadMap.set(a.squadId, a.squadName);
    });
    return Array.from(squadMap.entries()).map(([id, name]) => ({ id, name }));
  }, [athletes, squads]);

  const groupedByParent = useMemo(() => {
    return filteredAthletes.reduce(
      (acc, athlete) => {
        if (!acc[athlete.parentId])
          acc[athlete.parentId] = { parentName: athlete.parentName, athletes: [] };
        acc[athlete.parentId].athletes.push(athlete);
        return acc;
      },
      {} as Record<string, { parentName: string; athletes: Athlete[] }>,
    );
  }, [filteredAthletes]);

  const hasActiveFilters = skillFilter !== 'ALL' || ageFilter !== 'ALL' || squadFilter !== 'ALL';

  const toggleAthlete = useCallback((athlete: Athlete, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedAthletes((prev) =>
        prev.some((a) => a.id === athlete.id)
          ? prev.filter((a) => a.id !== athlete.id)
          : [...prev, athlete],
      );
    } else {
      setSelectedAthletes([athlete]);
    }
  }, []);

  const selectAll = useCallback(() => setSelectedAthletes(filteredAthletes), [filteredAthletes]);
  const selectNone = useCallback(() => setSelectedAthletes([]), []);

  const selectBySquad = useCallback(
    (squadId: string) => {
      setSelectedAthletes(athletes.filter((a) => a.squadId === squadId));
      setSquadFilter(squadId);
    },
    [athletes],
  );

  const selectBySkillLevel = useCallback(
    (level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
      setSelectedAthletes(athletes.filter((a) => a.skillLevel === level));
      setSkillFilter(level);
    },
    [athletes],
  );

  const resetFilters = useCallback(() => {
    setSkillFilter('ALL');
    setAgeFilter('ALL');
    setSquadFilter('ALL');
    setSearchQuery('');
  }, []);

  const resetAll = useCallback(() => {
    setSelectedAthletes([]);
    setSearchQuery('');
  }, []);

  return {
    selectedAthletes,
    searchQuery,
    setSearchQuery,
    skillFilter,
    setSkillFilter,
    ageFilter,
    setAgeFilter,
    squadFilter,
    setSquadFilter,
    showFilters,
    setShowFilters,
    filteredAthletes,
    availableSquads,
    groupedByParent,
    hasActiveFilters,
    toggleAthlete,
    selectAll,
    selectNone,
    selectBySquad,
    selectBySkillLevel,
    resetFilters,
    resetAll,
  };
}

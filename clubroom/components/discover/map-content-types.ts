/**
 * Shared types for map content (native + web).
 */
import type { CoachSearchResult, FilterOptions, CoachSearchFilters } from '@/constants/types';

export interface MapScreenData {
  coaches: CoachSearchResult[];
  filterOptions: FilterOptions;
}

export interface MapContentProps {
  coaches: CoachSearchResult[];
  filterOptions: FilterOptions | null;
  filters: CoachSearchFilters;
  searchQuery: string;
  selectedCoachId: string | undefined;
  activeFilterCount: number;
  showFilterModal: boolean;
  onSearchChange: (v: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onFilterChange: (next: CoachSearchFilters) => void;
  onToggleFilterModal: (show: boolean) => void;
  onCoachSelect: (id: string) => void;
  onBookCoach: (id: string) => void;
  onBack: () => void;
  onToggleView: () => void;
}

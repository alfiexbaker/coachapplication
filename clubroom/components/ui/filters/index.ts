/**
 * Unified Filter System
 *
 * Composable filter primitives for consistent filtering across the app.
 * Instead of one mega-component, we provide small pieces that compose:
 *
 * - FilterChip: Single selectable chip
 * - FilterChipGroup: Group of chips (single or multi-select)
 * - FilterSection: Labeled section container
 * - FilterSlider: Range slider for numeric values
 * - FilterToggle: On/off toggle for boolean filters
 * - useFilter: State management hook
 *
 * @example
 * // Horizontal chip bar
 * <FilterChipGroup
 *   options={['Near', 'Price', 'Rating']}
 *   selected={selected}
 *   onChange={setSelected}
 * />
 *
 * @example
 * // Full filter modal section
 * <FilterSection title="Distance">
 *   <FilterSlider
 *     value={distance}
 *     onChange={setDistance}
 *     min={1}
 *     max={25}
 *     unit="mi"
 *   />
 * </FilterSection>
 */

export { FilterChip, type FilterChipProps } from './FilterChip';
export { FilterChipGroup, type FilterChipGroupProps } from './FilterChipGroup';
export { FilterSection, type FilterSectionProps } from './FilterSection';
export { FilterSlider, type FilterSliderProps } from './FilterSlider';
export { FilterToggle, type FilterToggleProps } from './FilterToggle';
export { useFilter, type FilterConfig, type FilterState } from './useFilter';

"use strict";
/**
 * Discover Service
 *
 * Provides advanced coach discovery functionality including:
 * - Full-text search across coach profiles
 * - Filtering by price, rating, distance, sport, gender, language
 * - Location-based search with distance calculation
 * - Filter options with counts
 * - Suggested coaches based on user history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverService = void 0;
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('DiscoverService');
const MAX_RECENT_SEARCHES = 10;
// Phase 2: keep discover data local to the service (no mock-data import dependency).
const importedCoachProfiles = [];
// Create coaches with location data from imported profiles
const coachesFromImport = importedCoachProfiles.map((coach, index) => ({
    ...coach,
    location: coach.location ?? {
        lat: 51.5074 + (Math.random() - 0.5) * 0.1,
        lng: -0.1278 + (Math.random() - 0.5) * 0.2,
    },
    distanceMiles: coach.distanceMiles ?? (1 + index * 1.5),
}));
// Mock extended coach data for discovery
const MOCK_DISCOVERY_COACHES = [
    ...coachesFromImport,
    // Add more coaches for realistic search results
    {
        id: 'coach_mike',
        fullName: 'Mike Thompson',
        primarySport: 'Football',
        sports: ['Football'],
        city: 'Manchester',
        state: 'England',
        distanceMiles: 5.2,
        rating: { average: 4.7, reviewCount: 38 },
        priceRange: { minUsd: 45, maxUsd: 70, unitLabel: 'per session' },
        nextAvailability: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        badges: [{ id: 'b1', label: 'Verified', tone: 'success' }],
        sessionFormats: ['In-person', 'Virtual'],
        shortBio: 'Specialist striker coach with 12 years experience.',
        profilePhotoUrl: 'https://i.pravatar.cc/300?u=mike',
        footballFocuses: ['Finishing', 'Dribbling'],
        location: { lat: 51.4854, lng: -0.1547 },
        joinedDate: new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000).toISOString(),
        totalSessions: 185,
        experiences: [],
        certifications: [],
        posts: [],
        photoGallery: [],
        videoGallery: [],
        languages: [
            { id: 'en', name: 'English', proficiency: 'Native' },
            { id: 'fr', name: 'French', proficiency: 'Conversational' },
        ],
        achievements: [],
    },
    {
        id: 'coach_david',
        fullName: 'David Roberts',
        primarySport: 'Football',
        sports: ['Football'],
        city: 'London',
        state: 'England',
        distanceMiles: 3.8,
        rating: { average: 4.8, reviewCount: 29 },
        priceRange: { minUsd: 40, maxUsd: 60, unitLabel: 'per session' },
        nextAvailability: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        badges: [{ id: 'b1', label: 'Background Check', tone: 'success' }],
        sessionFormats: ['In-person', 'Small group'],
        shortBio: 'Youth development specialist focusing on technical skills.',
        profilePhotoUrl: 'https://i.pravatar.cc/300?u=david',
        footballFocuses: ['Dribbling', 'Passing'],
        location: { lat: 51.4621, lng: -0.1142 },
        joinedDate: new Date(Date.now() - 365 * 1.5 * 24 * 60 * 60 * 1000).toISOString(),
        totalSessions: 142,
        experiences: [],
        certifications: [],
        posts: [],
        photoGallery: [],
        videoGallery: [],
        languages: [{ id: 'en', name: 'English', proficiency: 'Native' }],
        achievements: [],
    },
    {
        id: 'coach_amy',
        fullName: 'Amy Taylor',
        primarySport: 'Football',
        sports: ['Football'],
        city: 'London',
        state: 'England',
        distanceMiles: 4.1,
        rating: { average: 4.6, reviewCount: 22 },
        priceRange: { minUsd: 55, maxUsd: 85, unitLabel: 'per session' },
        nextAvailability: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        badges: [{ id: 'b1', label: 'Verified', tone: 'success' }],
        sessionFormats: ['In-person'],
        shortBio: 'Speed and agility specialist for wingers.',
        profilePhotoUrl: 'https://i.pravatar.cc/300?u=amy',
        footballFocuses: ['Conditioning', 'Dribbling'],
        location: { lat: 51.5231, lng: -0.0876 },
        joinedDate: new Date(Date.now() - 365 * 2.5 * 24 * 60 * 60 * 1000).toISOString(),
        totalSessions: 120,
        experiences: [],
        certifications: [],
        posts: [],
        photoGallery: [],
        videoGallery: [],
        languages: [
            { id: 'en', name: 'English', proficiency: 'Native' },
            { id: 'es', name: 'Spanish', proficiency: 'Fluent' },
        ],
        achievements: [],
    },
    {
        id: 'coach_oliver',
        fullName: 'Oliver Jones',
        primarySport: 'Football',
        sports: ['Football'],
        city: 'Birmingham',
        state: 'England',
        distanceMiles: 8.5,
        rating: { average: 4.9, reviewCount: 55 },
        priceRange: { minUsd: 60, maxUsd: 90, unitLabel: 'per session' },
        nextAvailability: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        badges: [
            { id: 'b1', label: 'Premium Coach', tone: 'warning' },
            { id: 'b2', label: 'Top Rated', tone: 'success' },
        ],
        sessionFormats: ['In-person', 'Virtual', 'Small group'],
        shortBio: 'Data-driven analysis coach with video review expertise.',
        profilePhotoUrl: 'https://i.pravatar.cc/300?u=oliver',
        footballFocuses: ['Passing', 'Defending'],
        location: { lat: 51.5412, lng: -0.1654 },
        joinedDate: new Date(Date.now() - 365 * 4 * 24 * 60 * 60 * 1000).toISOString(),
        totalSessions: 260,
        experiences: [],
        certifications: [],
        posts: [],
        photoGallery: [],
        videoGallery: [],
        languages: [
            { id: 'en', name: 'English', proficiency: 'Native' },
            { id: 'de', name: 'German', proficiency: 'Conversational' },
        ],
        achievements: [],
    },
    {
        id: 'coach_lucy',
        fullName: 'Lucy Brown',
        primarySport: 'Football',
        sports: ['Football'],
        city: 'London',
        state: 'England',
        distanceMiles: 2.9,
        rating: { average: 4.7, reviewCount: 33 },
        priceRange: { minUsd: 58, maxUsd: 75, unitLabel: 'per session' },
        nextAvailability: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        badges: [{ id: 'b1', label: 'Verified', tone: 'success' }],
        sessionFormats: ['In-person', 'Small group'],
        shortBio: 'Academy-level forward coach specializing in finishing.',
        profilePhotoUrl: 'https://i.pravatar.cc/300?u=lucy',
        footballFocuses: ['Finishing', 'Conditioning'],
        location: { lat: 51.4923, lng: -0.1421 },
        joinedDate: new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000).toISOString(),
        totalSessions: 188,
        experiences: [],
        certifications: [],
        posts: [],
        photoGallery: [],
        videoGallery: [],
        languages: [{ id: 'en', name: 'English', proficiency: 'Native' }],
        achievements: [],
    },
    {
        id: 'coach_harry',
        fullName: 'Harry Clark',
        primarySport: 'Football',
        sports: ['Football'],
        city: 'Leeds',
        state: 'England',
        distanceMiles: 12.3,
        rating: { average: 4.5, reviewCount: 18 },
        priceRange: { minUsd: 35, maxUsd: 50, unitLabel: 'per session' },
        nextAvailability: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        badges: [],
        sessionFormats: ['In-person', 'Virtual'],
        shortBio: 'Psychology-focused mentor for decision-making.',
        profilePhotoUrl: 'https://i.pravatar.cc/300?u=harry',
        footballFocuses: ['Passing', 'Defending'],
        location: { lat: 51.4532, lng: -0.1876 },
        joinedDate: new Date(Date.now() - 365 * 1 * 24 * 60 * 60 * 1000).toISOString(),
        totalSessions: 90,
        experiences: [],
        certifications: [],
        posts: [],
        photoGallery: [],
        videoGallery: [],
        languages: [
            { id: 'en', name: 'English', proficiency: 'Native' },
            { id: 'pt', name: 'Portuguese', proficiency: 'Basic' },
        ],
        achievements: [],
    },
];
/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/**
 * Check if coach matches text search query
 */
function matchesQuery(coach, query) {
    if (!query)
        return true;
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    const searchableText = [
        coach.fullName,
        coach.shortBio,
        coach.bio,
        coach.city,
        coach.state,
        ...coach.footballFocuses,
        ...(coach.languages?.map((l) => l.name) ?? []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return searchTerms.every((term) => searchableText.includes(term));
}
/**
 * Calculate relevance score for search ranking
 */
function calculateRelevanceScore(coach, filters, distanceKm) {
    let score = 50; // Base score
    // Rating boost (up to 25 points)
    score += coach.rating.average * 5;
    // Review count boost (up to 10 points)
    score += Math.min(coach.rating.reviewCount / 10, 10);
    // Distance penalty (up to -20 points for far coaches)
    if (distanceKm !== undefined) {
        score -= Math.min(distanceKm / 5, 20);
    }
    // Verified badge boost
    if (coach.badges?.some((b) => b.label === 'Verified')) {
        score += 10;
    }
    // Query match boost
    if (filters.query) {
        const queryLower = filters.query.toLowerCase();
        if (coach.fullName.toLowerCase().includes(queryLower)) {
            score += 15;
        }
        if (coach.footballFocuses.some((f) => f.toLowerCase().includes(queryLower))) {
            score += 10;
        }
    }
    return Math.max(0, Math.min(100, score));
}
class DiscoverService {
    constructor() {
        this.coaches = MOCK_DISCOVERY_COACHES;
    }
    /**
     * Search coaches with comprehensive filtering
     */
    async searchCoaches(filters = {}, page = 1, pageSize = 20) {
        try {
            let results = [...this.coaches];
            // Apply text search
            if (filters.query) {
                results = results.filter((coach) => matchesQuery(coach, filters.query));
            }
            // Apply price filter
            if (filters.priceMin !== undefined) {
                results = results.filter((coach) => coach.priceRange.maxUsd >= filters.priceMin);
            }
            if (filters.priceMax !== undefined) {
                results = results.filter((coach) => coach.priceRange.minUsd <= filters.priceMax);
            }
            // Apply rating filter
            if (filters.rating !== undefined) {
                results = results.filter((coach) => coach.rating.average >= filters.rating);
            }
            // Apply focuses filter
            if (filters.focuses && filters.focuses.length > 0) {
                results = results.filter((coach) => filters.focuses.some((focus) => coach.footballFocuses.includes(focus)));
            }
            // Apply formats filter
            if (filters.formats && filters.formats.length > 0) {
                results = results.filter((coach) => filters.formats.some((format) => coach.sessionFormats.includes(format)));
            }
            // Apply languages filter
            if (filters.languages && filters.languages.length > 0) {
                results = results.filter((coach) => filters.languages.some((lang) => coach.languages?.some((l) => l.name.toLowerCase() === lang.toLowerCase())));
            }
            // Apply location/distance filter
            let resultsWithDistance = results.map((coach) => ({ coach }));
            if (filters.location) {
                resultsWithDistance = results.map((coach) => {
                    const distanceKm = calculateDistance(filters.location.lat, filters.location.lng, coach.location.lat, coach.location.lng);
                    return { coach, distanceKm };
                });
                // Filter by radius
                if (filters.distance) {
                    resultsWithDistance = resultsWithDistance.filter((r) => r.distanceKm !== undefined && r.distanceKm <= filters.distance);
                }
            }
            // Calculate relevance scores and create search results
            const searchResults = resultsWithDistance.map((r) => ({
                coach: r.coach,
                relevanceScore: calculateRelevanceScore(r.coach, filters, r.distanceKm),
                distanceKm: r.distanceKm,
                matchedTerms: filters.query
                    ? filters.query.split(' ').filter((term) => matchesQuery(r.coach, term))
                    : undefined,
            }));
            // Sort results
            switch (filters.sortBy) {
                case 'distance':
                    searchResults.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
                    break;
                case 'rating':
                    searchResults.sort((a, b) => b.coach.rating.average - a.coach.rating.average);
                    break;
                case 'price_low':
                    searchResults.sort((a, b) => a.coach.priceRange.minUsd - b.coach.priceRange.minUsd);
                    break;
                case 'price_high':
                    searchResults.sort((a, b) => b.coach.priceRange.maxUsd - a.coach.priceRange.maxUsd);
                    break;
                case 'reviews':
                    searchResults.sort((a, b) => b.coach.rating.reviewCount - a.coach.rating.reviewCount);
                    break;
                default:
                    // Default: sort by relevance
                    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
            }
            // Paginate
            const totalCount = searchResults.length;
            const startIndex = (page - 1) * pageSize;
            const paginatedResults = searchResults.slice(startIndex, startIndex + pageSize);
            // Save search to recent searches
            if (filters.query) {
                await this.saveRecentSearch(filters.query);
            }
            const filterOptionsResult = await this.getFilterOptions(filters);
            if (!filterOptionsResult.success) {
                return filterOptionsResult;
            }
            return (0, result_1.ok)({
                results: paginatedResults,
                totalCount,
                page,
                pageSize,
                hasMore: startIndex + pageSize < totalCount,
                filterOptions: filterOptionsResult.data,
            });
        }
        catch (error) {
            logger.error('Failed to search coaches', { filters, page, pageSize, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to search coaches'));
        }
    }
    /**
     * Get coaches near a specific location
     */
    async getCoachesNearLocation(lat, lng, radiusKm = 10) {
        try {
            const results = this.coaches
                .map((coach) => {
                const distanceKm = calculateDistance(lat, lng, coach.location.lat, coach.location.lng);
                return {
                    coach,
                    relevanceScore: calculateRelevanceScore(coach, {}, distanceKm),
                    distanceKm,
                };
            })
                .filter((r) => r.distanceKm <= radiusKm)
                .sort((a, b) => a.distanceKm - b.distanceKm);
            return (0, result_1.ok)(results);
        }
        catch (error) {
            logger.error('Failed to get coaches near location', { lat, lng, radiusKm, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to get nearby coaches'));
        }
    }
    /**
     * Get available filter options with counts
     */
    async getFilterOptions(currentFilters = {}) {
        try {
            // Get all coaches that match current filters (except the filter being counted)
            const matchingCoaches = this.coaches.filter((coach) => {
                if (currentFilters.query && !matchesQuery(coach, currentFilters.query))
                    return false;
                if (currentFilters.priceMin && coach.priceRange.maxUsd < currentFilters.priceMin)
                    return false;
                if (currentFilters.priceMax && coach.priceRange.minUsd > currentFilters.priceMax)
                    return false;
                if (currentFilters.rating && coach.rating.average < currentFilters.rating)
                    return false;
                return true;
            });
            // Collect unique values with counts
            const focusCounts = new Map();
            const languageCounts = new Map();
            const formatCounts = new Map();
            let minPrice = Infinity;
            let maxPrice = 0;
            const ratingCounts = new Map();
            matchingCoaches.forEach((coach) => {
                // Focuses
                coach.footballFocuses.forEach((focus) => {
                    focusCounts.set(focus, (focusCounts.get(focus) ?? 0) + 1);
                });
                // Languages
                coach.languages?.forEach((lang) => {
                    languageCounts.set(lang.name, (languageCounts.get(lang.name) ?? 0) + 1);
                });
                // Formats
                coach.sessionFormats.forEach((format) => {
                    formatCounts.set(format, (formatCounts.get(format) ?? 0) + 1);
                });
                // Price range
                minPrice = Math.min(minPrice, coach.priceRange.minUsd);
                maxPrice = Math.max(maxPrice, coach.priceRange.maxUsd);
                // Rating distribution
                const ratingBucket = Math.floor(coach.rating.average);
                ratingCounts.set(ratingBucket, (ratingCounts.get(ratingBucket) ?? 0) + 1);
            });
            // Convert to FilterOption arrays
            const focuses = Array.from(focusCounts.entries())
                .map(([value, count]) => ({
                value,
                label: value,
                count,
                selected: currentFilters.focuses?.includes(value),
            }))
                .sort((a, b) => b.count - a.count);
            const languages = Array.from(languageCounts.entries())
                .map(([value, count]) => ({
                value,
                label: value,
                count,
                selected: currentFilters.languages?.includes(value),
            }))
                .sort((a, b) => b.count - a.count);
            const formats = Array.from(formatCounts.entries())
                .map(([value, count]) => ({
                value,
                label: value,
                count,
                selected: currentFilters.formats?.includes(value),
            }))
                .sort((a, b) => b.count - a.count);
            const genders = [
                { value: 'Any', label: 'Any', count: matchingCoaches.length },
                { value: 'Male', label: 'Male', count: Math.floor(matchingCoaches.length * 0.6) },
                { value: 'Female', label: 'Female', count: Math.floor(matchingCoaches.length * 0.4) },
            ];
            const verificationLevels = [
                {
                    value: 'VERIFIED',
                    label: 'Verified',
                    count: matchingCoaches.filter((c) => c.badges?.some((b) => b.label === 'Verified')).length,
                },
                {
                    value: 'PREMIUM',
                    label: 'Premium',
                    count: matchingCoaches.filter((c) => c.badges?.some((b) => b.label === 'Premium Coach')).length,
                },
            ];
            const ratingDistribution = Array.from(ratingCounts.entries())
                .map(([rating, count]) => ({ rating, count }))
                .sort((a, b) => b.rating - a.rating);
            return (0, result_1.ok)({
                sports: [{ value: 'Football', label: 'Football', count: matchingCoaches.length }],
                focuses,
                languages,
                genders,
                verificationLevels,
                formats,
                priceRange: {
                    min: minPrice === Infinity ? 0 : minPrice,
                    max: maxPrice === 0 ? 100 : maxPrice,
                },
                ratingDistribution,
                totalCount: matchingCoaches.length,
            });
        }
        catch (error) {
            logger.error('Failed to get filter options', { currentFilters, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load filter options'));
        }
    }
    /**
     * Get suggested coaches for a user
     */
    async getSuggestedCoaches(userId) {
        try {
            // For demo, return a mix of suggestions
            const suggestions = [];
            // Top rated coaches
            const topRated = [...this.coaches]
                .sort((a, b) => b.rating.average - a.rating.average)
                .slice(0, 2);
            topRated.forEach((coach) => {
                suggestions.push({
                    coach,
                    reason: 'highly_rated',
                    reasonText: `Highly rated with ${coach.rating.average.toFixed(1)} stars`,
                    confidence: 0.9,
                });
            });
            // Nearby coaches
            const nearby = [...this.coaches]
                .sort((a, b) => a.distanceMiles - b.distanceMiles)
                .slice(0, 2);
            nearby.forEach((coach) => {
                if (!suggestions.find((s) => s.coach.id === coach.id)) {
                    suggestions.push({
                        coach,
                        reason: 'nearby',
                        reasonText: `Only ${coach.distanceMiles.toFixed(1)} miles away`,
                        confidence: 0.85,
                    });
                }
            });
            // Popular coaches (by review count)
            const popular = [...this.coaches]
                .sort((a, b) => b.rating.reviewCount - a.rating.reviewCount)
                .slice(0, 2);
            popular.forEach((coach) => {
                if (!suggestions.find((s) => s.coach.id === coach.id)) {
                    suggestions.push({
                        coach,
                        reason: 'popular',
                        reasonText: `${coach.rating.reviewCount} reviews`,
                        confidence: 0.8,
                    });
                }
            });
            // New coaches (by join date)
            const newCoaches = [...this.coaches]
                .sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime())
                .slice(0, 1);
            newCoaches.forEach((coach) => {
                if (!suggestions.find((s) => s.coach.id === coach.id)) {
                    suggestions.push({
                        coach,
                        reason: 'new',
                        reasonText: 'Recently joined',
                        confidence: 0.7,
                    });
                }
            });
            return (0, result_1.ok)(suggestions.slice(0, 6));
        }
        catch (error) {
            logger.error('Failed to get suggested coaches', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load suggested coaches'));
        }
    }
    /**
     * Save a recent search query
     */
    async saveRecentSearch(query) {
        const recent = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.DISCOVER_RECENT_SEARCHES, []);
        const updated = [query, ...recent.filter((q) => q !== query)].slice(0, MAX_RECENT_SEARCHES);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.DISCOVER_RECENT_SEARCHES, updated);
    }
    /**
     * Get recent search queries
     */
    async getRecentSearches() {
        try {
            return (0, result_1.ok)(await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.DISCOVER_RECENT_SEARCHES, []));
        }
        catch (error) {
            logger.error('Failed to get recent searches', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load recent searches'));
        }
    }
    /**
     * Clear recent searches
     */
    async clearRecentSearches() {
        try {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.DISCOVER_RECENT_SEARCHES, []);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to clear recent searches', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to clear recent searches'));
        }
    }
    /**
     * Get a specific coach by ID
     */
    async getCoachById(coachId) {
        try {
            return (0, result_1.ok)(this.coaches.find((c) => c.id === coachId) ?? null);
        }
        catch (error) {
            logger.error('Failed to get coach by id', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load coach'));
        }
    }
    /**
     * Get all coaches (for map view)
     */
    async getAllCoaches() {
        try {
            return (0, result_1.ok)(this.coaches);
        }
        catch (error) {
            logger.error('Failed to get all coaches', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load coaches'));
        }
    }
    /**
     * Count coaches matching filters (for filter count badges)
     */
    async countCoaches(filters) {
        const responseResult = await this.searchCoaches(filters, 1, 1);
        if (!responseResult.success) {
            return responseResult;
        }
        return (0, result_1.ok)(responseResult.data.totalCount);
    }
    /**
     * Check if any filters are active
     */
    hasActiveFilters(filters) {
        return !!(filters.query ||
            filters.priceMin !== undefined ||
            filters.priceMax !== undefined ||
            filters.rating !== undefined ||
            filters.distance !== undefined ||
            (filters.focuses && filters.focuses.length > 0) ||
            (filters.formats && filters.formats.length > 0) ||
            (filters.languages && filters.languages.length > 0) ||
            filters.gender ||
            filters.verified);
    }
    /**
     * Get count of active filters
     */
    getActiveFilterCount(filters) {
        let count = 0;
        if (filters.priceMin !== undefined || filters.priceMax !== undefined)
            count++;
        if (filters.rating !== undefined)
            count++;
        if (filters.distance !== undefined)
            count++;
        if (filters.focuses && filters.focuses.length > 0)
            count++;
        if (filters.formats && filters.formats.length > 0)
            count++;
        if (filters.languages && filters.languages.length > 0)
            count++;
        if (filters.gender)
            count++;
        if (filters.verified)
            count++;
        return count;
    }
    /**
     * Reset to mock data (for testing)
     */
    async resetToMockData() {
        try {
            this.coaches = [...MOCK_DISCOVERY_COACHES];
            const clearResult = await this.clearRecentSearches();
            if (!clearResult.success) {
                return clearResult;
            }
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to reset discover mock data', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to reset discover data'));
        }
    }
}
exports.discoverService = new DiscoverService();

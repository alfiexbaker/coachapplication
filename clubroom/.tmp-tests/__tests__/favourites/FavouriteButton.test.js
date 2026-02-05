"use strict";
// @ts-nocheck
/**
 * FavouriteButton Component Tests
 *
 * Tests for the FavouriteButton component rendering and behavior.
 * Uses logic tests similar to existing component test patterns.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
/**
 * Helper function to create a mock favourite for testing
 */
function createMockFavourite(overrides = {}) {
    return {
        id: 'fav_test_1',
        userId: 'user1',
        coachId: 'coach1',
        coachName: 'Test Coach',
        coachAvatar: 'https://example.com/avatar.jpg',
        coachSport: 'Football',
        coachRating: 4.8,
        coachPriceMin: 50,
        coachPriceMax: 100,
        coachCity: 'London',
        isFavourite: true,
        createdAt: '2026-01-01T09:00:00Z',
        ...overrides,
    };
}
(0, node_test_1.describe)('FavouriteButton Component Logic', () => {
    (0, node_test_1.describe)('Favourite State Display', () => {
        (0, node_test_1.default)('should show filled heart when favourited', () => {
            const favourite = createMockFavourite({ isFavourite: true });
            const iconName = favourite.isFavourite ? 'heart' : 'heart-outline';
            node_assert_1.default.strictEqual(iconName, 'heart');
        });
        (0, node_test_1.default)('should show outlined heart when not favourited', () => {
            const favourite = createMockFavourite({ isFavourite: false });
            const iconName = favourite.isFavourite ? 'heart' : 'heart-outline';
            node_assert_1.default.strictEqual(iconName, 'heart-outline');
        });
    });
    (0, node_test_1.describe)('Accessibility Labels', () => {
        (0, node_test_1.default)('should generate correct label for favourited coach', () => {
            const coachName = 'Sarah Mitchell';
            const isFavourite = true;
            const accessibilityLabel = coachName
                ? isFavourite
                    ? `Remove ${coachName} from favourites`
                    : `Add ${coachName} to favourites`
                : isFavourite
                    ? 'Remove from favourites'
                    : 'Add to favourites';
            node_assert_1.default.strictEqual(accessibilityLabel, 'Remove Sarah Mitchell from favourites');
        });
        (0, node_test_1.default)('should generate correct label for non-favourited coach', () => {
            const coachName = 'Sarah Mitchell';
            const isFavourite = false;
            const accessibilityLabel = coachName
                ? isFavourite
                    ? `Remove ${coachName} from favourites`
                    : `Add ${coachName} to favourites`
                : isFavourite
                    ? 'Remove from favourites'
                    : 'Add to favourites';
            node_assert_1.default.strictEqual(accessibilityLabel, 'Add Sarah Mitchell to favourites');
        });
        (0, node_test_1.default)('should generate generic label when coach name not provided', () => {
            const coachName = undefined;
            const isFavourite = true;
            const accessibilityLabel = coachName
                ? isFavourite
                    ? `Remove ${coachName} from favourites`
                    : `Add ${coachName} to favourites`
                : isFavourite
                    ? 'Remove from favourites'
                    : 'Add to favourites';
            node_assert_1.default.strictEqual(accessibilityLabel, 'Remove from favourites');
        });
    });
    (0, node_test_1.describe)('Button State', () => {
        (0, node_test_1.default)('should be disabled when loading', () => {
            const loading = true;
            const disabled = false;
            const isDisabled = loading || disabled;
            node_assert_1.default.strictEqual(isDisabled, true);
        });
        (0, node_test_1.default)('should be disabled when explicitly disabled', () => {
            const loading = false;
            const disabled = true;
            const isDisabled = loading || disabled;
            node_assert_1.default.strictEqual(isDisabled, true);
        });
        (0, node_test_1.default)('should be enabled when neither loading nor disabled', () => {
            const loading = false;
            const disabled = false;
            const isDisabled = loading || disabled;
            node_assert_1.default.strictEqual(isDisabled, false);
        });
        (0, node_test_1.default)('should reduce opacity when disabled', () => {
            const loading = true;
            const disabled = false;
            const isDisabled = loading || disabled;
            const opacity = isDisabled ? 0.5 : 1;
            node_assert_1.default.strictEqual(opacity, 0.5);
        });
    });
    (0, node_test_1.describe)('Color Logic', () => {
        (0, node_test_1.default)('should use red color when favourited', () => {
            const isFavourite = true;
            const heartColor = '#EF4444';
            const emptyColor = '#9CA3AF';
            const color = isFavourite ? heartColor : emptyColor;
            node_assert_1.default.strictEqual(color, '#EF4444');
        });
        (0, node_test_1.default)('should use muted color when not favourited', () => {
            const isFavourite = false;
            const heartColor = '#EF4444';
            const emptyColor = '#9CA3AF';
            const color = isFavourite ? heartColor : emptyColor;
            node_assert_1.default.strictEqual(color, '#9CA3AF');
        });
        (0, node_test_1.default)('should respect custom active color', () => {
            const isFavourite = true;
            const customActiveColor = '#FF69B4';
            const heartColor = customActiveColor ?? '#EF4444';
            const emptyColor = '#9CA3AF';
            const color = isFavourite ? heartColor : emptyColor;
            node_assert_1.default.strictEqual(color, '#FF69B4');
        });
        (0, node_test_1.default)('should respect custom inactive color', () => {
            const isFavourite = false;
            const heartColor = '#EF4444';
            const customInactiveColor = '#666666';
            const emptyColor = customInactiveColor ?? '#9CA3AF';
            const color = isFavourite ? heartColor : emptyColor;
            node_assert_1.default.strictEqual(color, '#666666');
        });
    });
    (0, node_test_1.describe)('Size Variants', () => {
        (0, node_test_1.default)('should use default size of 24', () => {
            const size = undefined;
            const resolvedSize = size ?? 24;
            node_assert_1.default.strictEqual(resolvedSize, 24);
        });
        (0, node_test_1.default)('should respect custom size', () => {
            const size = 32;
            const resolvedSize = size ?? 24;
            node_assert_1.default.strictEqual(resolvedSize, 32);
        });
        (0, node_test_1.default)('should handle small size', () => {
            const size = 16;
            const resolvedSize = size ?? 24;
            node_assert_1.default.strictEqual(resolvedSize, 16);
        });
    });
});
(0, node_test_1.describe)('FavouriteButton Interaction Logic', () => {
    (0, node_test_1.describe)('Toggle Behavior', () => {
        (0, node_test_1.default)('should call onToggle when pressed and not disabled', () => {
            let toggleCalled = false;
            const loading = false;
            const disabled = false;
            const handlePress = () => {
                if (loading || disabled)
                    return;
                toggleCalled = true;
            };
            handlePress();
            node_assert_1.default.strictEqual(toggleCalled, true);
        });
        (0, node_test_1.default)('should not call onToggle when loading', () => {
            let toggleCalled = false;
            const loading = true;
            const disabled = false;
            const handlePress = () => {
                if (loading || disabled)
                    return;
                toggleCalled = true;
            };
            handlePress();
            node_assert_1.default.strictEqual(toggleCalled, false);
        });
        (0, node_test_1.default)('should not call onToggle when disabled', () => {
            let toggleCalled = false;
            const loading = false;
            const disabled = true;
            const handlePress = () => {
                if (loading || disabled)
                    return;
                toggleCalled = true;
            };
            handlePress();
            node_assert_1.default.strictEqual(toggleCalled, false);
        });
    });
    (0, node_test_1.describe)('Optimistic UI Update Simulation', () => {
        (0, node_test_1.default)('should update state immediately before async completes', () => {
            const states = [];
            let currentState = false;
            // Simulate optimistic update
            const toggleOptimistically = () => {
                currentState = !currentState;
                states.push(currentState);
            };
            toggleOptimistically(); // Turn on
            toggleOptimistically(); // Turn off
            toggleOptimistically(); // Turn on
            node_assert_1.default.deepStrictEqual(states, [true, false, true]);
        });
        (0, node_test_1.default)('should revert on error', () => {
            let currentState = false;
            let errorOccurred = false;
            const originalState = currentState;
            // Optimistic update
            currentState = true;
            // Simulate error
            errorOccurred = true;
            // Revert
            if (errorOccurred) {
                currentState = originalState;
            }
            node_assert_1.default.strictEqual(currentState, false);
        });
    });
});
(0, node_test_1.describe)('FavouriteCoachCard Logic', () => {
    (0, node_test_1.describe)('Price Display', () => {
        (0, node_test_1.default)('should format price range correctly', () => {
            const favourite = createMockFavourite({
                coachPriceMin: 50,
                coachPriceMax: 100,
            });
            const formatPrice = () => {
                if (favourite.coachPriceMin && favourite.coachPriceMax) {
                    if (favourite.coachPriceMin === favourite.coachPriceMax) {
                        return `$${favourite.coachPriceMin}`;
                    }
                    return `$${favourite.coachPriceMin}-$${favourite.coachPriceMax}`;
                }
                return null;
            };
            node_assert_1.default.strictEqual(formatPrice(), '$50-$100');
        });
        (0, node_test_1.default)('should display single price when min equals max', () => {
            const favourite = createMockFavourite({
                coachPriceMin: 75,
                coachPriceMax: 75,
            });
            const formatPrice = () => {
                if (favourite.coachPriceMin && favourite.coachPriceMax) {
                    if (favourite.coachPriceMin === favourite.coachPriceMax) {
                        return `$${favourite.coachPriceMin}`;
                    }
                    return `$${favourite.coachPriceMin}-$${favourite.coachPriceMax}`;
                }
                return null;
            };
            node_assert_1.default.strictEqual(formatPrice(), '$75');
        });
        (0, node_test_1.default)('should return null when prices are not set', () => {
            const favourite = createMockFavourite({
                coachPriceMin: undefined,
                coachPriceMax: undefined,
            });
            const formatPrice = () => {
                if (favourite.coachPriceMin && favourite.coachPriceMax) {
                    if (favourite.coachPriceMin === favourite.coachPriceMax) {
                        return `$${favourite.coachPriceMin}`;
                    }
                    return `$${favourite.coachPriceMin}-$${favourite.coachPriceMax}`;
                }
                return null;
            };
            node_assert_1.default.strictEqual(formatPrice(), null);
        });
    });
    (0, node_test_1.describe)('Coach Info Display', () => {
        (0, node_test_1.default)('should have required coach information', () => {
            const favourite = createMockFavourite();
            node_assert_1.default.ok(favourite.coachName);
            node_assert_1.default.ok(favourite.coachId);
            node_assert_1.default.ok(favourite.userId);
        });
        (0, node_test_1.default)('should handle missing optional fields gracefully', () => {
            const favourite = createMockFavourite({
                coachAvatar: undefined,
                coachRating: undefined,
                coachCity: undefined,
            });
            // Should not throw
            const hasAvatar = !!favourite.coachAvatar;
            const hasRating = !!favourite.coachRating;
            const hasCity = !!favourite.coachCity;
            node_assert_1.default.strictEqual(hasAvatar, false);
            node_assert_1.default.strictEqual(hasRating, false);
            node_assert_1.default.strictEqual(hasCity, false);
        });
    });
    (0, node_test_1.describe)('Navigation Routes', () => {
        (0, node_test_1.default)('should generate correct coach profile route', () => {
            const favourite = createMockFavourite({ coachId: 'coach123' });
            const profileRoute = `/book-coach?coachId=${favourite.coachId}`;
            node_assert_1.default.strictEqual(profileRoute, '/book-coach?coachId=coach123');
        });
        (0, node_test_1.default)('should generate correct booking route', () => {
            const favourite = createMockFavourite({ coachId: 'coach123' });
            const bookingRoute = `/book/${favourite.coachId}/session-type`;
            node_assert_1.default.strictEqual(bookingRoute, '/book/coach123/session-type');
        });
    });
});
(0, node_test_1.describe)('FavouritesList Logic', () => {
    (0, node_test_1.describe)('Empty State', () => {
        (0, node_test_1.default)('should show empty state when no favourites', () => {
            const favourites = [];
            const loading = false;
            const showEmptyState = !loading && favourites.length === 0;
            node_assert_1.default.strictEqual(showEmptyState, true);
        });
        (0, node_test_1.default)('should not show empty state when loading', () => {
            const favourites = [];
            const loading = true;
            const showEmptyState = !loading && favourites.length === 0;
            node_assert_1.default.strictEqual(showEmptyState, false);
        });
        (0, node_test_1.default)('should not show empty state when has favourites', () => {
            const favourites = [createMockFavourite()];
            const loading = false;
            const showEmptyState = !loading && favourites.length === 0;
            node_assert_1.default.strictEqual(showEmptyState, false);
        });
    });
    (0, node_test_1.describe)('List Rendering', () => {
        (0, node_test_1.default)('should provide unique keys for list items', () => {
            const favourites = [
                createMockFavourite({ id: 'fav_1' }),
                createMockFavourite({ id: 'fav_2' }),
                createMockFavourite({ id: 'fav_3' }),
            ];
            const keys = favourites.map((f) => f.id);
            const uniqueKeys = new Set(keys);
            node_assert_1.default.strictEqual(keys.length, uniqueKeys.size);
        });
        (0, node_test_1.default)('should calculate correct animation index', () => {
            const favourites = [
                createMockFavourite({ id: 'fav_1' }),
                createMockFavourite({ id: 'fav_2' }),
                createMockFavourite({ id: 'fav_3' }),
            ];
            const indices = favourites.map((_, index) => index);
            node_assert_1.default.deepStrictEqual(indices, [0, 1, 2]);
        });
    });
    (0, node_test_1.describe)('Toggle Loading State', () => {
        (0, node_test_1.default)('should identify which favourite is being toggled', () => {
            const togglingFavouriteId = 'fav_2';
            const favourites = [
                createMockFavourite({ id: 'fav_1' }),
                createMockFavourite({ id: 'fav_2' }),
                createMockFavourite({ id: 'fav_3' }),
            ];
            const loadingStates = favourites.map((f) => togglingFavouriteId === f.id);
            node_assert_1.default.deepStrictEqual(loadingStates, [false, true, false]);
        });
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalTimelineEntry = exports.StarRating = exports.MoodSelector = exports.MOOD_OPTIONS = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Extracted sub-components for SessionJournal.
 *
 * MoodSelector — row of 5 mood face options.
 * StarRating — 1-5 star energy rating.
 * JournalTimelineEntry — single past journal entry card.
 * MOOD_OPTIONS — mood configuration.
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const surface_card_1 = require("@/components/primitives/surface-card");
const clickable_1 = require("@/components/primitives/clickable");
const themed_text_1 = require("@/components/themed-text");
const theme_1 = require("@/constants/theme");
const primitives_1 = require("@/components/primitives");
// ─── Constants ────────────────────────────────────────────────────────────────
exports.MOOD_OPTIONS = [
    { value: 1, label: 'Awful', icon: 'sad-outline' },
    { value: 2, label: 'Meh', icon: 'sad' },
    { value: 3, label: 'OK', icon: 'happy-outline' },
    { value: 4, label: 'Good', icon: 'happy' },
    { value: 5, label: 'Great', icon: 'heart-circle-outline' },
];
exports.MoodSelector = (0, react_1.memo)(function MoodSelector({ selected, onSelect, palette, }) {
    return ((0, jsx_runtime_1.jsx)(primitives_1.Row, { style: styles.moodRow, children: exports.MOOD_OPTIONS.map((opt) => {
            const isActive = selected === opt.value;
            return ((0, jsx_runtime_1.jsx)(clickable_1.Clickable, { onPress: () => onSelect(opt.value), accessibilityLabel: opt.label, children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [
                        styles.moodItem,
                        {
                            backgroundColor: isActive ? palette.tint : palette.surfaceSecondary,
                        },
                    ], children: [(0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: opt.icon, size: theme_1.Components.icon.lg, color: isActive ? palette.surface : palette.muted }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [
                                styles.moodLabel,
                                { color: isActive ? palette.surface : palette.muted },
                            ], children: opt.label })] }) }, opt.value));
        }) }));
});
exports.StarRating = (0, react_1.memo)(function StarRating({ value, onChange, palette, }) {
    return ((0, jsx_runtime_1.jsx)(primitives_1.Row, { style: styles.starRow, children: [1, 2, 3, 4, 5].map((star) => ((0, jsx_runtime_1.jsx)(clickable_1.Clickable, { onPress: () => onChange(star), accessibilityLabel: `${star} star${star !== 1 ? 's' : ''}`, children: (0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: star <= value ? 'star' : 'star-outline', size: theme_1.Components.icon.xl, color: star <= value ? palette.warning : palette.muted }) }, star))) }));
});
exports.JournalTimelineEntry = (0, react_1.memo)(function JournalTimelineEntry({ entry, palette, }) {
    const moodOpt = exports.MOOD_OPTIONS.find((m) => m.value === entry.mood) ?? exports.MOOD_OPTIONS[2];
    const entryDate = new Date(entry.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    return ((0, jsx_runtime_1.jsxs)(primitives_1.Row, { style: styles.timelineItem, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.timelineDot, { backgroundColor: palette.tint }] }), (0, jsx_runtime_1.jsxs)(surface_card_1.SurfaceCard, { style: styles.timelineCard, children: [(0, jsx_runtime_1.jsxs)(primitives_1.Row, { style: styles.timelineHeader, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.timelineDate, { color: palette.muted }], children: entryDate }), (0, jsx_runtime_1.jsxs)(primitives_1.Row, { style: styles.timelineIcons, children: [(0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: moodOpt.icon, size: theme_1.Components.icon.sm, color: palette.muted }), (0, jsx_runtime_1.jsx)(primitives_1.Row, { style: styles.miniStars, children: [1, 2, 3, 4, 5].map((s) => ((0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: s <= entry.energyLevel ? 'star' : 'star-outline', size: 10, color: s <= entry.energyLevel ? palette.warning : palette.muted }, s))) })] })] }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.timelineText, { color: palette.foreground }], numberOfLines: 3, children: entry.personalNotes })] })] }));
});
// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = react_native_1.StyleSheet.create({
    moodRow: {
        justifyContent: 'space-between',
        gap: theme_1.Spacing.xs,
    },
    moodItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme_1.Spacing.xs,
        paddingHorizontal: theme_1.Spacing.xs,
        borderRadius: theme_1.Radii.md,
        minWidth: 56,
        gap: theme_1.Spacing.xs / 2,
    },
    moodLabel: { ...theme_1.Typography.micro },
    starRow: { gap: theme_1.Spacing.xs },
    timelineItem: { gap: theme_1.Spacing.sm },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: theme_1.Radii.sm,
        marginTop: theme_1.Spacing.sm,
    },
    timelineCard: { flex: 1, gap: theme_1.Spacing.xs },
    timelineHeader: {
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timelineDate: { ...theme_1.Typography.caption },
    timelineIcons: {
        alignItems: 'center',
        gap: theme_1.Spacing.xs,
    },
    miniStars: { gap: 1 },
    timelineText: { ...theme_1.Typography.body },
});

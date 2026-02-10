"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionJournal = SessionJournal;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * SessionJournal Component
 *
 * Athletes can view coach notes for a session, write private personal notes,
 * select a mood (5 face options via Ionicons), rate their energy level (1-5
 * stars), and save the entry. A timeline view of past journal entries is
 * rendered below.
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const surface_card_1 = require("@/components/primitives/surface-card");
const clickable_1 = require("@/components/primitives/clickable");
const themed_text_1 = require("@/components/themed-text");
const theme_1 = require("@/constants/theme");
const useTheme_1 = require("@/hooks/useTheme");
const session_journal_sections_1 = require("./session-journal-sections");
const primitives_1 = require("@/components/primitives");
function SessionJournal({ coachNotes, pastEntries, onSave }) {
    const { colors: palette } = (0, useTheme_1.useTheme)();
    const [personalNotes, setPersonalNotes] = (0, react_1.useState)('');
    const [mood, setMood] = (0, react_1.useState)(3);
    const [energy, setEnergy] = (0, react_1.useState)(3);
    const handleSave = (0, react_1.useCallback)(() => {
        if (!personalNotes.trim()) {
            react_native_1.Alert.alert('Empty notes', 'Please write something before saving.');
            return;
        }
        onSave({ personalNotes: personalNotes.trim(), mood, energyLevel: energy });
        setPersonalNotes('');
        setMood(3);
        setEnergy(3);
    }, [personalNotes, mood, energy, onSave]);
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.container, children: [coachNotes ? ((0, jsx_runtime_1.jsxs)(surface_card_1.SurfaceCard, { style: styles.section, children: [(0, jsx_runtime_1.jsxs)(primitives_1.Row, { style: styles.sectionHeader, children: [(0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: "clipboard-outline", size: theme_1.Components.icon.md, color: palette.tint }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.sectionTitle, { color: palette.foreground }], children: "Coach's Notes" })] }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.coachNotes, { color: palette.foreground }], children: coachNotes })] })) : null, (0, jsx_runtime_1.jsxs)(surface_card_1.SurfaceCard, { style: styles.section, children: [(0, jsx_runtime_1.jsxs)(primitives_1.Row, { style: styles.sectionHeader, children: [(0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: "journal-outline", size: theme_1.Components.icon.md, color: palette.tint }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.sectionTitle, { color: palette.foreground }], children: "My Notes" }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.privateTag, { color: palette.muted }], children: "(private)" })] }), (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { style: [
                            styles.textInput,
                            {
                                color: palette.foreground,
                                backgroundColor: palette.surfaceSecondary,
                                borderColor: palette.border,
                            },
                        ], value: personalNotes, onChangeText: setPersonalNotes, placeholder: "How did the session go?", placeholderTextColor: palette.muted, multiline: true, textAlignVertical: "top" }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.fieldLabel, { color: palette.foreground }], children: "How I Felt" }), (0, jsx_runtime_1.jsx)(session_journal_sections_1.MoodSelector, { selected: mood, onSelect: setMood, palette: palette }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.fieldLabel, { color: palette.foreground }], children: "Energy Level" }), (0, jsx_runtime_1.jsx)(session_journal_sections_1.StarRating, { value: energy, onChange: setEnergy, palette: palette }), (0, jsx_runtime_1.jsx)(clickable_1.Clickable, { onPress: handleSave, accessibilityLabel: "Save Entry", children: (0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.saveButton, { backgroundColor: palette.tint }], children: (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.saveButtonText, { color: palette.surface }], children: "Save Entry" }) }) })] }), pastEntries.length > 0 && ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.timelineSection, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.sectionTitle, { color: palette.foreground }], children: "Past Entries" }), pastEntries.map((entry) => ((0, jsx_runtime_1.jsx)(session_journal_sections_1.JournalTimelineEntry, { entry: entry, palette: palette }, entry.id)))] }))] }));
}
const styles = react_native_1.StyleSheet.create({
    container: { gap: theme_1.Spacing.md },
    section: { gap: theme_1.Spacing.sm },
    sectionHeader: {
        alignItems: 'center',
        gap: theme_1.Spacing.xs,
    },
    sectionTitle: { ...theme_1.Typography.subheading },
    privateTag: { ...theme_1.Typography.caption },
    coachNotes: { ...theme_1.Typography.body },
    textInput: {
        minHeight: 100,
        borderRadius: theme_1.Radii.md,
        borderWidth: 1,
        paddingHorizontal: theme_1.Spacing.sm,
        paddingVertical: theme_1.Spacing.sm,
        ...theme_1.Typography.body,
    },
    fieldLabel: {
        ...theme_1.Typography.bodySemiBold,
        marginTop: theme_1.Spacing.xs,
    },
    saveButton: {
        height: theme_1.Components.button.height,
        borderRadius: theme_1.Radii.button,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme_1.Spacing.xs,
    },
    saveButtonText: { ...theme_1.Typography.bodySemiBold },
    timelineSection: { gap: theme_1.Spacing.sm },
});

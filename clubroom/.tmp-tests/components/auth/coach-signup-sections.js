"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupSubmitButton = exports.CoachFormFields = exports.InviteCodeSection = exports.INVITE_CODES = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Extracted sub-components for CoachSignupScreen.
 *
 * INVITE_CODES — mock invite code data.
 * InviteCodeSection — invite code input + verify button.
 * CoachFormFields — 5 form fields for coach details.
 * SignupSubmitButton — submit button with disabled state.
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const clickable_1 = require("@/components/primitives/clickable");
const themed_text_1 = require("@/components/themed-text");
const theme_1 = require("@/constants/theme");
const primitives_1 = require("@/components/primitives");
// ─── Constants ────────────────────────────────────────────────────────────────
exports.INVITE_CODES = [
    {
        code: 'clubroom-coach',
        status: 'active',
        schoolId: 'school-1',
        schoolName: 'Elite Sports Academy',
        currentUses: 0,
        maxUses: 10,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
];
exports.InviteCodeSection = (0, react_1.memo)(function InviteCodeSection({ inviteCode, onChangeCode, onValidate, inviteValidated, inviteError, validatedSchoolName, palette, }) {
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.inviteSection, children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.fieldGroup, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.label, children: "School Invite Code" }), (0, jsx_runtime_1.jsxs)(primitives_1.Row, { style: styles.inviteRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.TextInput, { value: inviteCode, onChangeText: onChangeCode, autoCapitalize: "characters", autoCorrect: false, placeholder: "HIGHPRESS2024", placeholderTextColor: palette.muted, style: [
                                styles.input,
                                styles.inviteInput,
                                {
                                    borderColor: inviteValidated ? palette.success : palette.border,
                                    backgroundColor: palette.card,
                                },
                            ], returnKeyType: "go", onSubmitEditing: onValidate, editable: !inviteValidated }), (0, jsx_runtime_1.jsx)(clickable_1.Clickable, { style: ({ pressed }) => [
                                styles.validateButton,
                                {
                                    backgroundColor: inviteValidated
                                        ? palette.success
                                        : pressed
                                            ? palette.tintPressed
                                            : palette.tint,
                                    opacity: pressed || !inviteCode ? 0.7 : 1,
                                },
                            ], disabled: !inviteCode || inviteValidated, onPress: onValidate, children: (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.validateButtonText, { color: palette.onPrimary }], children: inviteValidated ? 'Verified' : 'Verify' }) })] }), inviteError ? ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.helper, { color: palette.error }], children: inviteError })) : inviteValidated && validatedSchoolName ? ((0, jsx_runtime_1.jsxs)(themed_text_1.ThemedText, { style: [styles.helper, { color: palette.success }], children: ["Verified for ", validatedSchoolName] })) : null] }) }));
});
exports.CoachFormFields = (0, react_1.memo)(function CoachFormFields({ fullName, email, phone, password, confirmPassword, onChangeFullName, onChangeEmail, onChangePhone, onChangePassword, onChangeConfirmPassword, onSubmit, palette, }) {
    const inputStyle = [styles.input, { borderColor: palette.border, backgroundColor: palette.card }];
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.fieldGroup, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.label, children: "Full Name" }), (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { value: fullName, onChangeText: onChangeFullName, placeholder: "John Smith", placeholderTextColor: palette.muted, style: inputStyle, returnKeyType: "next" })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.fieldGroup, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.label, children: "Email" }), (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { value: email, onChangeText: onChangeEmail, autoCapitalize: "none", keyboardType: "email-address", placeholder: "coach@email.com", placeholderTextColor: palette.muted, style: inputStyle, returnKeyType: "next" })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.fieldGroup, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.label, children: "Phone" }), (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { value: phone, onChangeText: onChangePhone, keyboardType: "phone-pad", placeholder: "+1 (555) 123-4567", placeholderTextColor: palette.muted, style: inputStyle, returnKeyType: "next" })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.fieldGroup, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.label, children: "Password" }), (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { value: password, onChangeText: onChangePassword, secureTextEntry: true, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", placeholderTextColor: palette.muted, style: inputStyle, returnKeyType: "next" })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.fieldGroup, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.label, children: "Confirm Password" }), (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { value: confirmPassword, onChangeText: onChangeConfirmPassword, secureTextEntry: true, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", placeholderTextColor: palette.muted, style: inputStyle, returnKeyType: "go", onSubmitEditing: onSubmit })] })] }));
});
exports.SignupSubmitButton = (0, react_1.memo)(function SignupSubmitButton({ isValid, onPress, palette, }) {
    return ((0, jsx_runtime_1.jsx)(clickable_1.Clickable, { accessibilityRole: "button", style: ({ pressed }) => [
            styles.button,
            {
                backgroundColor: !isValid ? palette.border : pressed ? palette.tintPressed : palette.tint,
                opacity: pressed || !isValid ? 0.9 : 1,
            },
        ], disabled: !isValid, onPress: onPress, children: (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.buttonLabel, { color: palette.onPrimary }], children: "Create Coach Account" }) }));
});
// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = react_native_1.StyleSheet.create({
    inviteSection: { paddingTop: theme_1.Spacing.xs },
    fieldGroup: { gap: theme_1.Spacing.xs },
    label: { fontWeight: '600' },
    input: {
        ...theme_1.Typography.subheading,
        borderWidth: 1,
        borderRadius: theme_1.Radii.md,
        paddingHorizontal: theme_1.Spacing.md,
        paddingVertical: theme_1.Spacing.sm,
    },
    inviteRow: { gap: theme_1.Spacing.xs },
    inviteInput: {
        flex: 1,
        fontFamily: react_native_1.Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontWeight: '600',
    },
    validateButton: {
        paddingHorizontal: theme_1.Spacing.lg,
        paddingVertical: theme_1.Spacing.sm,
        borderRadius: theme_1.Radii.md,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    validateButtonText: { ...theme_1.Typography.bodySmallSemiBold },
    helper: { ...theme_1.Typography.bodySmall, opacity: 0.9 },
    button: {
        marginTop: theme_1.Spacing.sm,
        paddingVertical: theme_1.Spacing.md,
        borderRadius: theme_1.Radii.md,
        alignItems: 'center',
    },
    buttonLabel: { ...theme_1.Typography.subheading },
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CoachSignupScreen;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const clickable_1 = require("@/components/primitives/clickable");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const surface_card_1 = require("@/components/primitives/surface-card");
const Divider_1 = require("@/components/ui/primitives/Divider");
const themed_text_1 = require("@/components/themed-text");
const theme_1 = require("@/constants/theme");
const useTheme_1 = require("@/hooks/useTheme");
const coach_signup_sections_1 = require("./coach-signup-sections");
function CoachSignupScreen({ onSignupComplete, onBackToLogin, }) {
    const { colors: palette } = (0, useTheme_1.useTheme)();
    const [inviteCode, setInviteCode] = (0, react_1.useState)('');
    const [inviteValidated, setInviteValidated] = (0, react_1.useState)(false);
    const [validatedSchool, setValidatedSchool] = (0, react_1.useState)(null);
    const [inviteError, setInviteError] = (0, react_1.useState)('');
    const [fullName, setFullName] = (0, react_1.useState)('');
    const [email, setEmail] = (0, react_1.useState)('');
    const [phone, setPhone] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [confirmPassword, setConfirmPassword] = (0, react_1.useState)('');
    const [formError, setFormError] = (0, react_1.useState)('');
    const validateInviteCode = () => {
        const code = inviteCode.trim().toUpperCase();
        const invite = coach_signup_sections_1.INVITE_CODES.find((inv) => inv.code === code && inv.status === 'active');
        if (!invite) {
            setInviteError('Invalid or expired invite code');
            setInviteValidated(false);
            return;
        }
        if (invite.currentUses >= invite.maxUses) {
            setInviteError('This invite code has reached its maximum uses');
            setInviteValidated(false);
            return;
        }
        if (new Date(invite.expiresAt) < new Date()) {
            setInviteError('This invite code has expired');
            setInviteValidated(false);
            return;
        }
        setInviteError('');
        setInviteValidated(true);
        setValidatedSchool({ id: invite.schoolId, name: invite.schoolName });
    };
    const handleSubmit = () => {
        setFormError('');
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            setFormError('Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            setFormError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setFormError('Password must be at least 6 characters');
            return;
        }
        if (!inviteValidated || !validatedSchool) {
            setFormError('Please validate your invite code first');
            return;
        }
        onSignupComplete({
            fullName,
            email,
            phone,
            password,
            inviteCode: inviteCode.trim().toUpperCase(),
            schoolId: validatedSchool.id,
            schoolName: validatedSchool.name,
        });
    };
    const handleCodeChange = (text) => {
        setInviteCode(text);
        setInviteValidated(false);
        setInviteError('');
    };
    const isFormValid = inviteValidated &&
        fullName &&
        email &&
        phone &&
        password &&
        confirmPassword &&
        password === confirmPassword &&
        password.length >= 6;
    return ((0, jsx_runtime_1.jsx)(react_native_safe_area_context_1.SafeAreaView, { style: [styles.safeArea, { backgroundColor: palette.background }], edges: ['top', 'bottom'], children: (0, jsx_runtime_1.jsx)(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === 'ios' ? 'padding' : undefined, style: styles.wrapper, children: (0, jsx_runtime_1.jsxs)(react_native_1.ScrollView, { contentContainerStyle: styles.scrollContent, showsVerticalScrollIndicator: false, children: [(0, jsx_runtime_1.jsxs)(surface_card_1.SurfaceCard, { style: styles.card, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { type: "eyebrow", style: styles.eyebrow, children: "Coach Registration" }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { type: "title", style: styles.title, children: "Join Your School" }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.subtitle, children: "Enter your invite code from your school." }), (0, jsx_runtime_1.jsx)(coach_signup_sections_1.InviteCodeSection, { inviteCode: inviteCode, onChangeCode: handleCodeChange, onValidate: validateInviteCode, inviteValidated: inviteValidated, inviteError: inviteError, validatedSchoolName: validatedSchool?.name, palette: palette }), inviteValidated && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(Divider_1.Divider, { spacing: theme_1.Spacing.sm }), (0, jsx_runtime_1.jsx)(coach_signup_sections_1.CoachFormFields, { fullName: fullName, email: email, phone: phone, password: password, confirmPassword: confirmPassword, onChangeFullName: setFullName, onChangeEmail: setEmail, onChangePhone: setPhone, onChangePassword: setPassword, onChangeConfirmPassword: setConfirmPassword, onSubmit: handleSubmit, palette: palette }), formError ? ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: { color: palette.error, opacity: 0.9 }, children: formError })) : null, (0, jsx_runtime_1.jsx)(coach_signup_sections_1.SignupSubmitButton, { isValid: !!isFormValid, onPress: handleSubmit, palette: palette })] }))] }), (0, jsx_runtime_1.jsx)(clickable_1.Clickable, { onPress: onBackToLogin, style: styles.backButton, children: (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.backButtonText, children: "Already have an account? Sign in" }) })] }) }) }));
}
const styles = react_native_1.StyleSheet.create({
    safeArea: { flex: 1 },
    wrapper: { flex: 1 },
    scrollContent: { padding: theme_1.Spacing.lg, gap: theme_1.Spacing.lg },
    card: { gap: theme_1.Spacing.md },
    eyebrow: { opacity: 0.7 },
    title: { textAlign: 'left' },
    subtitle: { opacity: 0.8 },
    backButton: { alignItems: 'center', paddingVertical: theme_1.Spacing.md },
    backButtonText: { opacity: 0.7 },
});

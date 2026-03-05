# Feedback Surface Policy

Last updated: 2026-03-05

This policy defines where user feedback belongs in Clubroom.

## Decision Matrix

| Scenario | Preferred Surface | Notes |
|---|---|---|
| Success confirmation | Toast (`success`) | Non-blocking only |
| Recoverable error | Toast (`error`) with retry action when possible | Keep user in current context |
| Field validation | Inline field error | Do not use popup for validation |
| Cross-field validation | Inline + `StatusBanner` | Banner should include clear next step |
| Destructive action confirmation | `useAppAlert().confirm(...)` | Required for irreversible changes |
| Multi-option decision (3+ options) | `useAppActionSheet().choose(...)` | Avoid crowded confirm dialogs |
| Text capture that used to rely on `Alert.prompt` | `useAppPrompt().promptText(...)` | Use in-app input flow |
| Permission education | Inline card/banner + CTA | Native OS permission modal only when requesting permission |

## Anti-Patterns

- Do not add native `Alert.alert` / `Alert.prompt` in product flows.
- Do not use popup dialogs for success toasts or basic validation copy.
- Do not block the user with an informational modal when a toast/banner is sufficient.

## Exceptions

Native alerts are allowed only for platform-level technical constraints.
Every exception must include:

1. Callsite comment with rationale
2. Owner
3. Removal target date


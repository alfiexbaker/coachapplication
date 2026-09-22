# P1-CI — Infrastructure & CI Hardening

**Category**: Infrastructure/CI (45 → 80)
**Scope**: Config files ONLY. Do NOT touch app/, components/, or services/.
**Run**: FIRST in Phase 1 (other agents depend on tsconfig.test.json updates)

## Files to Modify

| File | Change |
|------|--------|
| `clubroom/tsconfig.json` | Verify strict: true (should already be set) |
| `clubroom/tsconfig.test.json` | Add include entries for ALL new test directories from P1-T-A through P1-T-D |
| `clubroom/tsconfig.typecheck.json` | Expand include to cover FULL codebase, not just booking flow |
| `clubroom/.github/workflows/ci.yml` | Change typecheck step to use expanded tsconfig. Add bundle size check |
| `clubroom/eslint.config.js` | Add rules: no-console (error in services/), prefer-const, no-unused-vars |
| `clubroom/.prettierrc` | CREATE — 2 space indent, single quotes, trailing comma, 100 char width |
| `clubroom/package.json` | Add prettier script, add format:check to CI |

## Detailed Instructions

### 1. tsconfig.typecheck.json — Full Codebase Coverage
Current state: Only typechecks ~10 booking flow files. Change include to:
```json
{
  "extends": "./tsconfig.json",
  "include": [
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.ts",
    "components/**/*.tsx",
    "services/**/*.ts",
    "hooks/**/*.ts",
    "hooks/**/*.tsx",
    "constants/**/*.ts",
    "types/**/*.ts",
    "utils/**/*.ts",
    "navigation/**/*.ts"
  ],
  "exclude": ["node_modules", ".tmp-tests"]
}
```

### 2. tsconfig.test.json — Add New Test Paths
Add these to the `include` array (for P1-T-A through P1-T-D test files):
```
".tmp-tests/services/analytics/**/*.js",
".tmp-tests/services/booking/**/*.js",
".tmp-tests/services/community/**/*.js",
".tmp-tests/services/counter-offer-service.test.js",
".tmp-tests/services/earnings/**/*.js",
".tmp-tests/services/event/**/*.js",
".tmp-tests/services/family/**/*.js",
".tmp-tests/services/favourite-service.test.js",
".tmp-tests/services/group-session/**/*.js",
".tmp-tests/services/invite/**/*.js",
".tmp-tests/services/invoice-service.test.js",
".tmp-tests/services/messaging-service.test.js",
".tmp-tests/services/notification/**/*.js",
".tmp-tests/services/package-service.test.js",
".tmp-tests/services/progress/**/*.js",
".tmp-tests/services/push-notification-service.test.js",
".tmp-tests/services/referral-service.test.js",
".tmp-tests/services/report-service.test.js",
".tmp-tests/services/reschedule-service.test.js",
".tmp-tests/services/review-service.test.js",
".tmp-tests/services/rsvp-service.test.js",
".tmp-tests/services/seen-service.test.js",
".tmp-tests/services/skills/**/*.js",
".tmp-tests/services/trial-service.test.js",
".tmp-tests/services/verification-service.test.js",
".tmp-tests/services/waitlist-service.test.js",
".tmp-tests/services/wallet/**/*.js"
```

### 3. CI Workflow — Full Typecheck
In `.github/workflows/ci.yml`, change typecheck step to:
```yaml
- name: Type Check
  run: npx tsc -p tsconfig.typecheck.json --noEmit
```

### 4. ESLint — Stricter Rules
Add to eslint.config.js:
```js
{
  files: ['services/**/*.ts'],
  rules: {
    'no-console': 'error',
  }
}
```

### 5. Prettier — Create Config
Create `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Add to package.json scripts:
```json
"format:check": "prettier --check 'app/**/*.tsx' 'components/**/*.tsx' 'services/**/*.ts' 'hooks/**/*.ts'"
```

## Quality Gate
- [ ] `npx tsc -p tsconfig.typecheck.json --noEmit` passes on FULL codebase
- [ ] CI workflow updated and would typecheck all files
- [ ] Prettier config created
- [ ] ESLint no-console rule added for services/
- [ ] tsconfig.test.json updated with all new test paths

## Do NOT Touch
- Any files in app/, components/, services/, hooks/
- package-lock.json (will auto-update)

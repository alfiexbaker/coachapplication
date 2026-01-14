# Getting Started

> Complete setup guide for developing on the Clubroom codebase.

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or 20.x | JavaScript runtime |
| npm | 9.x+ | Package manager |
| Git | 2.x+ | Version control |
| Watchman | Latest | File watching (macOS) |
| Xcode | 15+ | iOS development |
| Android Studio | Latest | Android development |

### Optional Tools

| Tool | Purpose |
|------|---------|
| VS Code | Recommended IDE |
| Expo Go | Quick mobile testing |
| React Native Debugger | Advanced debugging |

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/coachapplication.git
cd coachapplication/clubroom
```

### 2. Install Dependencies

```bash
npm install
```

### 3. iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

### 4. Environment Setup

Create a `.env` file in the `clubroom` directory:

```env
# API Configuration
API_URL=http://localhost:3000/api

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_PUSH_NOTIFICATIONS=true

# Development
USE_MOCK_DATA=true
```

---

## Running the App

### Development Server

Start the Expo development server:

```bash
npm start
```

This opens the Expo Dev Tools in your browser.

### iOS Simulator

```bash
npm run ios
```

Or press `i` in the terminal after `npm start`.

### Android Emulator

```bash
npm run android
```

Or press `a` in the terminal after `npm start`.

### Physical Device

1. Install Expo Go on your device
2. Scan the QR code from Expo Dev Tools
3. Or run `npx expo start --tunnel` for remote access

---

## Project Structure

```
clubroom/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   ├── book/              # Booking flow
│   ├── club/              # Club pages
│   └── ...
├── components/             # React components
│   ├── primitives/        # Base components
│   ├── ui/                # UI elements
│   ├── coach/             # Coach features
│   └── ...
├── constants/              # Configuration
│   ├── theme.ts           # Colors, spacing
│   ├── types.ts           # TypeScript types
│   └── mock-data.ts       # Demo data
├── contexts/               # React contexts
├── hooks/                  # Custom hooks
├── services/               # Business logic
├── utils/                  # Utilities
├── __tests__/              # Test suites
├── app.json               # Expo config
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Edit files in your IDE. Hot reload will apply changes automatically.

### 3. Run Tests

```bash
npm test
```

### 4. Type Check

```bash
npm run typecheck
```

### 5. Lint

```bash
npm run lint
```

### 6. Commit

```bash
git add .
git commit -m "feat: add new feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructure
- `test:` Tests
- `chore:` Maintenance

### 7. Push & PR

```bash
git push -u origin feature/your-feature-name
```

Create a Pull Request on GitHub.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm test` | Run test suites |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint code linting |
| `npm run prebuild` | Generate native projects |

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test

```bash
npm test -- --test-name-pattern="BookingService"
```

### Watch Mode

```bash
npm test -- --watch
```

### Test Structure

```
__tests__/
├── booking/
│   └── booking-service.test.ts
├── availability/
│   └── availability-service.test.ts
├── clubs/
│   └── club-service.test.ts
└── ...
```

---

## Debugging

### React Native Debugger

1. Install React Native Debugger
2. Start with `npm start`
3. Press `j` to open debugger
4. Use Chrome DevTools for inspection

### Console Logging

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('MyComponent');

logger.info('action_performed', { data });
logger.error('action_failed', { error });
```

### AsyncStorage Viewer

View stored data:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// In dev console
const keys = await AsyncStorage.getAllKeys();
console.log(keys);

const data = await AsyncStorage.getItem('clubroom.bookings');
console.log(JSON.parse(data));
```

---

## Mock Data

### Resetting Data

Each service has a reset method:

```typescript
import { bookingService } from '@/services/booking-service';

await bookingService.resetToMockData();
```

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Parent | parent@demo.com | demo1234 |
| Coach | coach@demo.com | demo1234 |

### Mock Data Location

```
constants/mock-data.ts
```

---

## Common Issues

### Metro Bundler Cache

Clear cache if you see stale code:

```bash
npm start -- --clear
```

### iOS Build Failures

Reset iOS build:

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

### Android Build Failures

Clean Android build:

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### TypeScript Errors

Restart TypeScript server in VS Code:
1. Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
2. "TypeScript: Restart TS Server"

### Node Modules Issues

Clean install:

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

## IDE Setup

### VS Code Extensions

Recommended extensions:

- ESLint
- Prettier
- TypeScript React code snippets
- React Native Tools
- GitLens

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Next Steps

1. **Read Architecture** - See `docs/ARCHITECTURE.md`
2. **Explore Features** - Browse `docs/features/`
3. **Understand Data** - Review `docs/technical/DATABASE-SCHEMA.md`
4. **Follow User Flows** - Check `docs/guides/USER-FLOWS.md`

---

## Getting Help

- **Documentation**: Check `docs/` directory
- **Code Examples**: Look at existing components
- **Issues**: Create GitHub issue
- **Team**: Reach out on Slack #clubroom-dev

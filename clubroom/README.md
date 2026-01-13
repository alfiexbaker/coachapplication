# Clubroom - Coach Booking Platform

A React Native / Expo app for connecting athletes with coaches. Built with file-based routing and a modular service architecture.

## Architecture Overview

```
clubroom/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (tabs)/            # Tab navigation screens
│   ├── book/              # Booking wizard flow
│   ├── sessions/          # Session management
│   └── ...
├── components/            # Reusable UI components (50 folders with index.ts exports)
│   ├── ui/               # Core UI primitives and booking components
│   ├── bookings/         # Booking list/card components
│   └── ...
├── services/             # Business logic layer (43 services)
│   ├── booking-service.ts      # All booking creation
│   ├── invite-service.ts       # Unified invites (session, bulk, squad)
│   ├── progress-service.ts     # Goals, notes, skill tracking
│   └── ...
├── constants/            # App constants and configuration
│   ├── storage-keys.ts   # All 74 AsyncStorage keys
│   └── ...
└── hooks/                # Custom React hooks
```

### Key Services

| Service | Responsibility |
|---------|---------------|
| `booking-service.ts` | Single source of truth for all booking creation |
| `invite-service.ts` | Session, bulk, and squad invites (unified) |
| `progress-service.ts` | Goals, session notes, skill levels |
| `video-service.ts` | Video management + annotations |
| `family-service.ts` | Family members + guardian sharing |
| `scheduling-rules-service.ts` | Availability rules + cancellation policies |

For full architecture details, see `../CODEBASE_AUDIT_REPORT.md`.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npm run dev
   ```

   > You can also run `npx expo start` directly if you prefer.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# UI Flow Check Report (50+)

- Base URL: http://localhost:8083
- Generated: 2026-08-01T22:36:55.431Z
- Total flows: 11
- Failed: 0
- High: 0
- Medium: 1
- Roles: coach, parent, guardian, athlete, admin
- Profiles: coach-profile-canonical
- Retries: 0

## High / Medium Findings

- [MEDIUM] athlete_coach_profile_denied (/coach-profile) :: console:[ERROR] [22:36:37.039] [BookingCrudService] Failed to list bookings | console:Stack: Error: Failed to fetch
    at BookingCrudService.list (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:381330:17)
    at async Object.getBookingsForUser (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:387435:26)
    at async Object.loadHomeFrame (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:522993:28)
    at async http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415069:33
    at async runAsyncTryCatchFinally (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:405825:14)
    at async Object.t17 [as current] (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415068:16) | console:Message: Failed to fetch | console:[ERROR] [22:36:37.040] [BookingSearchService] Failed to get bookings | console:Stack: Error: Failed to fetch
    at BookingCrudService.list (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:381330:17)
    at async Object.getBookingsForUser (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:387435:26)
    at async Object.loadHomeFrame (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:522993:28)
    at async http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415069:33
    at async runAsyncTryCatchFinally (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:405825:14)
    at async Object.t17 [as current] (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415068:16) | console:Message: Failed to fetch | console:[ERROR] [22:36:37.040] [UserHomeScreen] Failed to load home data | console:Stack: Error: Failed to fetch
    at BookingCrudService.list (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:381330:17)
    at async Object.getBookingsForUser (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:387435:26)
    at async Object.loadHomeFrame (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:522993:28)
    at async http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415069:33
    at async runAsyncTryCatchFinally (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:405825:14)
    at async Object.t17 [as current] (http://localhost:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415068:16) | console:Message: Failed to fetch

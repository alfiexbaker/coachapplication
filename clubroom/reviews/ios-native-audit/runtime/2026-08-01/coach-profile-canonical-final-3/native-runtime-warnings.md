# Native runtime warnings

The installed `ClubroomDev.app` bundled successfully and rendered the real Clubroom sign-in screen. Metro emitted seven existing circular-import warnings during the cached native reload:

1. `child-service` → family permission → notification stack → user/family member → `child-service`
2. notification stack → community media authority → user/family member → booking CRUD → notification service
3. notification trigger → notification stack → user/family member → booking CRUD → notification trigger
4. notification trigger → notification stack → user/family member → booking/progress services → notification trigger
5. notification service → notification store → community media authority → user/family member → booking status → notification service
6. user service → family member service → booking status → user service
7. event CRUD → club service → club schedule service → event CRUD

The app reached sign-in after the warnings, so no startup crash was observed. React Native warns that these cycles can still expose uninitialised imports. This is recorded as `QA-024` and remains open for a small, separately traced architecture slice rather than a speculative broad refactor inside the coach-profile route change.

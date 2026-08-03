# UI Flow Check Report (admin, chunk-1-of-1)

- Base URL: http://127.0.0.1:8083
- Generated: 2026-08-01T16:18:55.313Z
- Total flows: 1
- Failed: 0
- High: 0
- Medium: 1
- Roles: admin
- Profiles: booking-detail-audit
- Chunk size: 1
- Chunk index: 1
- Retries: 1

## High / Medium Findings

- [MEDIUM] admin_booking_detail_denied (/bookings/bok_af55c625-92ff-4063-b135-41a9f309d326) :: response:403:GET:http://localhost:4000/v1/bookings/bok_af55c625-92ff-4063-b135-41a9f309d326 | console:Failed to load resource: the server responded with a status of 403 (Forbidden) | console:[ERROR] [16:18:52.605] [BookingAuthorityService] Failed to get booking via API | console:Error data: {bookingId: bok_af55c625-92ff-4063-b135-41a9f309d326, error: Object} | console:[ERROR] [16:18:52.605] [BookingCrudService] Failed to get booking | console:Stack: Error: Booking does not belong to authenticated user
    at BookingCrudService.getBooking (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:381359:33)
    at async Object.loadBooking (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:436819:25)
    at async http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415039:33
    at async runAsyncTryCatchFinally (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:405795:14)
    at async Object.t17 [as current] (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415038:16) | console:Message: Booking does not belong to authenticated user | console:[ERROR] [16:18:52.605] [useBookingDetail] Failed to load booking | console:Stack: Error: Booking does not belong to authenticated user
    at BookingCrudService.getBooking (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:381359:33)
    at async Object.loadBooking (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:436819:25)
    at async http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415039:33
    at async runAsyncTryCatchFinally (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:405795:14)
    at async Object.t17 [as current] (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415038:16) | console:Message: Booking does not belong to authenticated user

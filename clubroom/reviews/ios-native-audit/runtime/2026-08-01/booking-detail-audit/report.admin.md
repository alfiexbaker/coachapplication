# UI Flow Check Report (admin)

- Base URL: http://127.0.0.1:8083
- Generated: 2026-08-01T15:57:48.575Z
- Total flows: 1
- Failed: 0
- High: 0
- Medium: 1
- Roles: admin
- Profiles: booking-detail-audit
- Chunk size: 1
- Retries: 1

## High / Medium Findings

- [MEDIUM] admin_booking_detail_denied (/bookings/bok_af55c625-92ff-4063-b135-41a9f309d326) :: response:403:GET:http://localhost:4000/v1/bookings/bok_af55c625-92ff-4063-b135-41a9f309d326 | console:Failed to load resource: the server responded with a status of 403 (Forbidden) | console:[ERROR] [15:57:45.076] [BookingAuthorityService] Failed to get booking via API | console:Error data: {bookingId: bok_af55c625-92ff-4063-b135-41a9f309d326, error: Object} | console:[ERROR] [15:57:45.076] [BookingCrudService] Failed to get booking | console:Stack: Error: Booking does not belong to authenticated user
    at BookingCrudService.getBooking (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:381358:19)
    at async Object.loadBooking (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:438856:25)
    at async http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415015:33
    at async runAsyncTryCatchFinally (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:405771:14)
    at async Object.t17 [as current] (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415014:16) | console:Message: Booking does not belong to authenticated user | console:[ERROR] [15:57:45.077] [useBookingDetail] Failed to load booking | console:Stack: Error: Booking does not belong to authenticated user
    at BookingCrudService.getBooking (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:381358:19)
    at async Object.loadBooking (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:438856:25)
    at async http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415015:33
    at async runAsyncTryCatchFinally (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:405771:14)
    at async Object.t17 [as current] (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:415014:16) | console:Message: Booking does not belong to authenticated user | response:403:GET:http://localhost:4000/v1/bookings/bok_af55c625-92ff-4063-b135-41a9f309d326/session-note | console:Failed to load resource: the server responded with a status of 403 (Forbidden) | console:[ERROR] [15:57:45.098] [useSessionNote] Failed to load session note | console:Stack: FeedbackAuthorityError: Booking does not belong to authenticated user
    at throwFeedbackAuthorityError (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:388217:11)
    at Object.getSessionNote (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:388535:9)
    at async http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:440540:30
    at async runAsyncTryCatchFinally (http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:405771:14)
    at async http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable:440539:11 | console:Message: Booking does not belong to authenticated user | state:unexpected_error_visible

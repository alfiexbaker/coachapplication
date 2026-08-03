# UI Flow Check Report (50+)

- Base URL: http://localhost:8083
- Generated: 2026-07-31T22:14:38.915Z
- Total flows: 1
- Failed: 1
- High: 1
- Medium: 0
- Roles: coach
- Profiles: settings-routes
- Chunk size: 1
- Chunk index: 5
- Retries: 2

## High / Medium Findings

- [HIGH] coach_settings_help (/settings/help) :: action_failed:clickButton:TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'Cancel' }).first()[22m
[2m    - locator resolved to <button tabindex="0" role="button" type="button" aria-label="How do I cancel a booking?" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-flexDirection-18u37iz r-gap-f4gmv6 r-minHeight-10gryf7 r-padding-nsbfu8">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <button tabindex="0" role="button" type="button" aria-label="Suggest a feature" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-borderRadius-1q9bdsx r-borderWidth-rs99b7 r-justifyContent-1777fci r-minHeight-peo1c r-paddingInline-3pj75a">…</button> from <div>…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    14 × waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <button tabindex="0" role="button" type="button" aria-label="Suggest a feature" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-borderRadius-1q9bdsx r-borderWidth-rs99b7 r-justifyContent-1777fci r-minHeight-peo1c r-paddingInline-3pj75a">…</button> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
 | action_failed:assertTextAbsent:Error: Text should be absent: Choose what you want to send. | action_failed:clickButton:TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'How do I book a session?' }).first()[22m
[2m    - locator resolved to <button tabindex="0" role="button" type="button" aria-label="How do I book a session?" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-flexDirection-18u37iz r-gap-f4gmv6 r-minHeight-10gryf7 r-padding-nsbfu8">…</button>[22m
[2m  - attempting click action[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  13 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 500ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
 | action_failed:assertTextVisible:Error: Text not visible: Open Bookings, choose Find a session, then select a coach or session and follow the booking steps. | action_failed:clickButton:TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'How do I book a session?' }).first()[22m
[2m    - locator resolved to <button tabindex="0" role="button" type="button" aria-label="How do I book a session?" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-flexDirection-18u37iz r-gap-f4gmv6 r-minHeight-10gryf7 r-padding-nsbfu8">…</button>[22m
[2m  - attempting click action[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
 | action_failed:clickButton:TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'How do I book a session?' }).first()[22m
[2m    - locator resolved to <button tabindex="0" role="button" type="button" aria-label="How do I book a session?" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-flexDirection-18u37iz r-gap-f4gmv6 r-minHeight-10gryf7 r-padding-nsbfu8">…</button>[22m
[2m  - attempting click action[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="css-view-g5y9jx r-overflow-1udh08x r-alignSelf-1kihuf0 r-borderRadius-1867qdf r-borderWidth-rs99b7 r-gap-f4gmv6 r-padding-d23pfw r-width-13qz1uu">…</div> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <button tabindex="0" role="button" type="button" aria-label="Dismiss action sheet" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af"></button> from <div>…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
 | action_failed:assertTextVisible:Error: Text not visible: Open Bookings, choose Find a session, then select a coach or session and follow the booking steps. | action_failed:assertScrollTop:Error: Route did not open at the top: div:56

# Apple and App Store stance

Policy snapshot checked: 8 September 2026. Apple can change policy and App Review applies it to the submitted build, so recheck before every submission.

## Current submission verdict

**No-go.** Stripe is permitted for Clubroom's in-person football sessions under Guideline 3.1.3(e), but the current build is not submission-ready. Non-in-person offering creation and public exposure are now closed for launch. Before review, finish associated-data deletion/anonymisation; prove timely human UGC/media moderation; publish final retention/privacy terms; close the child-data assessment; use a production-ready backend; and complete truthful age-rating and privacy answers.

## What Clubroom may sell outside In-App Purchase

Clubroom's core is unusually clear: in-person coaching is a physical service consumed outside the app. Under Guideline 3.1.3(e), it should use payment methods other than Apple In-App Purchase, including ordinary card entry or Apple Pay.

| Product | Apple treatment | Launch decision |
|---|---|---|
| In-person 1:1 football session | External payment | Stripe card/Apple Pay |
| In-person group session | External payment | Stripe card/Apple Pay |
| Several in-person sessions from one Supplier | External payment | One same-Supplier checkout allowed |
| In-person programme/package | External payment if genuinely physical | Allowed with clear dates/delivery |
| Live remote 1:1 | External payment can be allowed under 3.1.3(d) | Defer and ask App Review about parent/child structure |
| Live remote one-to-few/one-to-many | IAP required | Do not sell through Stripe |
| Recorded course/video/digital plan or standalone feedback | IAP required | Do not sell externally in iOS |
| Family premium app features | IAP required | No launch tier |
| Paid post/listing/profile boost | IAP required | Do not launch |
| Coach/club digital SaaS used in the app | IAP likely unless narrow enterprise/companion exception is accepted | Obtain written App Review clarification |

Do not bundle separately valuable digital content with a physical booking to avoid IAP. A short note/video genuinely incidental to the attended session remains an interpretation question; do not price or market it separately until Apple clarifies.

Current runtime boundary: new `VIRTUAL` and `DIGITAL_PRODUCT` templates/offerings are rejected, and legacy non-in-person offerings are excluded from every public catalogue. Keep this boundary for the launch build. Reopening either mode requires explicit party-size classification and StoreKit wherever Guidelines 3.1.1 or 3.1.3(d) require it.

No StoreKit external-purchase entitlement or warning screen is needed for a normal physical-service checkout.

## Apple Pay checkout

Apple Pay is suitable but not mandatory; card entry alone is permitted. If offered:

- use Apple's genuine button and branding and show it only on supported devices;
- show Supplier, participants, sessions, dates, venues, total, mandatory fees, tax where applicable, and cancellation/refund position before authorisation;
- keep sessions as understandable line items that reconcile exactly to the total;
- make the payment-sheet business name match what appears on the bank statement;
- where Clubroom is intermediary, use a truthful format such as `Pay [Coach or Club] via Clubroom`, subject to provider configuration/App Review confirmation;
- handle cancellation, decline and retry without creating a booking;
- configure Merchant ID, capability and certificate correctly.

Apple supports multi-merchant Apple Pay, but that does not remove PSP, legal, refund or reconciliation complexity. One-Supplier baskets remain the right launch limit.

## Organisation account

Submit through an organisation Apple Developer account owned by the incorporated Clubroom company, not the founder's personal seller account. Clubroom processes sensitive child/family information; Apple expects the legal entity providing that service to submit it.

Align the company, App Store seller name, privacy-controller identity, terms, Stripe account, domain and support details.

## Kids Category and age rating

Clubroom should not select “Made for Kids” or the Kids Category. It is an adult-led multi-role commerce/administration product, not an app primarily designed for children aged 11 and under. Selection brings permanent/category-specific restrictions.

That does not remove child privacy or safeguarding duties.

- Do not use “For Kids/Children” branding in title, icon, subtitle, screenshots or description.
- Answer age-rating questions honestly for health/wellness, messaging, UGC and social capability.
- Posts/comments distributed to many users are likely social-media capability.
- Apple's July 2026 classification gives declared social-media capability a minimum 13+ rating.
- From September 2026, the social-media question is required for new submissions and updates.
- If Clubroom represents that social features are disabled under 13, it needs the Declared Age Range API at minimum to enforce the choice.
- Clubroom's terms currently require account holders to be 18+. Complete the questionnaire honestly and override to a matching higher rating where Apple requires the published rating to reflect Clubroom's own minimum-age terms. An App Store rating is not permission for an under-18 login; younger Players remain parent-managed profiles without their own accounts.

The simplest launch is parent-managed child profiles, no public social feed and no independent under-13 account.

## UGC, messaging and recording

Messages, posts, comments, reviews, photos and videos trigger Guideline 1.2. Every retained surface needs:

- objectionable-content filtering before/at posting as appropriate;
- visible reporting;
- a real, timely operational response process;
- ability to block abusive users;
- published support/contact details;
- enforcement against bullying, threats, sexual content and exploitation;
- no random/anonymous chat.

For Clubroom, also require assigned-relationship access, guardian control/visibility for minor messaging, parent-controlled publication, audit evidence and no child contact/medical/emergency/precise-location detail in content or notifications.

Camera or microphone recording requires explicit consent and a clear visible/audible recording indicator.

## Account deletion and login

Every account-creating app needs an easy-to-find in-app route to initiate full deletion. Deactivation is insufficient. Reauthentication/confirmation is allowed; forcing ordinary users to phone or negotiate by email is not.

The flow must:

- state the processing timeline and confirm completion;
- remove associated posts, media and other UGC unless a disclosed legal retention obligation applies;
- distinguish deleted active profile data from isolated payment, dispute, safeguarding and audit records retained lawfully;
- allow the adult to delete a parent-managed child profile;
- revoke Sign in with Apple tokens if used.

Current runtime status (8 September 2026): the in-app request, stated 30-day window, supervised due-request execution, access closure, direct profile scrubbing, completion-email claim/retry state, and successful-send destination clearing are implemented and tested in their local/API layers. Since 23 September 2026, Players left with no active guardian are erased with the account (medical, SEN, injury and emergency-contact records deleted; identity replaced by a non-identifying tombstone; consent records kept as evidence), a Home led alone is closed rather than blocking deletion, requests require password re-confirmation, and users can download their data in-app. This still does not satisfy a full-deletion claim because associated posts/comments/messages/media, provider tokens, object bytes, backups, counsel-approved retention periods, a final public privacy notice and a production email-provider run remain open. Guideline 5.1.1(v) expects associated user-generated content to be removed unless a specific legal retention duty applies. Clubroom must not describe the current bounded result as total erasure.

Clubroom's current first-party email/password login does not require Sign in with Apple under the company-owned login exception in Guideline 4.8. If Google, Facebook or another primary social login is added, provide an equivalent privacy-preserving option; Sign in with Apple is the safest route and its tokens must be revoked during account deletion.

## Privacy, permissions and SDKs

Maintain a public privacy-policy URL in App Store Connect and in the app. The policy and App Privacy answers must match the final binary and actual provider flows.

Likely label categories include contact information, health, sensitive information, location where transmitted, private messages, photos/videos, other UGC, identifiers, purchase history, product interaction and diagnostics. Payment information can be omitted as Clubroom-collected only if entered in provider-controlled UI that Clubroom truly never receives or accesses.

Rules for launch:

- medical information supplied by a family is Health data even without HealthKit;
- do not put personal health information in iCloud/CloudKit;
- never use health/fitness/medical data for advertising, marketing or profiling;
- request location only when directly relevant and offer manual venue search where practical;
- prefer system photo picker over full library access;
- request camera/microphone/photos/location only at the moment of use;
- do not require push/location/tracking for unrelated functionality;
- do not request App Tracking Transparency if Clubroom does no cross-app/site tracking;
- keep confidential data out of push text; promotional push needs opt-in and in-app opt-out.

For the Expo/React Native release archive:

- generate and inspect Xcode's privacy report;
- include a valid `PrivacyInfo.xcprivacy`;
- declare each Required Reason API;
- validate privacy manifests/signatures for relevant third-party SDKs;
- audit the shipped native binary, not just `package.json`;
- recheck Expo, React Native, Stripe, analytics, crash, maps, media, notifications and auth libraries.

## App Review package

Prepare:

- stable demo accounts for each adult launch role, including parent/guardian, coach and club administration, plus a Home containing fictional Player profiles;
- wholly fictional children, medical data, messages and bookings;
- seeded Supplier and physical session;
- complete booking, payment, cancellation and refund states;
- no OTP dependency blocking the reviewer;
- live backend during review;
- precise role/navigation instructions;
- note that external checkout is only for physical services under 3.1.3(e);
- explanation of legal Supplier and Clubroom fee;
- working terms, privacy, support and deletion links;
- accurate screenshots with fictional data;
- detailed Review Notes and responsive contact.

## App Store launch blockers

1. Submission remains under an individual rather than Clubroom organisation account.
2. Account deletion remains bounded `CLOSED_WITH_RETENTION`, without complete Player/UGC/object/backup/provider-revocation and production-notification proof.
3. Any UGC/message surface lacks filter, report, block, contact or genuine response operations.
4. Under-13/social capability position is unresolved.
5. Privacy policy, labels, manifests, Required Reason APIs or SDK signatures are incomplete.
6. Medical/child data appears in push, analytics, public content or iCloud.
7. Permission prompts are vague, premature or mandatory for unrelated features.
8. Apple Pay does not identify the payment parties/charge truthfully.
9. Digital content, remote group, SaaS or boost purchases use Stripe in iOS.
10. Social login exists without an equivalent privacy-preserving option.
11. Reviewers cannot reach roles or complete the booking journey.
12. Demo/screenshot data contains a real child.
13. The production build exposes priced virtual/digital offers that cannot complete through a compliant payment path.
14. The in-app privacy notice still contains unresolved or placeholder retention language.

## How to get someone from Apple involved

Book Apple's official 30-minute App Review Webex appointment using the app's Apple ID. This is the closest practical way to get direct Apple guidance before submission. Ask:

1. Does a parent-funded remote 1:1 between one coach and one child qualify for external payment?
2. Does parent observation make it one-to-few?
3. Are included written notes/private short video after a physical session incidental to that service or digital content?
4. Can organisation-paid staff SaaS qualify under 3.1.3(c)?
5. Can Clubroom be a free companion to web-purchased organisation SaaS under 3.1.3(f) with no iOS purchase CTA?
6. Does a closed club/squad feed count as “social media capabilities” in the current questionnaire?
7. Is parent-controlled profile deletion enough for a managed, non-authenticated child profile?
8. What reviewer payment setup is preferred for Stripe Connect plus Apple Pay?
9. Is `Pay [Coach/Club] via Clubroom` correct for the proposed charge configuration?

Keep notes and follow up through the App Store Connect review conversation so there is a written record. An appointment is official guidance, not binding pre-approval, and successful review is not a permanent policy guarantee.

## Sources

See [sources.md](sources.md), Apple section.

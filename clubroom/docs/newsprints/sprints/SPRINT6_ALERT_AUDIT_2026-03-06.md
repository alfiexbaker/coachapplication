# Sprint 6 Alert Audit (2026-03-06)

## Summary
- Remaining `uiFeedback.alert(...)` callsites: **88**
- Classified as `decision`: **88**
- Classified as `action-sheet`: **0** (migrated to `uiFeedback.choose(...)` in this pass)
- Classified as `informational`: **0** (non-decision informational alerts migrated to toast/inline)

## Scope
- Multi-choice menu popups migrated to explicit action-sheet API (`uiFeedback.choose`) in:
  - `hooks/use-help-screen.ts`
  - `hooks/use-invites.ts`
  - `app/chat/[threadId].tsx`
  - `components/athlete/athlete-quick-actions.tsx`
  - `hooks/use-recurring-template-form.ts`

## Remaining Callsites (All Decision Points)
| File | Line | Alert Title (expr) | Category | Why Kept |
|---|---:|---|---|---|
| app/community/[groupId].tsx | 116 | `'Leave Group'` | decision | destructive or blocking user decision |
| app/development/my-progress.tsx | 209 | `'No coach to message yet'` | decision | destructive or blocking user decision |
| app/development/progress-loop.tsx | 867 | `title` | decision | destructive state change requires explicit confirmation |
| app/drills/create.tsx | 70 | `'Discard Changes?'` | decision | destructive state change requires explicit confirmation |
| app/session-invites/[id].tsx | 207 | `'Decline Invite'` | decision | destructive state change requires explicit confirmation |
| app/session-invites/[id].tsx | 233 | `'Cancel Invite'` | decision | destructive state change requires explicit confirmation |
| app/session-invites/index.tsx | 94 | `'Decline Invite'` | decision | destructive state change requires explicit confirmation |
| app/session-invites/index.tsx | 124 | `'Cancel Invite'` | decision | destructive state change requires explicit confirmation |
| app/session-invites/index.tsx | 150 | `'Remove Invite'` | decision | destructive state change requires explicit confirmation |
| components/athlete/athlete-emergency-card.tsx | 42 | `'Call Emergency Contact'` | decision | safety-critical action requires deliberate confirmation |
| components/athlete/athlete-notes-tab-sections.tsx | 26 | `'Delete Note'` | decision | destructive state change requires explicit confirmation |
| components/child/emergency-contact-card.tsx | 32 | `'Delete Emergency Contact'` | decision | destructive state change requires explicit confirmation |
| components/child/medical-consent-toggle.tsx | 43 | `'Remove Emergency Treatment Consent'` | decision | destructive state change requires explicit confirmation |
| components/club/ClubHeader.tsx | 115 | `'Leave Club'` | decision | destructive or blocking user decision |
| components/club/ClubHeader.tsx | 123 | `'Delete Club'` | decision | destructive state change requires explicit confirmation |
| components/club/MembersPanel.tsx | 49 | `member.userName` | decision | destructive state change requires explicit confirmation |
| components/coach/block-date-modal.tsx | 166 | `'Block Time Off'` | decision | destructive state change requires explicit confirmation |
| components/coach/block-date-modal.tsx | 202 | `'Discard Block?'` | decision | destructive state change requires explicit confirmation |
| components/coach/session-type-modal.tsx | 96 | `\`Delete "${name}"?\`` | decision | destructive state change requires explicit confirmation |
| components/development/coach-observation-modal.tsx | 91 | `'Discard Changes?'` | decision | destructive state change requires explicit confirmation |
| components/earnings/session-payment-item.tsx | 54 | `'Confirm payment'` | decision | destructive or blocking user decision |
| components/earnings/session-payment-item.tsx | 71 | `'Undo payment?'` | decision | destructive or blocking user decision |
| components/earnings/session-payment-item.tsx | 89 | `'Write off payment?'` | decision | destructive state change requires explicit confirmation |
| components/event/CheckInButton.tsx | 94 | `'Undo Check-in'` | decision | destructive or blocking user decision |
| components/family/sharing-invite-modal.tsx | 77 | `'Discard Invite?'` | decision | destructive state change requires explicit confirmation |
| components/family/sharing-pending-invites.tsx | 27 | `'Cancel Invite'` | decision | destructive state change requires explicit confirmation |
| components/goals/MilestoneList.tsx | 71 | `'Delete Milestone'` | decision | destructive state change requires explicit confirmation |
| components/group/quick-rate-modal.tsx | 162 | `'Discard Ratings?'` | decision | destructive state change requires explicit confirmation |
| components/invite/invite-list-card.tsx | 127 | `'Cancel Invite'` | decision | destructive state change requires explicit confirmation |
| components/invite/invite-list-card.tsx | 142 | `'Remove Invite'` | decision | destructive state change requires explicit confirmation |
| components/invoices/mark-paid-button.tsx | 29 | `'Mark as Paid'` | decision | destructive state change requires explicit confirmation |
| components/location/add-location-picker.native.tsx | 198 | `'Location Privacy'` | decision | destructive or blocking user decision |
| components/match/availability-response-sections.tsx | 204 | `'Change Response'` | decision | destructive or blocking user decision |
| components/notification/notification-card.tsx | 198 | `'Mute similar notifications?'` | decision | destructive state change requires explicit confirmation |
| components/notification/notification-card.tsx | 213 | `'Delete Notification'` | decision | destructive state change requires explicit confirmation |
| components/progress/goals-compact.tsx | 152 | `'Discard Goal?'` | decision | destructive state change requires explicit confirmation |
| components/safety/emergency-contact-card-sections.tsx | 52 | `'Call Emergency Contact?'` | decision | safety-critical action requires deliberate confirmation |
| components/sessions/session-instance-manager.tsx | 40 | `'Cancel Session'` | decision | destructive or blocking user decision |
| components/sessions/session-instance-manager.tsx | 55 | `'End Recurring Series'` | decision | destructive or blocking user decision |
| components/squad/squad-members-card.tsx | 56 | `'Remove Squad Member'` | decision | destructive state change requires explicit confirmation |
| hooks/use-account-settings.ts | 67 | `'Delete Account'` | decision | destructive state change requires explicit confirmation |
| hooks/use-account-settings.ts | 133 | `'Deactivate Account'` | decision | destructive state change requires explicit confirmation |
| hooks/use-add-child.ts | 324 | `'Resume draft?'` | decision | destructive state change requires explicit confirmation |
| hooks/use-athlete-detail.ts | 103 | `'Delete Note'` | decision | destructive state change requires explicit confirmation |
| hooks/use-athlete-detail.ts | 149 | `'Remove Athlete'` | decision | destructive state change requires explicit confirmation |
| hooks/use-availability-wizard.ts | 213 | `'Appointments on Removed Days'` | decision | destructive state change requires explicit confirmation |
| hooks/use-blocked-dates.ts | 215 | `'Bookings exist this week'` | decision | destructive or blocking user decision |
| hooks/use-blocked-dates.ts | 230 | `'Remove blocked dates?'` | decision | destructive state change requires explicit confirmation |
| hooks/use-booking-detail.ts | 198 | `'Issue Refund'` | decision | financial action requires explicit confirmation |
| hooks/use-bookings-discover.ts | 334 | `'Decline Invite?'` | decision | destructive state change requires explicit confirmation |
| hooks/use-bookings.ts | 679 | `'Decline Invite?'` | decision | destructive state change requires explicit confirmation |
| hooks/use-children-hub.ts | 163 | `'Remove Child'` | decision | destructive state change requires explicit confirmation |
| hooks/use-club-detail.ts | 280 | `'Leave club'` | decision | destructive or blocking user decision |
| hooks/use-club-hub.ts | 465 | `'Club options'` | decision | workflow branching choice with materially different outcomes |
| hooks/use-club-settings.ts | 264 | `'Delete Club'` | decision | destructive state change requires explicit confirmation |
| hooks/use-club-settings.ts | 274 | `'Final Confirmation'` | decision | destructive state change requires explicit confirmation |
| hooks/use-club-settings.ts | 306 | `'Delete invite code?'` | decision | destructive state change requires explicit confirmation |
| hooks/use-coach-invites.ts | 151 | `'Decline Invite'` | decision | destructive state change requires explicit confirmation |
| hooks/use-coach-observations.ts | 103 | `'Delete Observation'` | decision | destructive state change requires explicit confirmation |
| hooks/use-discover-sessions.ts | 314 | `'Decline Invite?'` | decision | destructive state change requires explicit confirmation |
| hooks/use-edit-template.ts | 122 | `'Delete Template'` | decision | destructive state change requires explicit confirmation |
| hooks/use-emergency-access.ts | 64 | `'Call Emergency Contact'` | decision | safety-critical action requires deliberate confirmation |
| hooks/use-emergency-access.ts | 85 | `'Call Doctor'` | decision | safety-critical action requires deliberate confirmation |
| hooks/use-event-detail.ts | 112 | `'Cancel Event'` | decision | destructive or blocking user decision |
| hooks/use-family-sharing.ts | 157 | `'Remove Guardian'` | decision | destructive state change requires explicit confirmation |
| hooks/use-family-sharing.ts | 184 | `'Cancel Invitation'` | decision | destructive state change requires explicit confirmation |
| hooks/use-goal-detail.ts | 160 | `'Delete Goal'` | decision | destructive state change requires explicit confirmation |
| hooks/use-group-roster.ts | 241 | `'Cancel Registration'` | decision | destructive state change requires explicit confirmation |
| hooks/use-group-session.ts | 357 | `title` | decision | destructive state change requires explicit confirmation |
| hooks/use-group-session.ts | 385 | `'Cancel Registration'` | decision | destructive or blocking user decision |
| hooks/use-group-session.ts | 461 | `'Cancel Session'` | decision | destructive state change requires explicit confirmation |
| hooks/use-health-detail.ts | 93 | `'Mark as Healed'` | decision | destructive state change requires explicit confirmation |
| hooks/use-injuries.ts | 179 | `'Mark as recovered?'` | decision | destructive state change requires explicit confirmation |
| hooks/use-invites.ts | 110 | `'Decline Invite'` | decision | destructive state change requires explicit confirmation |
| hooks/use-invoice-detail.ts | 77 | `'Mark as Paid'` | decision | destructive state change requires explicit confirmation |
| hooks/use-invoice-detail.ts | 98 | `'Void Invoice'` | decision | destructive state change requires explicit confirmation |
| hooks/use-match-detail.ts | 177 | `'Cancel Match'` | decision | destructive or blocking user decision |
| hooks/use-member-management.ts | 148 | `'Remove Member'` | decision | destructive state change requires explicit confirmation |
| hooks/use-member-management.ts | 179 | `'Ban Member'` | decision | destructive state change requires explicit confirmation |
| hooks/use-objectives.ts | 196 | `'Delete Goal'` | decision | destructive state change requires explicit confirmation |
| hooks/use-post-detail.ts | 198 | `'Delete Comment'` | decision | destructive state change requires explicit confirmation |
| hooks/use-recurring-template-form.ts | 245 | `'Delete Slot'` | decision | destructive state change requires explicit confirmation |
| hooks/use-session-detail-modal.ts | 713 | `'Cancel Session'` | decision | destructive or blocking user decision |
| hooks/use-session-detail-modal.ts | 865 | `'Cancel Booking'` | decision | destructive state change requires explicit confirmation |
| hooks/use-session-detail-modal.ts | 916 | `'End Recurring Series'` | decision | destructive or blocking user decision |
| hooks/use-settings-hub.ts | 19 | `'Sign Out'` | decision | destructive state change requires explicit confirmation |
| hooks/use-unsaved-changes-warning.ts | 10 | `'Discard changes?'` | decision | destructive state change requires explicit confirmation |
| hooks/use-video-detail.ts | 134 | `'Delete Video'` | decision | destructive state change requires explicit confirmation |

# Child health route authority — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Parent `user4` → `/child/user2/medical` | Allowed; editable owned-child medical screen rendered | `parent-owned-medical.png` |
| Athlete `user1` → `/child/user2/medical` | Denied; no medical or consent value or control rendered | `athlete-cross-child-medical-denied.png` |
| Parent `user4` → `/child/user2/emergency` | Allowed; owned-child emergency contacts and controls rendered | `parent-owned-emergency.png` |
| Athlete `user1` → `/child/user2/emergency` | Denied; no contact value or control rendered | `athlete-cross-child-emergency-denied.png` |
| Parent `user4` → `/edit-child-profile?childId=user2` | Allowed; owned-child profile controls rendered | `parent-owned-profile-edit.png` |
| Athlete `user1` → `/edit-child-profile?childId=user2` | Denied; no profile field rendered | `athlete-cross-child-profile-denied.png` |
| Parent `user4` → `/edit-child-sen?childId=user2` | Allowed; owned-child support controls rendered | `parent-owned-support-edit.png` |
| Athlete `user1` → `/edit-child-sen?childId=user2` | Denied; no support control rendered | `athlete-cross-child-support-denied.png` |

Fix: the shared mock child-management decision now reads only the signed-in UI actor’s declared child references. Medical and emergency screens prove that decision before their health service read. Permission denials use a direct non-retry state.

Verification: focused lint; isolated test compile; 10 focused boundary assertions; root typecheck; native iOS screenshots above; React Doctor staged check clean.

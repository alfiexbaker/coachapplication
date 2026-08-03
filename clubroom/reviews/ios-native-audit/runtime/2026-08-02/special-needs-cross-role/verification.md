# Special needs and coach observations cross-role — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent and no observation was created, changed or deleted.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/development/athlete/user2/special-needs` | The route settles to `Needs and notes unavailable`; no player name, medical record, allergy or parent note is shown and no retry is offered. | `athlete-cross-terminal.png` |
| Assigned coach `coach1` → `/development/athlete/user2/special-needs` | The route shows Maisie Barton's authorised needs context, including the existing allergy and parent notes. It exposes one `Add` action for coach observations; it was not invoked. | `assigned-coach-allowed.png` |

The focused authority tests passed 5/5 after an isolated test compile. They assert that development authority is checked before child data is read, denied special-needs states omit retry, authorised observation errors surface correctly and diagnostic logs omit raw observation text.

The initial local role switch displayed a loading skeleton before resolving. A later simulator capture confirmed the route did not remain stuck. This check validates access and presentation, not a performance SLA.

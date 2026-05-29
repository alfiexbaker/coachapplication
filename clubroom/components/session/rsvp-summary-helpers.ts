import type { SessionRsvp } from "@/constants/types";
export function computeRSVPNames(rsvps: SessionRsvp[]) {
  const getName = (r: SessionRsvp) => r.childId || `User ${r.userId.slice(-4)}`;
  return {
    goingNames: rsvps.flatMap((r) =>
      r.status === "going" ? [getName(r)] : [],
    ),
    cantNames: rsvps.flatMap((r) =>
      r.status === "not_going" ? [getName(r)] : [],
    ),
    maybeNames: rsvps.flatMap((r) =>
      r.status === "maybe" ? [getName(r)] : [],
    ),
    pendingNames: rsvps.flatMap((r) =>
      r.status === "pending" ? [getName(r)] : [],
    ),
  };
}

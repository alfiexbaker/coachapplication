type SeedRow = Record<string, unknown>;
export interface ClubScheduleActivity {
  id: string;
  source: "club_event" | "group_session" | "match";
  sourceEntityId: string;
  clubId?: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  status:
    | "draft"
    | "scheduled"
    | "full"
    | "in_progress"
    | "cancelled"
    | "completed";
  kind: "informational" | "training" | "match";
  typeLabel: string;
  participationMode: "none" | "rsvp" | "registration" | "availability";
  participationLabel: string;
  accessScope: "club" | "squad" | "public" | "mixed" | "private";
  accessLabel: string;
  audienceLabel: string;
  locationLabel: string;
  isVirtual: boolean;
  price?: number;
  currency?: string;
  squadId?: string;
  squadIds: string[];
  allowsExternalRegistration: boolean;
  opponent?: string;
  homeAwayLabel?: "Home" | "Away";
  resultLabel?: string;
}
interface GroupSessionScheduleEntry {
  startsAt?: string;
  endsAt?: string;
}
const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;
function formatTypeLabel(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .flatMap((item) =>
      Boolean(item) ? [item.charAt(0).toUpperCase() + item.slice(1)] : [],
    )
    .join(" ");
}
function parseJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function parseGroupScheduleEntries(
  value: unknown,
): GroupSessionScheduleEntry[] {
  return parseJsonArray(value).flatMap((entry) => {
    const mapped =
      typeof entry === "object" && entry
        ? (entry as GroupSessionScheduleEntry)
        : null;
    return mapped !== null ? [mapped] : [];
  });
}
function pickScheduleEntry(
  entries: GroupSessionScheduleEntry[],
  now: Date,
): GroupSessionScheduleEntry | null {
  if (entries.length === 0) {
    return null;
  }
  const sorted = Array.from(entries).toSorted((left, right) => {
    const leftAt = new Date(left.startsAt ?? "").getTime();
    const rightAt = new Date(right.startsAt ?? "").getTime();
    return leftAt - rightAt;
  });
  const upcoming = sorted.find((entry) => {
    const startsAt = new Date(entry.startsAt ?? "").getTime();
    return Number.isFinite(startsAt) && startsAt >= now.getTime();
  });
  return upcoming ?? sorted[sorted.length - 1] ?? null;
}
function mapEventStatus(
  status: string | undefined,
): ClubScheduleActivity["status"] {
  if (status === "DRAFT") return "draft";
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "completed";
  return "scheduled";
}
function mapEventType(
  metadataType: string | undefined,
): ClubScheduleActivity["kind"] {
  if (metadataType === "training_camp" || metadataType === "trial_day") {
    return "training";
  }
  return "informational";
}
function mapEventActivity(event: SeedRow): ClubScheduleActivity | null {
  const eventId = asString(event.id);
  const startsAt = asString(event.startsAt);
  if (!eventId || !startsAt) {
    return null;
  }
  const visibility = asString(event.visibility);
  const audienceLabel = visibility === "squad" ? "Squad only" : "Whole club";
  const metadataJson =
    typeof event.metadataJson === "object" && event.metadataJson
      ? (event.metadataJson as SeedRow)
      : {};
  const metadataType = asString(metadataJson.type);
  const priceMinor = asNumber(event.priceMinor);
  const squadIds = parseJsonArray(event.squadIdsJson).filter(
    (value): value is string => typeof value === "string",
  );
  return {
    id: `club_activity:club_event:${eventId}`,
    source: "club_event",
    sourceEntityId: eventId,
    clubId: asString(event.clubId),
    title: asString(event.title) ?? "Club event",
    description: asString(event.description),
    startsAt,
    endsAt: asString(event.endsAt),
    status: mapEventStatus(asString(event.status)),
    kind: mapEventType(metadataType),
    typeLabel: formatTypeLabel(metadataType, "Event"),
    participationMode: "rsvp",
    participationLabel: "RSVP",
    accessScope:
      squadIds.length > 0
        ? "squad"
        : visibility === "public"
          ? "public"
          : "club",
    accessLabel: audienceLabel,
    audienceLabel,
    locationLabel: asString(event.location) ?? "Club venue",
    isVirtual: false,
    price: typeof priceMinor === "number" ? priceMinor / 100 : undefined,
    currency: asString(event.currency) ?? "GBP",
    squadIds,
    allowsExternalRegistration: visibility === "public",
  };
}
function mapGroupStatus(
  status: string | undefined,
): ClubScheduleActivity["status"] {
  if (status === "DRAFT") return "draft";
  if (status === "FULL") return "full";
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "completed";
  return "scheduled";
}
function getGroupAccessScope(
  session: SeedRow,
): ClubScheduleActivity["accessScope"] {
  const inviteType = asString(session.inviteType)?.toUpperCase();
  const squadId = asString(session.squadId);
  const hasClub = Boolean(asString(session.clubId));
  if (squadId && inviteType === "OPEN") return "mixed";
  if (squadId) return "squad";
  if (hasClub && inviteType === "OPEN") return "mixed";
  if (hasClub) return "club";
  if (inviteType === "OPEN") return "public";
  return "private";
}
function getGroupLabels(
  session: SeedRow,
): Pick<ClubScheduleActivity, "accessLabel" | "audienceLabel"> {
  const accessScope = getGroupAccessScope(session);
  switch (accessScope) {
    case "mixed":
      return {
        accessLabel: asString(session.squadId)
          ? "Squad + outside athletes"
          : "Club + outside athletes",
        audienceLabel: asString(session.squadId)
          ? "Selected squad with open outside registration"
          : "Club session with open outside registration",
      };
    case "squad":
      return {
        accessLabel: "Squad only",
        audienceLabel: "Selected squad",
      };
    case "club":
      return {
        accessLabel: "Club only",
        audienceLabel: "Club members",
      };
    case "public":
      return {
        accessLabel: "Open public",
        audienceLabel: "Anyone browsing sessions",
      };
    case "private":
      return {
        accessLabel: "Invite only",
        audienceLabel: "Invited athletes only",
      };
  }
}
function mapGroupSessionActivity(
  session: SeedRow,
  now: Date,
): ClubScheduleActivity | null {
  const sessionId = asString(session.id);
  if (!sessionId) {
    return null;
  }
  const scheduleEntry = pickScheduleEntry(
    parseGroupScheduleEntries(session.scheduleJson),
    now,
  );
  if (!scheduleEntry?.startsAt) {
    return null;
  }
  const labels = getGroupLabels(session);
  const priceMinor = asNumber(session.pricePerParticipantMinor);
  const isVirtual = asBoolean(session.isVirtual) ?? false;
  const squadId = asString(session.squadId);
  return {
    id: `club_activity:group_session:${sessionId}`,
    source: "group_session",
    sourceEntityId: sessionId,
    clubId: asString(session.clubId),
    title: asString(session.title) ?? "Training session",
    description: asString(session.description),
    startsAt: scheduleEntry.startsAt,
    endsAt: scheduleEntry.endsAt,
    status: mapGroupStatus(asString(session.status)),
    kind: "training",
    typeLabel: formatTypeLabel(asString(session.sessionType), "Training"),
    participationMode: "registration",
    participationLabel:
      (asBoolean(session.waitlistEnabled) ?? false)
        ? "Registration / waitlist"
        : "Registration",
    accessScope: getGroupAccessScope(session),
    accessLabel: labels.accessLabel,
    audienceLabel: labels.audienceLabel,
    locationLabel: isVirtual
      ? "Online"
      : (asString(session.location) ?? "Club training ground"),
    isVirtual,
    price: typeof priceMinor === "number" ? priceMinor / 100 : undefined,
    currency: asString(session.currency) ?? "GBP",
    squadId,
    squadIds: squadId ? [squadId] : [],
    allowsExternalRegistration:
      asString(session.inviteType)?.toUpperCase() === "OPEN",
  };
}
function mapMatchStatus(
  status: string | undefined,
): ClubScheduleActivity["status"] {
  if (status === "COMPLETED") return "completed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "IN_PROGRESS") return "in_progress";
  return "scheduled";
}
function mapMatchActivity(match: SeedRow): ClubScheduleActivity | null {
  const matchId = asString(match.id);
  const startsAt = asString(match.startsAt);
  if (!matchId || !startsAt) {
    return null;
  }
  const squadId = asString(match.squadId);
  const result =
    typeof match.resultJson === "object" && match.resultJson
      ? (match.resultJson as SeedRow)
      : null;
  const home = asNumber(result?.home);
  const away = asNumber(result?.away);
  return {
    id: `club_activity:match:${matchId}`,
    source: "match",
    sourceEntityId: matchId,
    clubId: asString(match.clubId),
    title: asString(match.title) ?? "Match",
    description: asString(match.notes),
    startsAt,
    status: mapMatchStatus(asString(match.status)),
    kind: "match",
    typeLabel: `${formatTypeLabel(asString(match.matchType), "Fixture")} Match`,
    participationMode: "availability",
    participationLabel:
      typeof home === "number" && typeof away === "number"
        ? `Result ${home}-${away}`
        : asString(match.status) === "IN_PROGRESS"
          ? "In progress"
          : "Availability & lineup",
    accessScope: squadId ? "squad" : "club",
    accessLabel: squadId ? "Team" : "Club",
    audienceLabel: squadId
      ? "Selected squad and families"
      : "Club fixture group",
    locationLabel: asString(match.venue) ?? "Match venue",
    isVirtual: false,
    squadId,
    squadIds: squadId ? [squadId] : [],
    allowsExternalRegistration: false,
    opponent: asString(match.opponent),
    homeAwayLabel: asBoolean(match.isHome) === false ? "Away" : "Home",
    resultLabel:
      typeof home === "number" && typeof away === "number"
        ? `${home}-${away}`
        : undefined,
  };
}
export function buildClubScheduleActivities(
  tables: Record<string, unknown>,
  clubId: string,
  now: Date = new Date(),
): ClubScheduleActivity[] {
  const events = asRows(tables.clubEvents).flatMap((row) => {
    if (!(asString(row.clubId) === clubId && asString(row.status) !== "DRAFT"))
      return [];
    const mapped = mapEventActivity(row);
    return mapped !== null ? [mapped] : [];
  });
  const sessions = asRows(tables.groupSessions).flatMap((row) => {
    if (!(asString(row.clubId) === clubId && asString(row.status) !== "DRAFT"))
      return [];
    const mapped = mapGroupSessionActivity(row, now);
    return mapped !== null ? [mapped] : [];
  });
  const matches = asRows(tables.matches).flatMap((row) => {
    if (!(asString(row.clubId) === clubId)) return [];
    const mapped = mapMatchActivity(row);
    return mapped !== null ? [mapped] : [];
  });
  return [...events, ...sessions, ...matches].sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}
export function findClubScheduleActivity(
  tables: Record<string, unknown>,
  clubId: string,
  activityId: string,
  now: Date = new Date(),
): ClubScheduleActivity | null {
  const [prefix, source, sourceEntityId] = activityId.split(":");
  if (prefix !== "club_activity" || !source || !sourceEntityId) {
    return null;
  }
  if (source === "club_event") {
    const event = asRows(tables.clubEvents).find(
      (row) =>
        asString(row.id) === sourceEntityId &&
        asString(row.clubId) === clubId &&
        asString(row.status) !== "DRAFT",
    );
    return event ? mapEventActivity(event) : null;
  }
  if (source === "group_session") {
    const session = asRows(tables.groupSessions).find(
      (row) =>
        asString(row.id) === sourceEntityId &&
        asString(row.clubId) === clubId &&
        asString(row.status) !== "DRAFT",
    );
    return session ? mapGroupSessionActivity(session, now) : null;
  }
  if (source === "match") {
    const match = asRows(tables.matches).find(
      (row) =>
        asString(row.id) === sourceEntityId && asString(row.clubId) === clubId,
    );
    return match ? mapMatchActivity(match) : null;
  }
  return null;
}

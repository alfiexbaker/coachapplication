import type { PrismaClient } from '@clubroom/db';

const bookingMarker = 'Created by apps/api/scripts/staging-smoke.ts';
const groupPrefix = 'Codex smoke group';
const matchPrefix = 'Codex smoke match';
const eventPrefix = 'Codex smoke event';
const skillDefinitionPrefix = 'Codex smoke skill';
const practiceLogNotePrefix = 'Codex smoke practice';
const practiceLogIdempotencyPrefix = 'staging-practice-log-';

export async function cleanupStagingSmokeArtifacts(
  prisma: PrismaClient,
  actorUserId: string,
): Promise<Record<string, number>> {
  const now = new Date();
  const [groups, directBookings, invites, squads, matches, events, payoutMethods, skillDefinitions] =
    await Promise.all([
    prisma.groupSession.findMany({
      where: { title: { startsWith: groupPrefix } },
      select: { id: true },
    }),
    prisma.booking.findMany({
      where: { notes: bookingMarker },
      select: { id: true },
    }),
    prisma.invite.findMany({
      where: { message: bookingMarker },
      select: { id: true, bookingId: true },
    }),
    prisma.squad.findMany({
      where: {
        OR: [{ id: { startsWith: 'sqd_smoke_' } }, { name: { startsWith: 'Staging smoke' } }],
      },
      select: { id: true },
    }),
    prisma.clubMatch.findMany({
      where: { title: { startsWith: matchPrefix } },
      select: { id: true },
    }),
    prisma.clubEvent.findMany({
      where: { title: { startsWith: eventPrefix } },
      select: { id: true },
    }),
    prisma.coachPayoutMethod.findMany({
      where: {
        coachUserId: actorUserId,
        nickname: { startsWith: 'Smoke payout' },
        bankName: 'Smoke Bank',
        provider: 'simulated',
      },
      select: { id: true },
    }),
    prisma.skillDefinition.findMany({
      where: { name: { startsWith: skillDefinitionPrefix } },
      select: { id: true },
    }),
  ]);

  const groupIds = groups.map(({ id }) => id);
  const groupBookings =
    groupIds.length > 0
      ? await prisma.booking.findMany({
          where: { groupSessionId: { in: groupIds } },
          select: { id: true },
        })
      : [];
  const bookingIds = [
    ...new Set([
      ...directBookings.map(({ id }) => id),
      ...groupBookings.map(({ id }) => id),
      ...invites.flatMap(({ bookingId }) => (bookingId ? [bookingId] : [])),
    ]),
  ];
  const inviteIds = invites.map(({ id }) => id);
  const squadIds = squads.map(({ id }) => id);
  const matchIds = matches.map(({ id }) => id);
  const eventIds = events.map(({ id }) => id);
  const payoutMethodIds = payoutMethods.map(({ id }) => id);
  const skillDefinitionIds = skillDefinitions.map(({ id }) => id);

  return prisma.$transaction(async (tx) => {
    const practiceLogs = await tx.practiceLog.deleteMany({
      where: { note: { startsWith: practiceLogNotePrefix } },
    });
    const practiceLogIdempotencyKeys = await tx.idempotencyKey.deleteMany({
      where: {
        endpointKey: { contains: '/practice-logs' },
        idempotencyKey: { startsWith: practiceLogIdempotencyPrefix },
      },
    });
    const skillAssessments =
      skillDefinitionIds.length > 0
        ? await tx.athleteSkillAssessment.deleteMany({
            where: { skillDefinitionId: { in: skillDefinitionIds } },
          })
        : { count: 0 };
    const skillDefinitionsRemoved =
      skillDefinitionIds.length > 0
        ? await tx.skillDefinition.deleteMany({ where: { id: { in: skillDefinitionIds } } })
        : { count: 0 };
    const withdrawals =
      payoutMethodIds.length > 0
        ? await tx.coachWithdrawal.deleteMany({
            where: { payoutMethodId: { in: payoutMethodIds } },
          })
        : { count: 0 };
    const payoutMethodsRemoved =
      payoutMethodIds.length > 0
        ? await tx.coachPayoutMethod.deleteMany({
            where: { id: { in: payoutMethodIds } },
          })
        : { count: 0 };
    const inviteTargets =
      inviteIds.length > 0
        ? await tx.inviteTarget.deleteMany({ where: { inviteId: { in: inviteIds } } })
        : { count: 0 };
    const invitesRemoved =
      inviteIds.length > 0
        ? await tx.invite.deleteMany({ where: { id: { in: inviteIds } } })
        : { count: 0 };

    const results = await Promise.all([
      bookingIds.length > 0
        ? tx.invoice.updateMany({
            where: { bookingId: { in: bookingIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      bookingIds.length > 0
        ? tx.sessionNote.updateMany({
            where: { bookingId: { in: bookingIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      bookingIds.length > 0
        ? tx.sessionFeedback.updateMany({
            where: { bookingId: { in: bookingIds }, deletedAt: null },
            data: { deletedAt: now },
          })
        : Promise.resolve({ count: 0 }),
      bookingIds.length > 0
        ? tx.headCoachTask.updateMany({
            where: { bookingId: { in: bookingIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      bookingIds.length > 0
        ? tx.booking.updateMany({
            where: { id: { in: bookingIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      groupIds.length > 0
        ? tx.groupSessionRegistration.updateMany({
            where: { groupSessionId: { in: groupIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      groupIds.length > 0
        ? tx.messageThread.updateMany({
            where: { groupSessionId: { in: groupIds }, deletedAt: null },
            data: { deletedAt: now, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      groupIds.length > 0
        ? tx.groupSession.updateMany({
            where: { id: { in: groupIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      squadIds.length > 0
        ? tx.squadMembership.updateMany({
            where: { squadId: { in: squadIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      squadIds.length > 0
        ? tx.squad.updateMany({
            where: { id: { in: squadIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      matchIds.length > 0
        ? tx.clubMatch.updateMany({
            where: { id: { in: matchIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
      eventIds.length > 0
        ? tx.clubEvent.updateMany({
            where: { id: { in: eventIds }, deletedAt: null },
            data: { deletedAt: now, deletedByUserId: actorUserId, updatedByUserId: actorUserId },
          })
        : Promise.resolve({ count: 0 }),
    ]);

    const [
      invoices,
      sessionNotes,
      sessionFeedback,
      headCoachTasks,
      bookings,
      registrations,
      messageThreads,
      groupSessions,
      squadMemberships,
      squadsRemoved,
      matchesRemoved,
      eventsRemoved,
    ] = results;

    return {
      invoices: invoices.count,
      sessionNotes: sessionNotes.count,
      sessionFeedback: sessionFeedback.count,
      headCoachTasks: headCoachTasks.count,
      bookings: bookings.count,
      registrations: registrations.count,
      messageThreads: messageThreads.count,
      groupSessions: groupSessions.count,
      inviteTargets: inviteTargets.count,
      invites: invitesRemoved.count,
      squadMemberships: squadMemberships.count,
      squads: squadsRemoved.count,
      matches: matchesRemoved.count,
      events: eventsRemoved.count,
      withdrawals: withdrawals.count,
      payoutMethods: payoutMethodsRemoved.count,
      skillAssessments: skillAssessments.count,
      skillDefinitions: skillDefinitionsRemoved.count,
      practiceLogs: practiceLogs.count,
      practiceLogIdempotencyKeys: practiceLogIdempotencyKeys.count,
    };
  });
}

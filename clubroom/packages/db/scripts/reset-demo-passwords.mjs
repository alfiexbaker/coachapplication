import crypto from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const DEMO_EMAIL_SUFFIX = '@clubroom.demo';
const REQUIRED_CONFIRMATION = '1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const CREDENTIALS_OUTPUT_PATH = path.join(
  REPO_ROOT,
  'docs/backend-api/test-data/TEST_ACCOUNTS.staging.local.txt',
);
const DEFAULT_DATABASE_CONNECTION_LIMIT = '1';

function configureDatabaseUrl() {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    return;
  }

  try {
    const databaseUrl = new URL(rawDatabaseUrl);
    if (!databaseUrl.searchParams.has('connection_limit')) {
      databaseUrl.searchParams.set(
        'connection_limit',
        process.env.DEMO_PASSWORD_RESET_DATABASE_CONNECTION_LIMIT ??
          DEFAULT_DATABASE_CONNECTION_LIMIT,
      );
    }
    if (!databaseUrl.searchParams.has('pool_timeout')) {
      databaseUrl.searchParams.set('pool_timeout', '30');
    }
    process.env.DATABASE_URL = databaseUrl.toString();
  } catch {
    // Prisma will report invalid DATABASE_URL values.
  }
}

configureDatabaseUrl();

const prisma = new PrismaClient();

function randomHex(size = 16) {
  return crypto.randomBytes(size).toString('hex');
}

function hashPassword(password) {
  const salt = randomHex(16);
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function passwordForRoles(roles) {
  if (roles.includes('club_admin') || roles.includes('security_admin')) {
    return 'admin';
  }
  if (roles.includes('coach')) {
    return 'coach';
  }
  return 'user';
}

function assertConfirmed() {
  if (process.env.CLUBROOM_DEMO_PASSWORD_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error('Refusing to reset demo passwords without CLUBROOM_DEMO_PASSWORD_RESET=1');
  }
}

function isSaltedScryptHash(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const [scheme, salt, derived] = value.split('$');
  return scheme === 'scrypt' && /^[a-f0-9]{32}$/.test(salt) && /^[a-f0-9]{128}$/.test(derived);
}

function summarizeAttachments(user) {
  const parts = [];
  if (user.coachProfile && user.coachProfile.deletedAt == null) {
    parts.push('coachProfile=yes');
  }
  if (user.linkedAthleteAccount && user.linkedAthleteAccount.deletedAt == null) {
    parts.push(`athlete=${user.linkedAthleteAccount.id}`);
  }
  if (user.clubMemberships.length > 0) {
    parts.push(
      `clubs=${user.clubMemberships
        .map((row) => `${row.clubId}:${row.role}`)
        .sort()
        .join(',')}`,
    );
  }
  if (user.familyMemberships.length > 0) {
    parts.push(
      `families=${user.familyMemberships
        .map((row) => row.familyId)
        .sort()
        .join(',')}`,
    );
  }
  if (user.guardianChildLinks.length > 0) {
    parts.push(
      `children=${user.guardianChildLinks
        .map((row) => row.athleteId)
        .sort()
        .join(',')}`,
    );
  }
  return parts.length > 0 ? parts.join('; ') : 'none';
}

function writeCredentialFile(users, verified) {
  const lines = [
    '# Clubroom staging test accounts',
    `# Generated at: ${new Date().toISOString()}`,
    '# Source: staging database @clubroom.demo users',
    '# Scope: staging/demo only. Do not use these credentials for production users.',
    '# Security: PasswordCredential.passwordHash has been reset and verified as salted scrypt.',
    '',
    'Password rules:',
    '- club_admin/security_admin: admin',
    '- coach: coach',
    '- all other seeded users: user',
    '',
    'DB verification:',
    `- demoUsers: ${users.length}`,
    `- saltedScryptCredentials: ${verified.saltedScryptCredentials}`,
    `- attachedCoaches: ${verified.attachedCoaches}`,
    '',
  ];

  for (const user of [...users].sort((a, b) => String(a.email).localeCompare(String(b.email)))) {
    const roles = user.roles.map((row) => row.role).sort();
    lines.push(`Email: ${user.email}`);
    lines.push(`Password: ${passwordForRoles(roles)}`);
    lines.push(`Name: ${user.name ?? '(none)'}`);
    lines.push(`Roles: ${roles.length > 0 ? roles.join(', ') : '(none)'}`);
    lines.push(`Attached: ${summarizeAttachments(user)}`);
    lines.push('');
  }

  mkdirSync(path.dirname(CREDENTIALS_OUTPUT_PATH), { recursive: true });
  writeFileSync(CREDENTIALS_OUTPUT_PATH, lines.join('\n'), { encoding: 'utf8', mode: 0o600 });
  chmodSync(CREDENTIALS_OUTPUT_PATH, 0o600);
}

async function main() {
  assertConfirmed();

  const users = await prisma.user.findMany({
    where: {
      email: {
        endsWith: DEMO_EMAIL_SUFFIX,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      roles: {
        where: {
          active: true,
          revokedAt: null,
        },
        select: {
          role: true,
        },
      },
      coachProfile: {
        select: {
          deletedAt: true,
        },
      },
      linkedAthleteAccount: {
        select: {
          id: true,
          deletedAt: true,
        },
      },
      clubMemberships: {
        where: {
          active: true,
          deletedAt: null,
        },
        select: {
          clubId: true,
          role: true,
        },
      },
      familyMemberships: {
        select: {
          familyId: true,
        },
      },
      guardianChildLinks: {
        where: {
          deletedAt: null,
        },
        select: {
          athleteId: true,
        },
      },
    },
  });

  if (users.length === 0) {
    throw new Error(`No ${DEMO_EMAIL_SUFFIX} users found to update`);
  }

  const passwordBuckets = new Map();
  const coachUserIds = [];
  for (const user of users) {
    const roles = user.roles.map((row) => row.role);
    if (roles.includes('coach')) {
      coachUserIds.push(user.id);
    }
    const password = passwordForRoles(roles);
    await prisma.passwordCredential.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
        passwordHash: hashPassword(password),
      },
      update: {
        passwordHash: hashPassword(password),
      },
    });
    passwordBuckets.set(password, (passwordBuckets.get(password) ?? 0) + 1);
  }

  const credentials = await prisma.passwordCredential.findMany({
    where: {
      userId: {
        in: users.map((user) => user.id),
      },
    },
    select: {
      userId: true,
      passwordHash: true,
    },
  });
  const invalidCredential = credentials.find(
    (credential) => !isSaltedScryptHash(credential.passwordHash),
  );
  if (invalidCredential || credentials.length !== users.length) {
    throw new Error(
      'Demo password reset verification failed: expected salted scrypt hashes for every demo user',
    );
  }

  const attachedCoachCount =
    coachUserIds.length === 0
      ? 0
      : await prisma.coachProfile.count({
          where: {
            userId: {
              in: coachUserIds,
            },
            deletedAt: null,
            user: {
              clubMemberships: {
                some: {
                  active: true,
                  deletedAt: null,
                },
              },
            },
          },
        });
  if (attachedCoachCount === 0) {
    throw new Error(
      'Demo password reset verification failed: expected at least one coach with profile and active club membership',
    );
  }

  const verified = {
    saltedScryptCredentials: credentials.length,
    attachedCoaches: attachedCoachCount,
  };
  writeCredentialFile(users, verified);

  console.log(
    JSON.stringify(
      {
        updatedUsers: users.length,
        emailSuffix: DEMO_EMAIL_SUFFIX,
        passwordBuckets: Object.fromEntries(passwordBuckets.entries()),
        verified,
        credentialsFile: path.relative(REPO_ROOT, CREDENTIALS_OUTPUT_PATH),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

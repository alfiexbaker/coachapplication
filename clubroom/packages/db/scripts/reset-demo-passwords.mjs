import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const DEMO_EMAIL_SUFFIX = '@clubroom.demo';
const REQUIRED_CONFIRMATION = '1';

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
      roles: {
        where: {
          active: true,
          revokedAt: null,
        },
        select: {
          role: true,
        },
      },
    },
  });

  if (users.length === 0) {
    throw new Error(`No ${DEMO_EMAIL_SUFFIX} users found to update`);
  }

  const passwordBuckets = new Map();
  for (const user of users) {
    const roles = user.roles.map((row) => row.role);
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

  console.log(
    JSON.stringify(
      {
        updatedUsers: users.length,
        emailSuffix: DEMO_EMAIL_SUFFIX,
        passwordBuckets: Object.fromEntries(passwordBuckets.entries()),
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

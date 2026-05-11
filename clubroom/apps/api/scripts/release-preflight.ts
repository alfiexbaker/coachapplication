import { env } from '@clubroom/config';
import { getReleaseGuardrailIssues } from '../src/lib/ops-runtime.js';

async function main() {
  const issues = await getReleaseGuardrailIssues(env);

  if (issues.length === 0) {
    console.log('Release preflight passed.');
    return;
  }

  const blocking = issues.filter((issue) => issue.status === 'down');
  const degraded = issues.filter((issue) => issue.status === 'degraded');

  if (blocking.length > 0) {
    console.error('Release preflight failed:');
    for (const issue of blocking) {
      console.error(`- [${issue.check}] ${issue.code}: ${issue.message}`);
      if (issue.action) {
        console.error(`  Action: ${issue.action}`);
      }
    }
  }

  if (degraded.length > 0) {
    const stream = blocking.length > 0 ? console.error : console.warn;
    stream('Release preflight warnings:');
    for (const issue of degraded) {
      stream(`- [${issue.check}] ${issue.code}: ${issue.message}`);
      if (issue.action) {
        stream(`  Action: ${issue.action}`);
      }
    }
  }

  if (blocking.length > 0) {
    process.exit(1);
  }
}

void main().finally(async () => {
  const prisma = globalThis.__clubroomPrisma;
  if (prisma) {
    await prisma.$disconnect();
  }
});

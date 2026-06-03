#!/usr/bin/env node
/* eslint-disable no-console */

const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATASET_PATH = path.join(ROOT, 'docs/backend-api/test-data/marketplace/linked-dataset.json');
const DEFAULT_OUTPUT_PATH = path.join(ROOT, 'docs/backend-api/test-data/TEST_ACCOUNTS.local.txt');

function getOutputPath(argv) {
  const outputArg = argv.find((arg) => arg.startsWith('--out='));
  if (!outputArg) {
    return DEFAULT_OUTPUT_PATH;
  }
  const rawPath = outputArg.slice('--out='.length);
  return path.isAbsolute(rawPath) ? rawPath : path.join(ROOT, rawPath);
}

function asRows(value) {
  return Array.isArray(value) ? value : [];
}

function activeRoles(tables, userId) {
  return asRows(tables.userRoleMemberships)
    .filter((row) => row.userId === userId && row.active !== false && row.revokedAt == null)
    .map((row) => String(row.role))
    .sort();
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

function summarizeAttachments(tables, userId) {
  const athlete = asRows(tables.athletes).find((row) => row.userId === userId);
  const clubMemberships = asRows(tables.clubMemberships).filter(
    (row) => row.userId === userId && row.active !== false && row.deletedAt == null,
  );
  const familyMemberships = asRows(tables.familyMemberships).filter((row) => row.userId === userId);
  const guardianLinks = asRows(tables.guardianChildLinks).filter(
    (row) => row.guardianUserId === userId,
  );
  const coachProfile = asRows(tables.coachProfiles).find((row) => row.userId === userId);

  const parts = [];
  if (coachProfile) {
    parts.push('coachProfile=yes');
  }
  if (athlete) {
    parts.push(`athlete=${athlete.id}`);
  }
  if (clubMemberships.length > 0) {
    parts.push(
      `clubs=${clubMemberships
        .map((row) => `${row.clubId}:${row.role}`)
        .sort()
        .join(',')}`,
    );
  }
  if (familyMemberships.length > 0) {
    parts.push(
      `families=${familyMemberships
        .map((row) => row.familyId)
        .sort()
        .join(',')}`,
    );
  }
  if (guardianLinks.length > 0) {
    parts.push(
      `children=${guardianLinks
        .map((row) => row.athleteId)
        .sort()
        .join(',')}`,
    );
  }

  return parts.length > 0 ? parts.join('; ') : 'none';
}

function buildCredentialFile() {
  const dataset = JSON.parse(readFileSync(DATASET_PATH, 'utf8'));
  const tables = dataset.tables ?? {};
  const users = asRows(tables.users)
    .filter((user) => typeof user.email === 'string' && user.email.length > 0)
    .sort((a, b) => String(a.email).localeCompare(String(b.email)));

  const lines = [
    '# Clubroom local test accounts',
    `# Generated at: ${new Date().toISOString()}`,
    '# Source: docs/backend-api/test-data/marketplace/linked-dataset.json',
    '# Scope: local/staging/demo only. Do not use these credentials for production users.',
    '# Security: the db importer stores PasswordCredential.passwordHash as salted scrypt hashes;',
    '# this ignored file lists only the demo plaintext passwords needed for manual API-mode testing.',
    '',
    'Password rules:',
    '- club_admin/security_admin: admin',
    '- coach: coach',
    '- all other seeded users: user',
    '',
  ];

  for (const user of users) {
    const roles = activeRoles(tables, user.id);
    lines.push(`Email: ${user.email}`);
    lines.push(`Password: ${passwordForRoles(roles)}`);
    lines.push(`Name: ${user.name ?? '(none)'}`);
    lines.push(`Roles: ${roles.length > 0 ? roles.join(', ') : '(none)'}`);
    lines.push(`Attached: ${summarizeAttachments(tables, user.id)}`);
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const outputPath = getOutputPath(process.argv.slice(2));
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buildCredentialFile(), 'utf8');
  console.log(`Wrote ${path.relative(ROOT, outputPath)}`);
}

main();

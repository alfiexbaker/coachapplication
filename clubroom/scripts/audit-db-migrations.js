#!/usr/bin/env node
/* eslint-disable no-console */

const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'packages/db/prisma/migrations');
const BLANKET_RLS_MARKER = 'clubroom:enable-rls-for-all-public-tables';

function stripSqlComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

function collectMatches(source, regex) {
  const matches = [];
  regex.lastIndex = 0;
  let match = regex.exec(source);
  while (match) {
    matches.push(match[1]);
    match = regex.exec(source);
  }
  return matches;
}

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(MIGRATIONS_DIR, entry.name, 'migration.sql'))
    .sort();
}

function readMigrations() {
  return listMigrationFiles().map((file, index) => {
    const rawSql = readFileSync(file, 'utf8');
    const sql = stripSqlComments(rawSql);
    return {
      file: path.relative(ROOT, file),
      index,
      hasBlanketRls: rawSql.includes(BLANKET_RLS_MARKER),
      createdTables: collectMatches(
        sql,
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:"public"|public)\.)?"([^"]+)"/gi,
      ),
      rlsTables: collectMatches(
        sql,
        /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(?:"public"|public)\.)?"([^"]+)"\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi,
      ),
      directRoleGrants: collectMatches(
        sql,
        /\b(GRANT\b[\s\S]*?\bTO\s+(?:"?anon"?|"?authenticated"?|PUBLIC)(?:\s|;))/gi,
      ),
      publicSecurityDefinerFunctions: collectMatches(
        sql,
        /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+((?:(?:"public"|public)\.)?"?[\w]+"?)\s*\([^)]*\)[\s\S]*?\bSECURITY\s+DEFINER\b/gi,
      ),
    };
  });
}

function main() {
  const migrations = readMigrations();
  const lastBlanketRlsIndex = migrations.reduce(
    (latest, migration) => (migration.hasBlanketRls ? migration.index : latest),
    -1,
  );
  const rlsEnabledAtOrAfter = new Map();

  for (const migration of migrations) {
    for (const table of migration.rlsTables) {
      if (!rlsEnabledAtOrAfter.has(table)) {
        rlsEnabledAtOrAfter.set(table, []);
      }
      rlsEnabledAtOrAfter.get(table).push(migration.index);
    }
  }

  const missingRls = [];
  const directRoleGrants = [];
  const publicSecurityDefinerFunctions = [];
  let createdTableCount = 0;

  for (const migration of migrations) {
    for (const grant of migration.directRoleGrants) {
      directRoleGrants.push({ file: migration.file, grant: grant.trim().replace(/\s+/g, ' ') });
    }
    for (const fn of migration.publicSecurityDefinerFunctions) {
      publicSecurityDefinerFunctions.push({ file: migration.file, functionName: fn });
    }

    for (const table of migration.createdTables) {
      createdTableCount += 1;
      const coveredByBlanket = migration.index <= lastBlanketRlsIndex;
      const coveredByExplicitRls = (rlsEnabledAtOrAfter.get(table) ?? []).some(
        (rlsIndex) => rlsIndex >= migration.index,
      );
      if (!coveredByBlanket && !coveredByExplicitRls) {
        missingRls.push({ file: migration.file, table });
      }
    }
  }

  console.log('DB migration audit');
  console.log(`migrations: ${migrations.length}`);
  console.log(`createdTables: ${createdTableCount}`);
  console.log(`blanketRlsMigration: ${lastBlanketRlsIndex >= 0 ? migrations[lastBlanketRlsIndex].file : 'missing'}`);
  console.log(`missingRls: ${missingRls.length}`);
  console.log(`directAnonAuthenticatedPublicGrants: ${directRoleGrants.length}`);
  console.log(`publicSecurityDefinerFunctions: ${publicSecurityDefinerFunctions.length}`);

  if (missingRls.length > 0) {
    for (const finding of missingRls) {
      console.log(`- ${finding.file}: table ${finding.table} is created after the blanket RLS migration without RLS`);
    }
  }

  if (directRoleGrants.length > 0) {
    for (const finding of directRoleGrants) {
      console.log(`- ${finding.file}: ${finding.grant}`);
    }
  }

  if (publicSecurityDefinerFunctions.length > 0) {
    for (const finding of publicSecurityDefinerFunctions) {
      console.log(`- ${finding.file}: security-definer function ${finding.functionName} is in public`);
    }
  }

  if (
    missingRls.length > 0 ||
    directRoleGrants.length > 0 ||
    publicSecurityDefinerFunctions.length > 0 ||
    lastBlanketRlsIndex < 0
  ) {
    process.exit(1);
  }
}

main();

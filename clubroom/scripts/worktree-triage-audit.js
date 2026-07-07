#!/usr/bin/env node
/* eslint-disable no-console */

const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { listFiles } = require('./file-scan-utils');

const ROOT = path.resolve(__dirname, '..');
const REVIEWS_DIR = path.join(ROOT, 'reviews');

const BUCKETS = [
  'tracked-review',
  'product-source-review',
  'api-source-review',
  'test-review',
  'docs-config-review',
  'asset-review',
  'generated-local',
  'unknown-review',
];
const BLOCKING_BUCKETS = BUCKETS.filter((bucket) => bucket !== 'generated-local');
const SOURCE_COVERAGE_GROUPS = [
  {
    id: 'app-routes',
    label: 'Expo routes',
    targets: ['app'],
    extensions: ['.ts', '.tsx'],
  },
  {
    id: 'product-components',
    label: 'Product components',
    targets: ['components'],
    extensions: ['.ts', '.tsx'],
  },
  {
    id: 'product-hooks',
    label: 'Product hooks',
    targets: ['hooks'],
    extensions: ['.ts', '.tsx'],
  },
  {
    id: 'product-services',
    label: 'Product services',
    targets: ['services'],
    extensions: ['.ts', '.tsx'],
  },
  {
    id: 'product-support',
    label: 'Product support source',
    targets: ['constants', 'context', 'contracts', 'navigation', 'types', 'utils'],
    extensions: ['.ts', '.tsx'],
  },
  {
    id: 'api-source',
    label: 'API and shared backend source',
    targets: ['apps/api/src', 'apps/api/scripts', 'packages/config', 'packages/db', 'packages/shared-contracts'],
    extensions: ['.ts', '.tsx', '.prisma'],
  },
  {
    id: 'tests',
    label: 'Tests',
    targets: ['__tests__', 'apps/api/src'],
    extensions: ['.ts', '.tsx', '.json'],
    include: /(^__tests__\/|\.test\.tsx?$)/,
  },
];

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    markdown: argv.includes('--markdown'),
    write: argv.includes('--write'),
    strict: argv.includes('--strict'),
    verbose: argv.includes('--verbose'),
  };
}

function runGitStatus() {
  const result = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: ROOT,
    encoding: 'buffer',
    maxBuffer: 80 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`${result.stderr.toString('utf8') || result.stdout.toString('utf8')}`.trim());
  }

  return result.stdout.toString('utf8');
}

function runGitLsFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'buffer',
    maxBuffer: 80 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`${result.stderr.toString('utf8') || result.stdout.toString('utf8')}`.trim());
  }

  return new Set(result.stdout.toString('utf8').split('\0').filter(Boolean));
}

function parseStatus(raw) {
  const tokens = raw.split('\0').filter(Boolean);
  const entries = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const status = token.slice(0, 2);
    const file = token.slice(3);

    if (status.startsWith('R') || status.startsWith('C')) {
      const target = tokens[index + 1];
      entries.push({ status, file: target, previousFile: file });
      index += 1;
      continue;
    }

    entries.push({ status, file });
  }

  return entries;
}

function extensionFor(file) {
  return path.extname(file).toLowerCase();
}

function classify(entry) {
  const file = entry.file;
  const extension = extensionFor(file);

  if (entry.status !== '??') {
    return {
      bucket: 'tracked-review',
      action: 'isolate before committing; stage only if it belongs to the current slice',
    };
  }

  if (
    file.endsWith('.DS_Store') ||
    file.startsWith('.tmp') ||
    file.includes('/.tmp') ||
    file.startsWith('dist/') ||
    file.startsWith('coverage/') ||
    file.startsWith('.expo/') ||
    file.startsWith('memory/') ||
    /^reviews\/(launch-readiness|worktree-triage)-.+\.(json|md)$/.test(file) ||
    /^reviews\/worktree-triage\.(json|md)$/.test(file) ||
    /\.(log|tmp|temp|bak|swp)$/i.test(file)
  ) {
    return {
      bucket: 'generated-local',
      action: 'ignore or delete after confirming no runtime dependency',
    };
  }

  if (
    file.startsWith('app/') ||
    file.startsWith('components/') ||
    file.startsWith('hooks/') ||
    file.startsWith('services/') ||
    file.startsWith('constants/') ||
    file.startsWith('context/') ||
    file.startsWith('contracts/') ||
    file.startsWith('navigation/') ||
    file.startsWith('types/') ||
    file.startsWith('utils/')
  ) {
    return {
      bucket: 'product-source-review',
      action: 'review, validate, then commit or intentionally delete as product surface',
    };
  }

  if (
    file.startsWith('apps/api/src/') ||
    file.startsWith('apps/api/scripts/') ||
    file.startsWith('packages/db/') ||
    file.startsWith('packages/shared-contracts/') ||
    file.startsWith('packages/config/')
  ) {
    return {
      bucket: 'api-source-review',
      action: 'review with backend/API ownership and validation before commit',
    };
  }

  if (file.startsWith('__tests__/') || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
    return {
      bucket: 'test-review',
      action: 'keep only if it compiles and protects current runtime truth',
    };
  }

  if (
    file.startsWith('docs/') ||
    file === 'package.json' ||
    file === 'package-lock.json' ||
    file === 'pnpm-lock.yaml' ||
    file === 'pnpm-workspace.yaml' ||
    file === 'eas.json' ||
    file === 'metro.config.js' ||
    file === 'eslint.config.js' ||
    /^tsconfig.*\.json$/.test(file) ||
    file.endsWith('/tsconfig.json') ||
    file.startsWith('patches/') ||
    file.startsWith('scripts/')
  ) {
    return {
      bucket: 'docs-config-review',
      action: 'commit only when it updates canonical docs, scripts, config, or generated contracts',
    };
  }

  if (
    file.startsWith('assets/') ||
    ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.mp4', '.mov', '.ttf', '.otf'].includes(
      extension,
    )
  ) {
    return {
      bucket: 'asset-review',
      action: 'keep only if referenced by product code or launch UI',
    };
  }

  return {
    bucket: 'unknown-review',
    action: 'inspect manually before committing or deleting',
  };
}

function summarize(entries) {
  const buckets = Object.fromEntries(BUCKETS.map((bucket) => [bucket, []]));
  const byTopLevel = {};

  for (const entry of entries) {
    const classification = classify(entry);
    const item = { ...entry, ...classification };
    buckets[item.bucket].push(item);
    const topLevel = item.file.split('/')[0] || item.file;
    byTopLevel[topLevel] = (byTopLevel[topLevel] ?? 0) + 1;
  }

  return {
    total: entries.length,
    blockingTotal: BLOCKING_BUCKETS.reduce((sum, bucket) => sum + buckets[bucket].length, 0),
    byBucket: Object.fromEntries(BUCKETS.map((bucket) => [bucket, buckets[bucket].length])),
    byTopLevel: Object.fromEntries(
      Object.entries(byTopLevel).sort((left, right) => right[1] - left[1]),
    ),
    buckets,
  };
}

function fileMatchesPrefix(file, targets) {
  return targets.some((target) => file === target || file.startsWith(`${target}/`));
}

function buildSourceCoverage(entries, trackedFiles) {
  const statusByFile = new Map(entries.map((entry) => [entry.file, entry]));

  return SOURCE_COVERAGE_GROUPS.map((group) => {
    const files = listFiles(group.targets, { extensions: group.extensions }).filter((file) =>
      group.include ? group.include.test(file) : true,
    );
    const tracked = files.filter((file) => trackedFiles.has(file));
    const untracked = files.filter((file) => !trackedFiles.has(file));
    const modified = entries.filter(
      (entry) =>
        entry.status !== '??' &&
        fileMatchesPrefix(entry.file, group.targets) &&
        (group.include ? group.include.test(entry.file) : true),
    );
    const dirtyUntracked = untracked.filter((file) => statusByFile.get(file)?.status === '??');

    return {
      id: group.id,
      label: group.label,
      total: files.length,
      tracked: tracked.length,
      untracked: untracked.length,
      dirtyUntracked: dirtyUntracked.length,
      modified: modified.length,
      trackedPercent: files.length === 0 ? 100 : Math.round((tracked.length / files.length) * 100),
      sampleUntracked: dirtyUntracked.slice(0, 25),
      sampleModified: modified.slice(0, 25).map((entry) => entry.file),
    };
  });
}

function buildLaunchBlockers(summary, sourceCoverage) {
  const blockers = [];
  if (summary.blockingTotal > 0) {
    blockers.push({
      id: 'dirty-review-files',
      count: summary.blockingTotal,
      message: `${summary.blockingTotal} tracked or untracked review files must be committed, deleted, or explicitly ignored before launch readiness can be trusted.`,
    });
  }

  for (const group of sourceCoverage) {
    if (group.untracked > 0) {
      blockers.push({
        id: `${group.id}-untracked`,
        count: group.untracked,
        message: `${group.label} has ${group.untracked} untracked file(s); validation may be exercising source that would not ship from git.`,
      });
    }
    if (group.modified > 0) {
      blockers.push({
        id: `${group.id}-modified`,
        count: group.modified,
        message: `${group.label} has ${group.modified} tracked modified file(s) requiring slice ownership before launch.`,
      });
    }
  }

  return blockers;
}

function buildReport() {
  const entries = parseStatus(runGitStatus());
  const trackedFiles = runGitLsFiles();
  const summary = summarize(entries);
  const sourceCoverage = buildSourceCoverage(entries, trackedFiles);
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: summary.total,
      blockingTotal: summary.blockingTotal,
      byBucket: summary.byBucket,
      byTopLevel: summary.byTopLevel,
    },
    sourceCoverage,
    launchBlockers: buildLaunchBlockers(summary, sourceCoverage),
    buckets: summary.buckets,
  };
}

function formatItem(item) {
  const status = item.previousFile
    ? `${item.status} ${item.previousFile} -> ${item.file}`
    : `${item.status} ${item.file}`;
  return `- ${status} - ${item.action}`;
}

function toMarkdown(report, options = {}) {
  const lines = [];
  lines.push('# Worktree Triage Audit');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Files: ${report.summary.total}`);
  lines.push(`Blocking files: ${report.summary.blockingTotal}`);
  lines.push('');
  lines.push('## Launch Blockers');
  lines.push('');

  if (report.launchBlockers.length === 0) {
    lines.push('- None.');
  } else {
    for (const blocker of report.launchBlockers) {
      lines.push(`- ${blocker.id}: ${blocker.message}`);
    }
  }

  lines.push('');
  lines.push('## Source Coverage');
  lines.push('');
  lines.push('| Area | Tracked | Untracked | Modified |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const group of report.sourceCoverage) {
    lines.push(
      `| ${group.label} | ${group.tracked}/${group.total} (${group.trackedPercent}%) | ${group.untracked} | ${group.modified} |`,
    );
  }

  lines.push('');
  lines.push('## Source Coverage Samples');
  lines.push('');
  for (const group of report.sourceCoverage) {
    if (group.sampleUntracked.length === 0 && group.sampleModified.length === 0) {
      continue;
    }
    lines.push(`### ${group.label}`);
    lines.push('');
    if (group.sampleModified.length > 0) {
      lines.push('Modified tracked files:');
      for (const file of group.sampleModified) {
        lines.push(`- ${file}`);
      }
      lines.push('');
    }
    if (group.sampleUntracked.length > 0) {
      lines.push('Untracked files:');
      for (const file of group.sampleUntracked) {
        lines.push(`- ${file}`);
      }
      if (group.untracked > group.sampleUntracked.length) {
        lines.push(`- ... ${group.untracked - group.sampleUntracked.length} more.`);
      }
      lines.push('');
    }
  }
  lines.push('');
  lines.push('## Buckets');
  lines.push('');

  for (const bucket of BUCKETS) {
    lines.push(`- ${bucket}: ${report.summary.byBucket[bucket]}`);
  }

  lines.push('');
  lines.push('## Top-Level Paths');
  lines.push('');

  for (const [name, count] of Object.entries(report.summary.byTopLevel).slice(0, 20)) {
    lines.push(`- ${name}: ${count}`);
  }

  lines.push('');
  lines.push('## Review Queue');
  lines.push('');

  for (const bucket of BUCKETS) {
    const items = report.buckets[bucket];
    lines.push(`### ${bucket}`);
    lines.push('');

    if (items.length === 0) {
      lines.push('- None.');
      lines.push('');
      continue;
    }

    const visibleItems = options.verbose ? items : items.slice(0, 25);
    for (const item of visibleItems) {
      lines.push(formatItem(item));
    }

    if (!options.verbose && items.length > visibleItems.length) {
      lines.push(
        `- ... ${items.length - visibleItems.length} more. Run with --verbose for full output.`,
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function printText(report) {
  console.log('Worktree triage audit');
  console.log(`- files: ${report.summary.total}`);
  console.log(`- blockingFiles: ${report.summary.blockingTotal}`);
  for (const bucket of BUCKETS) {
    console.log(`- ${bucket}: ${report.summary.byBucket[bucket]}`);
  }
  console.log('');
  console.log('Source coverage:');
  for (const group of report.sourceCoverage) {
    console.log(
      `- ${group.id}: tracked ${group.tracked}/${group.total} (${group.trackedPercent}%), untracked ${group.untracked}, modified ${group.modified}`,
    );
  }
}

function writeReport(report, options) {
  mkdirSync(REVIEWS_DIR, { recursive: true });
  writeFileSync(
    path.join(REVIEWS_DIR, 'worktree-triage.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  writeFileSync(path.join(REVIEWS_DIR, 'worktree-triage.md'), toMarkdown(report, options));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport();

  if (options.write) {
    writeReport(report, options);
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.markdown) {
    console.log(toMarkdown(report, options));
  } else {
    printText(report);
  }

  if (options.strict && report.summary.blockingTotal > 0) {
    process.exitCode = 1;
  }
}

main();

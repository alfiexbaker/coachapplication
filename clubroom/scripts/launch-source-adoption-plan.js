#!/usr/bin/env node
/* eslint-disable no-console */

const { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REVIEWS_DIR = path.join(ROOT, 'reviews');
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];
const SOURCE_ROOTS = [
  'app/',
  'components/',
  'hooks/',
  'services/',
  'constants/',
  'context/',
  'contracts/',
  'navigation/',
  'types/',
  'utils/',
];
const IMPORT_PATTERN =
  /(?:import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?|export\s+(?:type\s+)?[^'"]*?\s+from\s+|require\(\s*)['"]([^'"]+)['"]/g;

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    markdown: argv.includes('--markdown'),
    write: argv.includes('--write'),
  };
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function runJson(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`${result.stdout || ''}\n${result.stderr || ''}`.trim());
  }

  return JSON.parse(result.stdout);
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

function isSourceFile(file) {
  return SOURCE_ROOTS.some((root) => file.startsWith(root));
}

function candidateFiles(baseFile) {
  const candidates = [baseFile];
  for (const extension of SOURCE_EXTENSIONS) {
    candidates.push(`${baseFile}${extension}`);
  }
  for (const extension of SOURCE_EXTENSIONS) {
    candidates.push(path.join(baseFile, `index${extension}`));
  }
  return candidates;
}

function resolveImport(importerFile, specifier) {
  if (specifier.startsWith('@/')) {
    const base = path.join(ROOT, specifier.slice(2));
    return resolveCandidate(base);
  }

  if (specifier.startsWith('.')) {
    const base = path.resolve(ROOT, path.dirname(importerFile), specifier);
    return resolveCandidate(base);
  }

  return null;
}

function resolveCandidate(basePath) {
  for (const candidate of candidateFiles(basePath)) {
    if (!existsSync(candidate)) continue;
    if (statSync(candidate).isFile()) {
      const relative = toPosix(path.relative(ROOT, candidate));
      return isSourceFile(relative) ? relative : null;
    }
  }
  return null;
}

function extractImports(file) {
  const absolute = path.join(ROOT, file);
  if (!existsSync(absolute)) return [];
  const content = readFileSync(absolute, 'utf8');
  const imports = [];
  let match;

  while ((match = IMPORT_PATTERN.exec(content))) {
    const resolved = resolveImport(file, match[1]);
    if (resolved) imports.push(resolved);
  }

  IMPORT_PATTERN.lastIndex = 0;
  return [...new Set(imports)].sort();
}

function collectDependencyClosure(seedFile) {
  const seen = new Set();
  const missing = [];
  const stack = [seedFile];

  while (stack.length > 0) {
    const file = stack.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);

    const absolute = path.join(ROOT, file);
    if (!existsSync(absolute)) {
      missing.push(file);
      continue;
    }

    for (const dependency of extractImports(file)) {
      if (!seen.has(dependency)) stack.push(dependency);
    }
  }

  return {
    files: [...seen].sort(),
    missing: [...new Set(missing)].sort(),
  };
}

function summarizeFiles(files, trackedFiles) {
  const tracked = files.filter((file) => trackedFiles.has(file));
  const untracked = files.filter((file) => !trackedFiles.has(file));
  const byTopLevel = {};

  for (const file of untracked) {
    const root = file.split('/')[0] || file;
    byTopLevel[root] = (byTopLevel[root] ?? 0) + 1;
  }

  return {
    total: files.length,
    tracked: tracked.length,
    untracked: untracked.length,
    trackedPercent: files.length === 0 ? 100 : Math.round((tracked.length / files.length) * 100),
    byTopLevel: Object.fromEntries(
      Object.entries(byTopLevel).sort((left, right) => right[1] - left[1]),
    ),
    trackedFiles: tracked,
    untrackedFiles: untracked,
    sampleUntracked: untracked.slice(0, 40),
  };
}

function buildRoutePlans(queue, trackedFiles) {
  return queue.map((item) => {
    const closure = collectDependencyClosure(item.file);
    return {
      file: item.file,
      action: item.action,
      priority: item.priority,
      verdict: item.verdict,
      pdos: item.pdos,
      riskFlags: item.riskFlags,
      source: summarizeFiles(closure.files, trackedFiles),
      missing: closure.missing,
    };
  });
}

function buildWave(id, label, routes, trackedFiles) {
  const files = [...new Set(routes.flatMap((route) => collectDependencyClosure(route.file).files))].sort();
  return {
    id,
    label,
    routeCount: routes.length,
    routes: routes.map((route) => route.file).sort(),
    source: summarizeFiles(files, trackedFiles),
  };
}

function buildReport() {
  const routeReport = runJson(process.execPath, ['scripts/launch-route-decision-queue.js', '--json']);
  const trackedFiles = runGitLsFiles();
  const queuedRoutes = routeReport.queue.filter((route) => route.action !== 'delete');
  const p0Routes = queuedRoutes.filter((route) => route.priority === 'P0');
  const p1Routes = queuedRoutes.filter((route) => route.priority === 'P1');
  const pruneRoutes = routeReport.queue.filter((route) =>
    ['delete', 'demote'].includes(route.action),
  );
  const routePlans = buildRoutePlans(queuedRoutes, trackedFiles);

  return {
    generatedAt: new Date().toISOString(),
    sourceRouteReportGeneratedAt: routeReport.generatedAt,
    queueSummary: routeReport.summary,
    waves: [
      buildWave('p0-trust-source', 'P0 trust implementation source', p0Routes, trackedFiles),
      buildWave('p1-money-source', 'P1 money implementation source', p1Routes, trackedFiles),
      buildWave('p3-prune-demote-source', 'P3 prune and demote source', pruneRoutes, trackedFiles),
    ],
    routes: routePlans,
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Launch Source Adoption Plan');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Queued routes: ${report.queueSummary.total}`);
  lines.push('');
  lines.push('## Adoption Waves');
  lines.push('');
  lines.push('| Wave | Routes | Tracked | Untracked | Top untracked roots |');
  lines.push('| --- | ---: | ---: | ---: | --- |');
  for (const wave of report.waves) {
    const roots = Object.entries(wave.source.byTopLevel)
      .slice(0, 4)
      .map(([root, count]) => `${root}=${count}`)
      .join(', ');
    lines.push(
      `| ${wave.label} | ${wave.routeCount} | ${wave.source.tracked}/${wave.source.total} (${wave.source.trackedPercent}%) | ${wave.source.untracked} | ${roots || '-'} |`,
    );
  }

  lines.push('');
  lines.push('## Route Closures');
  lines.push('');
  for (const route of report.routes) {
    lines.push(`### ${route.priority} ${route.action.toUpperCase()} ${route.file}`);
    lines.push('');
    lines.push(`- Verdict: ${route.verdict} / ${route.pdos}`);
    lines.push(
      `- Source: ${route.source.tracked}/${route.source.total} tracked (${route.source.trackedPercent}%), ${route.source.untracked} untracked`,
    );
    if (route.riskFlags.length > 0) {
      lines.push(`- Risks: ${route.riskFlags.join(', ')}`);
    }
    if (route.missing.length > 0) {
      lines.push(`- Missing imports: ${route.missing.join(', ')}`);
    }
    if (route.source.sampleUntracked.length > 0) {
      lines.push('- Sample untracked dependency files:');
      for (const file of route.source.sampleUntracked.slice(0, 12)) {
        lines.push(`  - ${file}`);
      }
      if (route.source.untracked > 12) {
        lines.push(`  - ... ${route.source.untracked - 12} more.`);
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function writeReport(report) {
  mkdirSync(REVIEWS_DIR, { recursive: true });
  writeFileSync(
    path.join(REVIEWS_DIR, 'launch-source-adoption-plan.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  writeFileSync(path.join(REVIEWS_DIR, 'launch-source-adoption-plan.md'), toMarkdown(report));
}

function printText(report) {
  console.log('Launch source adoption plan');
  console.log(`- queued routes: ${report.queueSummary.total}`);
  for (const wave of report.waves) {
    console.log(
      `- ${wave.id}: routes ${wave.routeCount}, tracked ${wave.source.tracked}/${wave.source.total} (${wave.source.trackedPercent}%), untracked ${wave.source.untracked}`,
    );
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport();

  if (options.write) {
    writeReport(report);
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (options.markdown) {
    console.log(toMarkdown(report));
    return;
  }

  printText(report);
}

main();

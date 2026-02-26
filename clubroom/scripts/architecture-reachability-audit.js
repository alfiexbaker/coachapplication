#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TODAY = new Date().toISOString().slice(0, 10);
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits');

const CODE_DIRS = [
  'app',
  'components',
  'hooks',
  'services',
  'navigation',
  'constants',
  'types',
  'utils',
  'context',
  'scripts',
  '__tests__',
];

const SOURCE_ROOT_DIRS = [
  'app',
  'components',
  'hooks',
  'services',
  'navigation',
  'constants',
  'types',
  'utils',
  'context',
];

const EXCLUDED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'android',
  'ios',
  'dist',
  '.expo',
  '.tmp-tests',
]);

const FILE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const RESOLVE_EXTS = [
  '.native.ts',
  '.native.tsx',
  '.web.ts',
  '.web.tsx',
  '.ios.ts',
  '.ios.tsx',
  '.android.ts',
  '.android.tsx',
  ...FILE_EXTS,
];

function posixRel(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join('/');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walkDir(absDir, out) {
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      walkDir(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!FILE_EXTS.includes(path.extname(entry.name))) continue;
    out.push(abs);
  }
}

function collectFiles() {
  const files = [];
  for (const rel of CODE_DIRS) {
    walkDir(path.join(ROOT, rel), files);
  }
  return files;
}

function resolveImport(fromFile, specifier) {
  let base;
  if (specifier.startsWith('@/')) {
    base = path.join(ROOT, specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return [];
  }

  if (path.extname(base)) {
    return fs.existsSync(base) ? [base] : [];
  }

  const candidates = [
    ...RESOLVE_EXTS.map((ext) => `${base}${ext}`),
    ...RESOLVE_EXTS.map((ext) => path.join(base, `index${ext}`)),
  ];

  const matches = [];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      matches.push(candidate);
    }
  }
  return matches;
}

function parseImports(content) {
  const imports = [];
  const importExportRe =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"`]*?\s+from\s+)?["'`]([^"'`]+)["'`]/g;
  const dynamicImportRe = /\bimport\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  const requireRe = /\brequire\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

  let match;
  while ((match = importExportRe.exec(content))) imports.push(match[1]);
  while ((match = dynamicImportRe.exec(content))) imports.push(match[1]);
  while ((match = requireRe.exec(content))) imports.push(match[1]);
  return imports;
}

function pathKind(relPath) {
  if (relPath.startsWith('app/')) return 'app';
  if (relPath.startsWith('components/')) return 'component';
  if (relPath.startsWith('hooks/')) return 'hook';
  if (relPath.startsWith('services/')) return 'service';
  if (relPath.startsWith('navigation/')) return 'navigation';
  if (relPath.startsWith('constants/')) return 'constant';
  if (relPath.startsWith('types/')) return 'type';
  if (relPath.startsWith('utils/')) return 'util';
  if (relPath.startsWith('context/')) return 'context';
  if (relPath.startsWith('__tests__/')) return 'test';
  if (relPath.startsWith('scripts/')) return 'script';
  return 'other';
}

function isSourceRootFile(relPath) {
  return SOURCE_ROOT_DIRS.some((prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`));
}

function isAppRoot(relPath) {
  return relPath.startsWith('app/') && !relPath.endsWith('.d.ts');
}

function buildGraph(files) {
  const fileSet = new Set(files.map((abs) => path.resolve(abs)));
  const graph = new Map();
  const importers = new Map();
  const rawImportsByFile = new Map();

  for (const absFile of files) {
    const content = fs.readFileSync(absFile, 'utf8');
    const specs = parseImports(content);
    rawImportsByFile.set(absFile, specs);

    const resolved = [];
    for (const spec of specs) {
      const targets = resolveImport(absFile, spec);
      for (const target of targets) {
        if (!fileSet.has(path.resolve(target))) continue;
        resolved.push(path.resolve(target));
        if (!importers.has(path.resolve(target))) importers.set(path.resolve(target), new Set());
        importers.get(path.resolve(target)).add(path.resolve(absFile));
      }
    }
    graph.set(path.resolve(absFile), resolved);
    if (!importers.has(path.resolve(absFile))) importers.set(path.resolve(absFile), new Set());
  }

  return { graph, importers, rawImportsByFile };
}

function bfsReachable(graph, roots) {
  const reachable = new Set();
  const queue = [];
  for (const root of roots) {
    if (!graph.has(root)) continue;
    reachable.add(root);
    queue.push(root);
  }
  while (queue.length > 0) {
    const current = queue.shift();
    const edges = graph.get(current) || [];
    for (const next of edges) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }
  return reachable;
}

function findRouterHardcodedRoutes(content) {
  const findings = [];
  const re = /\brouter\.(push|replace|navigate)\(\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = re.exec(content))) {
    const route = match[3];
    if (!route || route.startsWith('Routes.') || route.startsWith('{')) continue;
    if (route.startsWith('/')) {
      findings.push({ method: match[1], route });
    }
  }
  return findings;
}

function summarize() {
  ensureDir(AUDIT_DIR);
  const allFiles = collectFiles().map((f) => path.resolve(f));
  const sourceFiles = allFiles.filter((f) => isSourceRootFile(posixRel(f)));
  const { graph, importers, rawImportsByFile } = buildGraph(allFiles);
  const appRoots = sourceFiles.filter((f) => isAppRoot(posixRel(f)));
  const reachableFromApp = bfsReachable(graph, appRoots);

  const sourceRels = sourceFiles.map(posixRel);
  const componentFiles = sourceFiles.filter((f) => posixRel(f).startsWith('components/') && posixRel(f).endsWith('.tsx'));
  const routeFiles = sourceFiles.filter((f) => posixRel(f).startsWith('app/'));

  const componentRows = componentFiles.map((abs) => {
    const rel = posixRel(abs);
    const importerSet = importers.get(abs) || new Set();
    const importerRels = [...importerSet].map(posixRel).sort();
    const importerKinds = [...new Set(importerRels.map(pathKind))].sort();
    const nonTestImporters = importerRels.filter((r) => !r.startsWith('__tests__/') && !r.startsWith('scripts/'));
    const onlyBarrelImporters =
      importerRels.length > 0 &&
      importerRels.every((r) => /\/index\.(ts|tsx|js|jsx|mjs|cjs)$/.test(r));
    const reachable = reachableFromApp.has(abs);
    let status = 'reachable';
    if (!reachable && importerRels.length === 0) status = 'unreferenced';
    else if (!reachable && nonTestImporters.length === 0) status = 'test_or_script_only';
    else if (!reachable && onlyBarrelImporters) status = 'barrel_only_not_reachable';
    else if (!reachable) status = 'not_reachable_from_app';
    return {
      file: rel,
      reachableFromApp: reachable,
      status,
      importerCount: importerRels.length,
      importers: importerRels,
      importerKinds: importerKinds.join(','),
    };
  });

  const rawFindings = {
    componentImportsServices: [],
    servicesImportUi: [],
    servicesImportHooks: [],
    hardcodedRoutes: [],
    resultPatternDrift: { dotOk: [], dotIsOk: [], serviceThrows: [] },
  };

  for (const abs of sourceFiles) {
    const rel = posixRel(abs);
    const content = fs.readFileSync(abs, 'utf8');
    const specs = rawImportsByFile.get(abs) || [];

    if (rel.startsWith('components/')) {
      const serviceImports = specs.filter((s) => s.startsWith('@/services/'));
      if (serviceImports.length > 0) {
        rawFindings.componentImportsServices.push({ file: rel, imports: serviceImports });
      }
    }

    if (rel.startsWith('services/')) {
      const uiImports = specs.filter(
        (s) =>
          s.startsWith('@/components/') ||
          s.startsWith('@/app/') ||
          s === 'expo-router' ||
          s.startsWith('expo-router/'),
      );
      if (uiImports.length > 0) {
        rawFindings.servicesImportUi.push({ file: rel, imports: uiImports });
      }
      const hookImports = specs.filter((s) => s.startsWith('@/hooks/'));
      if (hookImports.length > 0) {
        rawFindings.servicesImportHooks.push({ file: rel, imports: hookImports });
      }
      if (/\bthrow\s+new\b|\bthrow\s+[^;]+/m.test(content)) {
        rawFindings.resultPatternDrift.serviceThrows.push(rel);
      }
    }

    if (rel.startsWith('app/') || rel.startsWith('components/') || rel.startsWith('hooks/')) {
      const hardcoded = findRouterHardcodedRoutes(content);
      if (hardcoded.length > 0) {
        rawFindings.hardcodedRoutes.push({ file: rel, calls: hardcoded });
      }
    }

    if (content.includes('.ok')) rawFindings.resultPatternDrift.dotOk.push(rel);
    if (content.includes('.isOk')) rawFindings.resultPatternDrift.dotIsOk.push(rel);
  }

  const likelyDeadComponents = componentRows
    .filter((row) => row.status !== 'reachable')
    .sort((a, b) => a.file.localeCompare(b.file));

  const highRiskArchitectureFindings = [
    ...rawFindings.servicesImportUi.map((f) => ({ kind: 'service-imports-ui', ...f })),
    ...rawFindings.servicesImportHooks.map((f) => ({ kind: 'service-imports-hooks', ...f })),
  ];

  const summaryData = {
    generatedAt: new Date().toISOString(),
    totals: {
      allFilesScanned: allFiles.length,
      sourceFilesScanned: sourceFiles.length,
      routeFiles: routeFiles.length,
      componentFiles: componentFiles.length,
      reachableSourceFilesFromApp: reachableFromApp.size,
      reachableComponentsFromApp: componentRows.filter((r) => r.reachableFromApp).length,
      nonReachableComponents: componentRows.filter((r) => !r.reachableFromApp).length,
    },
    componentStatusCounts: componentRows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {}),
    architectureCounts: {
      componentImportsServices: rawFindings.componentImportsServices.length,
      servicesImportUi: rawFindings.servicesImportUi.length,
      servicesImportHooks: rawFindings.servicesImportHooks.length,
      hardcodedRoutes: rawFindings.hardcodedRoutes.length,
      resultDotOkRefs: rawFindings.resultPatternDrift.dotOk.length,
      resultDotIsOkRefs: rawFindings.resultPatternDrift.dotIsOk.length,
      servicesWithThrowStatements: rawFindings.resultPatternDrift.serviceThrows.length,
    },
  };

  const csvPath = path.join(AUDIT_DIR, `component-reachability-${TODAY}.csv`);
  const jsonPath = path.join(AUDIT_DIR, `architecture-reachability-audit-${TODAY}.json`);
  const mdPath = path.join(AUDIT_DIR, `architecture-hardening-report-${TODAY}.md`);

  const csvLines = [
    'file,reachable_from_app,status,importer_count,importer_kinds',
    ...componentRows.map((row) =>
      [
        row.file,
        row.reachableFromApp ? 'yes' : 'no',
        row.status,
        String(row.importerCount),
        `"${row.importerKinds}"`,
      ].join(','),
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n') + '\n');

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        summary: summaryData,
        likelyDeadComponents,
        architectureFindings: rawFindings,
      },
      null,
      2,
    ),
  );

  const topLikelyDead = likelyDeadComponents.slice(0, 60);
  const topComponentServiceViolations = rawFindings.componentImportsServices.slice(0, 40);
  const topHardcodedRoutes = rawFindings.hardcodedRoutes.slice(0, 40);
  const topServiceUiViolations = highRiskArchitectureFindings.slice(0, 40);

  const md = [];
  md.push(`# Architecture Hardening Audit (${TODAY})`);
  md.push('');
  md.push('Generated by `scripts/architecture-reachability-audit.js`.');
  md.push('');
  md.push('## Scope');
  md.push('');
  md.push('- Static import graph reachability from `app/` route roots');
  md.push('- Component usage inventory (`components/**/*.tsx`)');
  md.push('- Architecture rule scans (layering, routing, Result-pattern drift)');
  md.push('');
  md.push('## Summary');
  md.push('');
  md.push(`- Source files scanned: **${summaryData.totals.sourceFilesScanned}**`);
  md.push(`- Route files scanned (` + '`app/`' + `): **${summaryData.totals.routeFiles}**`);
  md.push(`- Component files scanned: **${summaryData.totals.componentFiles}**`);
  md.push(`- Components reachable from app roots: **${summaryData.totals.reachableComponentsFromApp}**`);
  md.push(`- Components not reachable from app roots (static): **${summaryData.totals.nonReachableComponents}**`);
  md.push('');
  md.push('### Component Status Counts');
  md.push('');
  for (const [status, count] of Object.entries(summaryData.componentStatusCounts).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    md.push(`- ${status}: ${count}`);
  }
  md.push('');
  md.push('### Architecture Rule Counts');
  md.push('');
  for (const [key, count] of Object.entries(summaryData.architectureCounts)) {
    md.push(`- ${key}: ${count}`);
  }
  md.push('');
  md.push('## Likely Dead / Unreachable Components (Top 60)');
  md.push('');
  if (topLikelyDead.length === 0) {
    md.push('- None');
  } else {
    for (const row of topLikelyDead) {
      md.push(`- ${row.file} — ${row.status} (importers: ${row.importerCount})`);
    }
  }
  md.push('');
  md.push('## Layering Findings');
  md.push('');
  md.push('### Components Importing Services (Top 40)');
  md.push('');
  if (topComponentServiceViolations.length === 0) {
    md.push('- None');
  } else {
    for (const finding of topComponentServiceViolations) {
      md.push(`- ${finding.file}`);
      for (const imp of finding.imports.slice(0, 6)) {
        md.push(`  - ${imp}`);
      }
    }
  }
  md.push('');
  md.push('### Services Importing UI / Router / App (Top 40)');
  md.push('');
  if (topServiceUiViolations.length === 0) {
    md.push('- None');
  } else {
    for (const finding of topServiceUiViolations) {
      md.push(`- ${finding.file} [${finding.kind}]`);
      for (const imp of finding.imports.slice(0, 6)) {
        md.push(`  - ${imp}`);
      }
    }
  }
  md.push('');
  md.push('## Routing Findings');
  md.push('');
  md.push('### Hardcoded router.push/replace/navigate string paths (Top 40)');
  md.push('');
  if (topHardcodedRoutes.length === 0) {
    md.push('- None');
  } else {
    for (const finding of topHardcodedRoutes) {
      const rendered = finding.calls.map((c) => `${c.method}(${c.route})`).join(', ');
      md.push(`- ${finding.file} — ${rendered}`);
    }
  }
  md.push('');
  md.push('## Result Pattern Drift');
  md.push('');
  md.push(`- \`.ok\` references: ${rawFindings.resultPatternDrift.dotOk.length}`);
  md.push(`- \`.isOk\` references: ${rawFindings.resultPatternDrift.dotIsOk.length}`);
  md.push(`- Service files containing \`throw\`: ${rawFindings.resultPatternDrift.serviceThrows.length}`);
  md.push('');
  md.push('## Notes / Caveats');
  md.push('');
  md.push('- Reachability is **static import-graph based**. Dynamic runtime registration, string-based lazy imports, and native entrypoints can produce false positives.');
  md.push('- `app/` files are Expo Router route entries and are considered app roots by definition (auto-routable even if no static nav reference is found).');
  md.push('- A component marked `not_reachable_from_app` should be manually verified before deletion.');
  md.push('');
  md.push('## Output Files');
  md.push('');
  md.push(`- \`${posixRel(mdPath)}\``);
  md.push(`- \`${posixRel(csvPath)}\``);
  md.push(`- \`${posixRel(jsonPath)}\``);
  md.push('');

  fs.writeFileSync(mdPath, md.join('\n'));

  return { mdPath, csvPath, jsonPath, summaryData };
}

function main() {
  const result = summarize();
  console.log('Audit complete.');
  console.log(`Report: ${posixRel(result.mdPath)}`);
  console.log(`CSV:    ${posixRel(result.csvPath)}`);
  console.log(`JSON:   ${posixRel(result.jsonPath)}`);
  console.log(JSON.stringify(result.summaryData, null, 2));
}

main();

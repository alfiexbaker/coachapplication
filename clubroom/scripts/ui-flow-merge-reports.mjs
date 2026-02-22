import fs from 'node:fs/promises';
import path from 'node:path';

const defaultInputDir = process.env.UI_FLOW_MERGE_INPUT_DIR || '/tmp/ui-flow-checks-50';
const defaultOutputDir = process.env.UI_FLOW_MERGE_OUTPUT_DIR || '/tmp/ui-flow-checks-50';
const failLevels = ['none', 'high', 'medium'];
const severityRank = { none: 0, medium: 1, high: 2 };

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseCliOptions(argv) {
  const envFailOn = (process.env.UI_FLOW_FAIL_ON || 'high').toLowerCase();
  if (!failLevels.includes(envFailOn)) {
    throw new Error(
      `UI_FLOW_FAIL_ON must be one of: ${failLevels.join(', ')} (received "${envFailOn}")`,
    );
  }

  const options = {
    inputDir: defaultInputDir,
    outputDir: defaultOutputDir,
    failOn: envFailOn,
    includeRoles: [],
    helpOnly: false,
  };

  if (process.env.UI_FLOW_MERGE_ROLES) {
    options.includeRoles.push(...parseList(process.env.UI_FLOW_MERGE_ROLES));
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.helpOnly = true;
      continue;
    }
    if (arg.startsWith('--input-dir=')) {
      options.inputDir = arg.slice('--input-dir='.length).trim();
      continue;
    }
    if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.slice('--output-dir='.length).trim();
      continue;
    }
    if (arg.startsWith('--fail-on=')) {
      options.failOn = arg.slice('--fail-on='.length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith('--roles=')) {
      options.includeRoles.push(...parseList(arg.slice('--roles='.length)));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!failLevels.includes(options.failOn)) {
    throw new Error(`--fail-on must be one of: ${failLevels.join(', ')}`);
  }

  return {
    ...options,
    includeRoles: Array.from(new Set(options.includeRoles)),
  };
}

function usageText() {
  return [
    'Merge UI flow chunk reports into one consolidated report.',
    '',
    'Options:',
    '  --help, -h                 Show help and exit',
    '  --input-dir=/path          Root dir containing chunk report artifacts',
    '  --output-dir=/path         Output dir for merged report files',
    '  --roles=coach,parent       Include only selected roles',
    '  --fail-on=none|high|medium Exit non-zero based on merged severity threshold',
    '',
    'Environment overrides:',
    '  UI_FLOW_MERGE_INPUT_DIR',
    '  UI_FLOW_MERGE_OUTPUT_DIR',
    '  UI_FLOW_MERGE_ROLES',
    '  UI_FLOW_FAIL_ON',
  ].join('\n');
}

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // eslint-disable-next-line no-await-in-loop
      files.push(...(await walkFiles(entryPath)));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

function matchChunkReport(filePath) {
  const name = path.basename(filePath);
  return /^report\.[a-z]+\.chunk-\d+-of-\d+\.json$/i.test(name);
}

function matchRoleReport(filePath) {
  const name = path.basename(filePath);
  return /^report\.[a-z]+\.json$/i.test(name) && !name.includes('.chunk-') && name !== 'report.json';
}

function dedupeResults(results) {
  const byFlow = new Map();

  for (const result of results) {
    if (!result?.id || !result?.role) continue;
    const key = `${result.role}:${result.id}`;
    const existing = byFlow.get(key);
    if (!existing) {
      byFlow.set(key, result);
      continue;
    }

    const existingRank = severityRank[existing.severity] ?? 0;
    const nextRank = severityRank[result.severity] ?? 0;

    if (nextRank > existingRank) {
      byFlow.set(key, result);
      continue;
    }

    if (nextRank === existingRank) {
      const mergedIssues = Array.from(new Set([...(existing.issues || []), ...(result.issues || [])]));
      byFlow.set(key, {
        ...existing,
        ...result,
        issues: mergedIssues,
        attempts: Math.max(existing.attempts || 1, result.attempts || 1),
      });
    }
  }

  return Array.from(byFlow.values()).sort((a, b) => {
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return a.id.localeCompare(b.id);
  });
}

function buildTotals(results) {
  return {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'failed').length,
    high: results.filter((r) => r.severity === 'high').length,
    medium: results.filter((r) => r.severity === 'medium').length,
    none: results.filter((r) => r.severity === 'none').length,
  };
}

function shouldFailRun(totals, failOn) {
  if (failOn === 'none') {
    return { shouldFail: false, reason: '' };
  }
  if (failOn === 'high') {
    const shouldFail = totals.high > 0;
    return {
      shouldFail,
      reason: shouldFail ? `high severity findings detected (${totals.high})` : '',
    };
  }

  const mediumOrHigher = totals.high + totals.medium;
  const shouldFail = mediumOrHigher > 0;
  return {
    shouldFail,
    reason: shouldFail
      ? `medium-or-higher findings detected (high=${totals.high}, medium=${totals.medium})`
      : '',
  };
}

function buildMarkdown(report) {
  const lines = [
    '# UI Flow Check Report (Merged)',
    '',
    `- Generated: ${report.generatedAt}`,
    `- Input directory: ${report.meta.inputDir}`,
    `- Source report files: ${report.meta.sourceFiles}`,
    `- Total flows: ${report.totals.total}`,
    `- Failed: ${report.totals.failed}`,
    `- High: ${report.totals.high}`,
    `- Medium: ${report.totals.medium}`,
    `- Fail-on: ${report.meta.failOn}`,
    `- Should fail: ${report.meta.shouldFail ? 'yes' : 'no'}`,
    '',
    '## High / Medium Findings',
    '',
  ];

  const findings = report.results.filter((result) => result.severity === 'high' || result.severity === 'medium');
  if (findings.length === 0) {
    lines.push('- None');
  } else {
    for (const item of findings) {
      lines.push(
        `- [${item.severity.toUpperCase()}] ${item.role}:${item.id} (${item.path}) :: ${(item.issues || []).join(' | ')}`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

async function loadReports(inputDir) {
  const files = await walkFiles(inputDir);
  const chunkFiles = files.filter((filePath) => matchChunkReport(filePath));

  // Fallback: when chunk files aren't present, merge per-role report files.
  const selectedFiles = chunkFiles.length > 0 ? chunkFiles : files.filter((filePath) => matchRoleReport(filePath));

  const loaded = [];
  for (const filePath of selectedFiles) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.results)) {
        loaded.push({
          filePath,
          generatedAt: parsed.generatedAt,
          results: parsed.results,
        });
      }
    } catch {
      // Skip unreadable/invalid report files.
    }
  }

  return loaded;
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.helpOnly) {
    console.log(usageText());
    return;
  }

  await fs.mkdir(options.outputDir, { recursive: true });

  const loaded = await loadReports(options.inputDir);
  if (loaded.length === 0) {
    throw new Error(`No report files found under ${options.inputDir}.`);
  }

  const rawResults = loaded.flatMap((entry) => entry.results);
  const filteredResults =
    options.includeRoles.length > 0
      ? rawResults.filter((result) => options.includeRoles.includes(result.role))
      : rawResults;
  const dedupedResults = dedupeResults(filteredResults);
  const totals = buildTotals(dedupedResults);
  const failDecision = shouldFailRun(totals, options.failOn);

  const merged = {
    generatedAt: new Date().toISOString(),
    totals,
    meta: {
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      failOn: options.failOn,
      shouldFail: failDecision.shouldFail,
      failReason: failDecision.reason || undefined,
      roles: options.includeRoles.length > 0 ? options.includeRoles : undefined,
      sourceFiles: loaded.length,
    },
    results: dedupedResults,
  };

  await fs.writeFile(path.join(options.outputDir, 'report.merged.json'), JSON.stringify(merged, null, 2));
  await fs.writeFile(path.join(options.outputDir, 'report.merged.md'), buildMarkdown(merged));

  console.log(
    JSON.stringify(
      {
        totals,
        failOn: options.failOn,
        shouldFail: failDecision.shouldFail,
        failReason: failDecision.reason || undefined,
        sourceFiles: loaded.length,
        outputDir: options.outputDir,
      },
      null,
      2,
    ),
  );

  if (failDecision.shouldFail) {
    process.exitCode = 1;
  }
}

await main();

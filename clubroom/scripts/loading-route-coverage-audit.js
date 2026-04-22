#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const { HOT_PATH_REVIEW_STATES, loadingRouteManifest, resolveLoadingRouteEntry } = require('../navigation/loading-route-manifest.js');

const ROOT = process.cwd();
const APP_ROOT = path.join(ROOT, 'app');
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.expo', '.tmp-tests']);

const ASYNC_INDICATORS = [
  /\buseScreen\s*\(/,
  /\bLoadingState\b/,
  /\bSectionSkeleton\b/,
  /\bSubmitProgressState\b/,
  /\bActivityIndicator\b/,
  /\bAnalyticsScreenState\b/,
  /\bSettingsScreenState\b/,
  /\bVerificationScreenState\b/,
  /\bChildScreenState\b/,
];

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function walkRoutes(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRoutes(absPath, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.tsx')) continue;
    out.push(absPath);
  }
}

function describeAsyncIndicators(content) {
  return ASYNC_INDICATORS.filter((indicator) => indicator.test(content)).map((indicator) =>
    indicator.toString(),
  );
}

function validateManifestEntries() {
  const findings = [];

  for (const entry of loadingRouteManifest) {
    if (!entry.pattern) {
      findings.push('Manifest entry is missing a pattern.');
    }

    if (entry.strategy !== 'static') {
      for (const key of ['stableShell', 'retains', 'pendingSurface', 'transition']) {
        if (!entry[key]) {
          findings.push(`Manifest entry ${entry.pattern} is missing ${key}.`);
        }
      }
    }

    if (entry.strategy === 'cold-first' && !entry.rationale) {
      findings.push(`Cold-first manifest entry ${entry.pattern} must declare a rationale.`);
    }

    if (entry.hotPath) {
      if (!entry.review) {
        findings.push(`Hot-path manifest entry ${entry.pattern} is missing its review checklist.`);
        continue;
      }

      const missingStates = HOT_PATH_REVIEW_STATES.filter(
        (state) => !entry.review.states || !entry.review.states.includes(state),
      );
      if (missingStates.length > 0) {
        findings.push(
          `Hot-path manifest entry ${entry.pattern} is missing review states: ${missingStates.join(', ')}.`,
        );
      }

      if (!Array.isArray(entry.review.blockers) || entry.review.blockers.length === 0) {
        findings.push(`Hot-path manifest entry ${entry.pattern} must declare ship-blocking flicker conditions.`);
      }
    }
  }

  return findings;
}

function main() {
  if (!fs.existsSync(APP_ROOT)) {
    console.error('app/ directory not found.');
    process.exit(1);
  }

  const manifestFindings = validateManifestEntries();
  const routeFiles = [];
  walkRoutes(APP_ROOT, routeFiles);

  const unmatched = [];
  const staticAsyncMismatches = [];
  const fallbackMatches = [];
  const strategyCounts = new Map();
  const ownerCounts = new Map();

  for (const absRoute of routeFiles) {
    const routeFile = toPosix(path.relative(ROOT, absRoute));
    const entry = resolveLoadingRouteEntry(routeFile);

    if (!entry) {
      unmatched.push(routeFile);
      continue;
    }

    strategyCounts.set(entry.strategy, (strategyCounts.get(entry.strategy) ?? 0) + 1);
    ownerCounts.set(entry.owner, (ownerCounts.get(entry.owner) ?? 0) + 1);

    if (entry.pattern === 'app/**/*.tsx') {
      fallbackMatches.push(routeFile);
    }

    const content = fs.readFileSync(absRoute, 'utf8');
    const indicators = describeAsyncIndicators(content);

    if (entry.strategy === 'static' && indicators.length > 0) {
      staticAsyncMismatches.push({
        routeFile,
        pattern: entry.pattern,
        indicators,
      });
    }
  }

  const findings = [...manifestFindings];
  if (unmatched.length > 0) {
    findings.push(`Unmatched route files: ${unmatched.join(', ')}`);
  }
  if (staticAsyncMismatches.length > 0) {
    findings.push(
      ...staticAsyncMismatches.map(
        ({ routeFile, pattern, indicators }) =>
          `${routeFile} matched static rule ${pattern} but still has async indicators: ${indicators.join(', ')}`,
      ),
    );
  }

  if (findings.length > 0) {
    console.error('Loading route coverage audit failed:\n');
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log('Loading route coverage audit passed.');
  console.log(`Routes checked: ${routeFiles.length}`);
  console.log(
    `Strategy counts: ${[...strategyCounts.entries()]
      .map(([strategy, count]) => `${strategy}=${count}`)
      .join(', ')}`,
  );
  console.log(
    `Owner counts: ${[...ownerCounts.entries()]
      .map(([owner, count]) => `${owner}=${count}`)
      .join(', ')}`,
  );
  console.log(`Fallback static routes: ${fallbackMatches.length}`);
}

main();

#!/usr/bin/env node

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { listFiles: listFilesFromTree } = require('./file-scan-utils');

const TARGETS = ['app', 'components'];
const SAFE_SHELL_HINTS = [
  'SafeAreaView',
  'PageScaffold',
  'PageContainer',
  'useSafeAreaInsets',
  'ScreenState',
  'FormScreen',
  'DocumentScreen',
  'MapContent',
];

function listFiles() {
  return listFilesFromTree(TARGETS, { extensions: ['.tsx'] });
}

function lineForIndex(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function matchAllWithLine(source, regex) {
  const matches = [];
  regex.lastIndex = 0;
  let match = regex.exec(source);
  while (match) {
    matches.push({ match, line: lineForIndex(source, match.index) });
    match = regex.exec(source);
  }
  return matches;
}

function isLikelyScreenFile(file) {
  return file.startsWith('app/') && !file.includes('/_layout') && !file.startsWith('app/+');
}

function isRedirectOnlyRoute(source) {
  if (!source.includes('<Redirect')) return false;
  return !/<(?:SafeAreaView|ScrollView|FlatList|SectionList|View|MapContent)\b/.test(source);
}

function hasSafeAreaShell(source) {
  if (SAFE_SHELL_HINTS.some((hint) => source.includes(hint))) {
    return true;
  }
  return /<[A-Z][A-Za-z0-9]*(?:Screen|ScreenState|ScreenShell|ScreenLayout)\b/.test(source);
}

function run() {
  const files = listFiles();

  const findings = {
    critical: [],
    high: [],
    medium: [],
  };

  for (const file of files) {
    const fullPath = resolve(file);
    const source = readFileSync(fullPath, 'utf8');

    if (isLikelyScreenFile(file)) {
      if (!isRedirectOnlyRoute(source) && !hasSafeAreaShell(source)) {
        findings.high.push({
          file,
          line: 1,
          rule: 'screen-without-safe-area-shell',
          detail: 'Screen may render under notch/home indicator on some devices.',
        });
      }

      const topOnlyEdges = matchAllWithLine(source, /edges=\{\['top'\]\}/g);
      for (const hit of topOnlyEdges) {
        findings.medium.push({
          file,
          line: hit.line,
          rule: 'top-only-safe-area',
          detail:
            'Top-only SafeAreaView can allow bottom controls/content to collide with the home indicator.',
        });
      }
    }

    const largeFixedWidths = matchAllWithLine(source, /width:\s*(\d{3,})/g).filter(({ match }) => {
      const width = Number(match[1]);
      return Number.isFinite(width) && width >= 280;
    });
    for (const hit of largeFixedWidths) {
      findings.high.push({
        file,
        line: hit.line,
        rule: 'large-fixed-width',
        detail: `Fixed width ${hit.match[1]} may overflow on smaller phones.`,
      });
    }

    const spacerViews = matchAllWithLine(
      source,
      /<View\s+style=\{\{\s*width:\s*(\d+)\s*\}\}\s*\/>/g,
    ).filter(({ match }) => Number(match[1]) >= 20);
    for (const hit of spacerViews) {
      findings.medium.push({
        file,
        line: hit.line,
        rule: 'spacer-view-hack',
        detail:
          'Large fixed-width spacer View for alignment is brittle across device widths and text scaling.',
      });
    }

    const absoluteBlocks = isLikelyScreenFile(file)
      ? matchAllWithLine(source, /\{[^{}]*position:\s*'absolute'[^{}]*\}/g).filter(({ match }) => {
          const block = match[0];
          const offsetMatches = [...block.matchAll(/(?:top|right|bottom|left):\s*(\d+)/g)];
          const sizeMatches = [...block.matchAll(/(?:width|height):\s*(\d+)/g)];
          const hasLargeOffset = offsetMatches.some((hit) => Number(hit[1]) >= 80);
          const hasLargeFixedSize = sizeMatches.some((hit) => Number(hit[1]) >= 400);
          return hasLargeOffset || hasLargeFixedSize;
        })
      : [];
    for (const hit of absoluteBlocks) {
      findings.medium.push({
        file,
        line: hit.line,
        rule: 'absolute-layout-risk',
        detail:
          'Absolute positioning with large fixed offsets or dimensions can overlap/cut off on small screens.',
      });
    }

    const twoColumnPercent = matchAllWithLine(source, /width:\s*'48%'/g);
    for (const hit of twoColumnPercent) {
      findings.medium.push({
        file,
        line: hit.line,
        rule: 'percent-tile-layout-risk',
        detail: "48% tile patterns can wrap badly with larger text/accessibility settings.",
      });
    }
  }

  const total =
    findings.critical.length + findings.high.length + findings.medium.length;

  if (total === 0) {
    console.log('UI audit passed: no static layout risks detected.');
    return;
  }

  console.log('UI audit report');
  console.log(`- Critical: ${findings.critical.length}`);
  console.log(`- High: ${findings.high.length}`);
  console.log(`- Medium: ${findings.medium.length}`);

  const printTop = (label, list, limit) => {
    if (list.length === 0) return;
    console.log(`\n${label} findings (showing ${Math.min(limit, list.length)} of ${list.length}):`);
    for (const finding of list.slice(0, limit)) {
      console.log(`- ${finding.file}:${finding.line} [${finding.rule}] ${finding.detail}`);
    }
  };

  printTop('Critical', findings.critical, 20);
  printTop('High', findings.high, 40);
  printTop('Medium', findings.medium, 40);

  if (findings.critical.length > 0) process.exit(2);
}

run();

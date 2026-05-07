#!/usr/bin/env node
/**
 * Sprint 8 Agent 3: flexDirection → Row/Column migration (v2)
 * Fixes the closing-tag bug from v1 by handling multi-line JSX opening tags.
 * Processes ONLY the restored files that still exist after feature pruning.
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'components');
const stats = { files: 0, modified: 0, replacements: 0, errors: [] };

// Restored files from git that need reprocessing.
const BROKEN_FILES = [
  'academy/academy-staff-card.tsx',
  'analytics/PeakHoursHeatmap.tsx',
  'analytics/athlete-goal-card.tsx',
  'analytics/goal-progress.tsx',
  'analytics/mini-sparkline.tsx',
  'analytics/progress-chart.tsx',
  'analytics/session-timeline-sections.tsx',
  'availability/wizard-step-hours.tsx',
  'badges/badge-card.tsx',
  'celebrations/goal-celebration.tsx',
  'club/group-chat-sections.tsx',
  'club/welcome-flow-sections.tsx',
  'coach/coach-card-services-sections.tsx',
  'coach/profile-header-sections.tsx',
  'coach/profile-quick-actions-sections.tsx',
  'consent/ConsentCard.tsx',
  'development/dev-special-needs-card.tsx',
  'development/progress-timeline-sections.tsx',
  'development/session-journal-sections.tsx',
  'development/session-recap-card-sections.tsx',
  'discover/booking-flow-stepper.tsx',
  'event/attendee-card-sections.tsx',
  'event/create-event-type-step.tsx',
  'family/family-calendar-sections.tsx',
  'family/medical-tag-list-form.tsx',
  'goals/CategoryBadge.tsx',
  'group/create-session-type-step.tsx',
  'health/injury-step-indicator.tsx',
  'invite/avatar-stack.tsx',
];

// ── Tag parser (handles multi-line JSX) ─────────────────────────────────────

/**
 * Parse all View/Row/Column tags in the file, handling multi-line opening tags.
 * Returns array of { type, startLine, endLine, closing, selfClosing }
 */
function parseAllTags(lines) {
  const tags = [];
  const NAMES = ['View', 'Row', 'Column'];
  let pendingTag = null; // { type, startLine, closing }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (pendingTag) {
      // We're inside a multi-line opening tag, look for > or />
      if (line.includes('/>')) {
        tags.push({ ...pendingTag, endLine: i, selfClosing: true });
        pendingTag = null;
      } else if (line.includes('>')) {
        tags.push({ ...pendingTag, endLine: i, selfClosing: false });
        pendingTag = null;
      }
      // If neither, the tag continues on the next line
      continue;
    }

    // Look for tag starts on this line
    const tagRe = /<(\/?)(View|Row|Column)\b/g;
    let m;
    while ((m = tagRe.exec(line))) {
      const isClosing = m[1] === '/';
      const tagType = m[2];

      if (isClosing) {
        // Closing tags are always single-line: </View>, </Row>, </Column>
        tags.push({ type: tagType, startLine: i, endLine: i, closing: true, selfClosing: false });
        continue;
      }

      // Opening tag — check if it completes on this line
      const afterTag = line.substring(m.index + m[0].length);
      if (/\/>/.test(afterTag) && !/>/.test(afterTag.split('/>')[0])) {
        // Self-closing on same line
        tags.push({ type: tagType, startLine: i, endLine: i, closing: false, selfClosing: true });
      } else if (/>/.test(afterTag)) {
        // Opens and closes `>` on same line (not self-closing)
        tags.push({ type: tagType, startLine: i, endLine: i, closing: false, selfClosing: false });
      } else {
        // Multi-line tag — set pending
        pendingTag = { type: tagType, startLine: i, closing: false };
        break; // Don't process more tags on this line (the rest is part of this tag's attributes)
      }
    }
  }

  return tags;
}

/**
 * Build a stack from parsed tags and fix mismatched closing tags.
 */
function fixClosingTagsV2(lines) {
  const tags = parseAllTags(lines);
  const stack = [];

  for (const tag of tags) {
    if (tag.selfClosing) continue;

    if (!tag.closing) {
      // Opening tag
      stack.push(tag);
    } else {
      // Closing tag
      const expected = stack.pop();
      if (expected && expected.type !== tag.type) {
        // Mismatch! Fix the closing tag to match the opening
        const closeRe = new RegExp(`</${tag.type}>`);
        lines[tag.startLine] = lines[tag.startLine].replace(closeRe, `</${expected.type}>`);
      }
    }
  }
}

// ── Main processing ─────────────────────────────────────────────────────────

function processFile(filePath) {
  stats.files++;
  const original = fs.readFileSync(filePath, 'utf8');
  if (!original.includes('flexDirection')) return;

  const lines = original.split('\n');
  let needsRow = false;
  let needsColumn = false;
  let reps = 0;

  // ═══ PHASE 1: Identify StyleSheet style names with flexDirection ═══

  const rowStyles = new Set();
  const colStyles = new Set();

  // Single-line StyleSheet entries
  for (const line of lines) {
    const m = line.match(/^\s+(\w+)\s*:\s*\{[^}]*?flexDirection\s*:\s*'(row|column)'/);
    if (m) {
      if (m[2] === 'row') rowStyles.add(m[1]);
      else colStyles.add(m[1]);
    }
  }

  // Multi-line: flexDirection on its own line
  for (let i = 0; i < lines.length; i++) {
    if (/^\s+flexDirection\s*:\s*'(row|column)'/.test(lines[i])) {
      const dir = lines[i].includes("'row'") ? 'row' : 'column';
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        const nameMatch = lines[j].match(/^\s+(\w+)\s*:\s*\{/);
        if (nameMatch) {
          if (dir === 'row') rowStyles.add(nameMatch[1]);
          else colStyles.add(nameMatch[1]);
          break;
        }
      }
    }
  }

  // ═══ PHASE 1.5: Filter out styles used on non-View elements ═══
  // Don't replace styles that are used on Clickable, SurfaceCard, Animated.View, etc.

  const viewOnlyRowStyles = new Set();
  const viewOnlyColStyles = new Set();
  const nonViewStyles = new Set();

  for (const name of [...rowStyles, ...colStyles]) {
    const styleRe = new RegExp('styles\\.' + name + '\\b');
    let usedOnView = false;
    let usedOnNonView = false;

    for (const line of lines) {
      if (!styleRe.test(line)) continue;

      if (/<View\b/.test(line) && !line.includes('Animated.View')) {
        usedOnView = true;
      } else if (/<\w/.test(line) && !/<View\b/.test(line)) {
        // Used on some other element (Clickable, SurfaceCard, etc.)
        usedOnNonView = true;
      }
    }

    if (usedOnView) {
      if (rowStyles.has(name)) viewOnlyRowStyles.add(name);
      if (colStyles.has(name)) viewOnlyColStyles.add(name);
    }
    if (usedOnNonView && !usedOnView) {
      nonViewStyles.add(name);
    }
  }

  // ═══ PHASE 2: Identify inline flexDirection Views ═══

  const inlineRows = new Set();
  const inlineCols = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/<View\b/.test(line) && !line.includes('Animated.View') && line.includes('flexDirection')) {
      if (line.includes("'row'")) inlineRows.add(i);
      else if (line.includes("'column'")) inlineCols.add(i);
    }
  }

  // ═══ PHASE 3: Replace opening <View> tags ═══

  for (const name of viewOnlyRowStyles) {
    const styleRe = new RegExp('styles\\.' + name + '\\b');
    for (let i = 0; i < lines.length; i++) {
      if (/<View\b/.test(lines[i]) && !lines[i].includes('Animated.View') && styleRe.test(lines[i])) {
        lines[i] = lines[i].replace(/<View\b/, '<Row');
        needsRow = true;
        reps++;
      }
    }
  }

  for (const name of viewOnlyColStyles) {
    const styleRe = new RegExp('styles\\.' + name + '\\b');
    for (let i = 0; i < lines.length; i++) {
      if (/<View\b/.test(lines[i]) && !lines[i].includes('Animated.View') && styleRe.test(lines[i])) {
        lines[i] = lines[i].replace(/<View\b/, '<Column');
        needsColumn = true;
        reps++;
      }
    }
  }

  for (const lineNum of inlineRows) {
    if (/<View\b/.test(lines[lineNum]) && !lines[lineNum].includes('Animated.View')) {
      lines[lineNum] = lines[lineNum].replace(/<View\b/, '<Row');
      needsRow = true;
      reps++;
    }
  }

  for (const lineNum of inlineCols) {
    if (/<View\b/.test(lines[lineNum]) && !lines[lineNum].includes('Animated.View')) {
      lines[lineNum] = lines[lineNum].replace(/<View\b/, '<Column');
      needsColumn = true;
      reps++;
    }
  }

  // ═══ PHASE 4: Remove flexDirection from styles (only for View-used styles) ═══

  const safeToRemove = new Set([...viewOnlyRowStyles, ...viewOnlyColStyles]);

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('flexDirection')) continue;

    // Check if this flexDirection is inside a style we should keep (non-View styles)
    // Look backwards for the style name
    let isInNonViewStyle = false;
    for (let j = i; j >= Math.max(0, i - 10); j--) {
      const nameMatch = lines[j].match(/^\s+(\w+)\s*:\s*\{/);
      if (nameMatch) {
        if (nonViewStyles.has(nameMatch[1])) {
          isInNonViewStyle = true;
        }
        break;
      }
    }
    if (isInNonViewStyle) continue;

    // Also skip inline flexDirection in non-View elements
    if (lines[i].includes('flexDirection') && !/<View\b/.test(lines[i]) && !/<Row\b/.test(lines[i]) && !/<Column\b/.test(lines[i])) {
      // Check if this is inside a JSX attribute of a non-View element
      // This is for inline styles on Clickable, etc.
      const isStyleSheet = /^\s+\w+\s*:\s*\{/.test(lines[i]) || /^\s+flexDirection/.test(lines[i]);
      const isInlineOnNonView = !isStyleSheet && (
        // Look back to see if we're inside a <Clickable or <SurfaceCard etc style={{
        (() => {
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            if (/<(Clickable|SurfaceCard|Pressable|Animated\.View)\b/.test(lines[j])) return true;
            if (/<View\b/.test(lines[j]) || /<Row\b/.test(lines[j]) || /<Column\b/.test(lines[j])) return false;
          }
          return false;
        })()
      );
      if (isInlineOnNonView) continue;
    }

    // Multi-line: entire line is just flexDirection prop
    if (/^\s+flexDirection\s*:\s*'(?:row|column)'\s*,?\s*$/.test(lines[i])) {
      lines.splice(i, 1);
      i--;
      continue;
    }

    // Single-line: remove flexDirection from within the style object
    lines[i] = lines[i].replace(/flexDirection\s*:\s*'(?:row|column)'\s*,\s*/g, '');
    lines[i] = lines[i].replace(/,\s*flexDirection\s*:\s*'(?:row|column)'/g, '');
    lines[i] = lines[i].replace(/flexDirection\s*:\s*'(?:row|column)'/g, '');

    // Clean up artifacts
    lines[i] = lines[i].replace(/\{\s*,/g, '{ ');
    lines[i] = lines[i].replace(/,\s*\}/g, ' }');
    lines[i] = lines[i].replace(/,\s*,/g, ',');
  }

  // ═══ PHASE 5: Fix closing tags (v2 — handles multi-line JSX) ═══

  if (reps > 0) {
    fixClosingTagsV2(lines);
  }

  // ═══ PHASE 6: Fix imports ═══

  if (needsRow || needsColumn) {
    fixImports(lines, needsRow, needsColumn);
  }

  // ═══ Write ═══

  const result = lines.join('\n');
  if (result !== original) {
    fs.writeFileSync(filePath, result, 'utf8');
    stats.modified++;
    stats.replacements += reps;
    const rel = path.relative(BASE, filePath);
    console.log(`  ✓ ${rel} (${reps} replacements)`);
  }
}

// ── Import fixer ────────────────────────────────────────────────────────────

function fixImports(lines, needsRow, needsColumn) {
  const needed = [];
  if (needsRow) needed.push('Row');
  if (needsColumn) needed.push('Column');

  let primitivesLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("from '@/components/primitives'") ||
        lines[i].includes('from "@/components/primitives"')) {
      primitivesLine = i;
      break;
    }
  }

  if (primitivesLine >= 0) {
    for (const name of needed) {
      if (!lines[primitivesLine].includes(name)) {
        lines[primitivesLine] = lines[primitivesLine].replace(
          /\}\s*from/,
          `, ${name} } from`
        );
      }
    }
  } else {
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) lastImport = i;
    }

    const importLine = `import { ${needed.join(', ')} } from '@/components/primitives';`;
    if (lastImport >= 0) {
      let insertAt = lastImport;
      while (insertAt < lines.length - 1 && !lines[insertAt].includes(';') && !lines[insertAt].includes("from '")) {
        insertAt++;
      }
      lines.splice(insertAt + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

const files = BROKEN_FILES.map(f => path.join(BASE, f)).filter(f => fs.existsSync(f));
console.log(`\nSprint 8 Agent 3 v2: Re-processing ${files.length} files with fixed closing tag handler...\n`);

for (const f of files) {
  try {
    processFile(f);
  } catch (err) {
    stats.errors.push(`${path.relative(BASE, f)}: ${err.message}`);
  }
}

console.log(`\n─── Summary ───`);
console.log(`Files scanned:  ${stats.files}`);
console.log(`Files modified: ${stats.modified}`);
console.log(`Replacements:   ${stats.replacements}`);
if (stats.errors.length) {
  console.log(`Errors (${stats.errors.length}):`);
  stats.errors.forEach(e => console.log(`  ✗ ${e}`));
}
console.log('');

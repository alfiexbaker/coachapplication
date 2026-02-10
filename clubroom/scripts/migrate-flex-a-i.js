#!/usr/bin/env node
/**
 * Sprint 8 Agent 3: flexDirection → Row/Column migration
 * Processes component files in directories A-I.
 *
 * What it does:
 * 1. Finds StyleSheet entries with flexDirection: 'row'|'column'
 * 2. Removes flexDirection from the style
 * 3. Replaces <View style={styles.NAME}> with <Row style={styles.NAME}> (or Column)
 * 4. Handles inline styles: <View style={{ flexDirection: 'row', ... }}>
 * 5. Fixes closing tags using stack-based matching
 * 6. Adds Row/Column imports
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'components');
const DIRS = [
  'academy', 'admin', 'analytics', 'athlete', 'auth', 'availability',
  'badges', 'booking', 'bookings', 'calendar', 'celebrations', 'child',
  'club', 'coach', 'community', 'compare', 'consent', 'development',
  'discover', 'drills', 'earnings', 'event', 'family', 'favourites',
  'forms', 'goals', 'group', 'health', 'invite',
];

const stats = { files: 0, modified: 0, replacements: 0, errors: [] };

// ── File discovery ──────────────────────────────────────────────────────────

function getFiles() {
  const files = [];
  for (const dir of DIRS) {
    const p = path.join(BASE, dir);
    if (!fs.existsSync(p)) continue;
    for (const f of fs.readdirSync(p)) {
      if (f.endsWith('.tsx')) files.push(path.join(p, f));
    }
  }
  return files;
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

  // Single-line StyleSheet entries: `name: { ... flexDirection: 'row' ... }`
  for (const line of lines) {
    const m = line.match(/^\s+(\w+)\s*:\s*\{[^}]*?flexDirection\s*:\s*'(row|column)'/);
    if (m) {
      if (m[2] === 'row') rowStyles.add(m[1]);
      else colStyles.add(m[1]);
    }
  }

  // Multi-line: flexDirection on its own line — look backwards for style name
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

  // ═══ PHASE 2: Identify inline flexDirection Views ═══

  const inlineRows = new Set();
  const inlineCols = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match <View with inline flexDirection (not Animated.View)
    if (/<View\b/.test(line) && !line.includes('Animated.View') && line.includes('flexDirection')) {
      if (line.includes("'row'")) inlineRows.add(i);
      else if (line.includes("'column'")) inlineCols.add(i);
    }
  }

  // ═══ PHASE 3: Replace opening <View> tags ═══

  // StyleSheet-based rows
  for (const name of rowStyles) {
    const styleRe = new RegExp('styles\\.' + name + '\\b');
    for (let i = 0; i < lines.length; i++) {
      if (/<View\b/.test(lines[i]) && !lines[i].includes('Animated.View') && styleRe.test(lines[i])) {
        lines[i] = lines[i].replace(/<View\b/, '<Row');
        needsRow = true;
        reps++;
      }
    }
  }

  // StyleSheet-based columns
  for (const name of colStyles) {
    const styleRe = new RegExp('styles\\.' + name + '\\b');
    for (let i = 0; i < lines.length; i++) {
      if (/<View\b/.test(lines[i]) && !lines[i].includes('Animated.View') && styleRe.test(lines[i])) {
        lines[i] = lines[i].replace(/<View\b/, '<Column');
        needsColumn = true;
        reps++;
      }
    }
  }

  // Inline rows
  for (const lineNum of inlineRows) {
    if (/<View\b/.test(lines[lineNum]) && !lines[lineNum].includes('Animated.View')) {
      lines[lineNum] = lines[lineNum].replace(/<View\b/, '<Row');
      needsRow = true;
      reps++;
    }
  }

  // Inline columns
  for (const lineNum of inlineCols) {
    if (/<View\b/.test(lines[lineNum]) && !lines[lineNum].includes('Animated.View')) {
      lines[lineNum] = lines[lineNum].replace(/<View\b/, '<Column');
      needsColumn = true;
      reps++;
    }
  }

  // ═══ PHASE 4: Remove flexDirection from styles ═══

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('flexDirection')) continue;

    // Multi-line: entire line is just flexDirection prop
    if (/^\s+flexDirection\s*:\s*'(?:row|column)'\s*,?\s*$/.test(lines[i])) {
      lines.splice(i, 1);
      i--;
      continue;
    }

    // Single-line: remove flexDirection from within the style object
    // Handle: `flexDirection: 'row', ` (with trailing comma+space)
    lines[i] = lines[i].replace(/flexDirection\s*:\s*'(?:row|column)'\s*,\s*/g, '');
    // Handle: `, flexDirection: 'row'` (with leading comma, at end of props)
    lines[i] = lines[i].replace(/,\s*flexDirection\s*:\s*'(?:row|column)'/g, '');
    // Handle: `flexDirection: 'row'` (only prop — shouldn't have surrounding commas)
    lines[i] = lines[i].replace(/flexDirection\s*:\s*'(?:row|column)'/g, '');

    // Clean up artifacts
    lines[i] = lines[i].replace(/\{\s*,/g, '{ ');      // { , → {
    lines[i] = lines[i].replace(/,\s*\}/g, ' }');       // , } → }
    lines[i] = lines[i].replace(/,\s*,/g, ',');          // , , → ,
  }

  // ═══ PHASE 5: Fix closing tags via stack ═══

  if (reps > 0) {
    fixClosingTags(lines);
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

// ── Closing tag fixer (stack-based) ─────────────────────────────────────────

function fixClosingTags(lines) {
  const stack = [];
  const TAG_NAMES = ['View', 'Row', 'Column'];

  for (let i = 0; i < lines.length; i++) {
    // Process all relevant tags on this line in order
    const tagRe = /<(\/?)(View|Row|Column)\b([^>]*?)(\/?)>/g;
    let match;
    const replacements = [];

    while ((match = tagRe.exec(lines[i]))) {
      const isClosing = match[1] === '/';
      const isSelfClosing = match[4] === '/';
      const tagName = match[2];

      if (isSelfClosing) continue; // self-closing, skip

      if (!isClosing) {
        // Opening tag — push to stack
        stack.push(tagName);
      } else {
        // Closing tag — pop stack and check match
        const expected = stack.pop();
        if (expected && expected !== tagName) {
          replacements.push({ from: `</${tagName}>`, to: `</${expected}>` });
        }
      }
    }

    // Apply replacements for this line (replace first occurrence of each)
    for (const r of replacements) {
      lines[i] = lines[i].replace(r.from, r.to);
    }
  }
}

// ── Import fixer ────────────────────────────────────────────────────────────

function fixImports(lines, needsRow, needsColumn) {
  const needed = [];
  if (needsRow) needed.push('Row');
  if (needsColumn) needed.push('Column');

  // Check if there's already a primitives import
  let primitivesLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("from '@/components/primitives'") ||
        lines[i].includes('from "@/components/primitives"')) {
      primitivesLine = i;
      break;
    }
  }

  if (primitivesLine >= 0) {
    // Add missing Row/Column to existing import
    for (const name of needed) {
      if (!lines[primitivesLine].includes(name)) {
        lines[primitivesLine] = lines[primitivesLine].replace(
          /\}\s*from/,
          `, ${name} } from`
        );
      }
    }
  } else {
    // Add new import line after last existing import
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) lastImport = i;
    }

    const importLine = `import { ${needed.join(', ')} } from '@/components/primitives';`;
    if (lastImport >= 0) {
      // Find the end of the last import statement (might be multi-line)
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

const files = getFiles();
console.log(`\nSprint 8 Agent 3: flexDirection → Row/Column migration`);
console.log(`Processing ${files.length} files across ${DIRS.length} directories...\n`);

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

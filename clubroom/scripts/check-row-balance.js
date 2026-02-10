#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

const files = execSync('grep -rl "import.*Row" components/ --include="*.tsx" 2>/dev/null', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const mismatches = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const opens = (content.match(/<Row\b/g) || []).length;
  const selfCloses = (content.match(/<Row\b[^>]*\/>/g) || []).length;
  const closes = (content.match(/<\/Row>/g) || []).length;
  const net = opens - selfCloses - closes;
  if (net !== 0) {
    mismatches.push({ file: f, net, opens, selfCloses, closes });
  }
}

if (mismatches.length === 0) {
  console.log('All Row tags balanced!');
} else {
  console.log(`Found ${mismatches.length} files with Row tag mismatches:`);
  for (const m of mismatches) {
    console.log(`  MISMATCH (${m.net}): ${m.file} — opens=${m.opens} selfClose=${m.selfCloses} closes=${m.closes}`);
  }
}

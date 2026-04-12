#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { listFiles } = require('./file-scan-utils');

const files = listFiles(['components'], { extensions: ['.tsx'] }).filter((file) =>
  /\bimport\s*{[^}]*\bRow\b[^}]*}\s*from\b/.test(readFileSync(resolve(file), 'utf8')),
);
const mismatches = [];

for (const f of files) {
  const content = readFileSync(resolve(f), 'utf8');
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

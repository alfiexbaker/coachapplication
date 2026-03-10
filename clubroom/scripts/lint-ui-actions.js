#!/usr/bin/env node

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { listFiles: listFilesFromTree } = require('./file-scan-utils');

const TARGETS = ['app', 'hooks', 'components'];

const CHECKS = [
  {
    name: 'empty onPress handler',
    regex: /onPress\s*=\s*\{\s*\([^)]*\)\s*=>\s*\{\s*\}\s*\}/g,
  },
  {
    name: 'undefined onPress handler',
    regex: /onPress\s*=\s*\{\s*\([^)]*\)\s*=>\s*undefined\s*\}/g,
  },
  {
    name: 'empty onRetry handler',
    regex: /onRetry\s*=\s*\{\s*\([^)]*\)\s*=>\s*\{\s*\}\s*\}/g,
  },
  {
    name: 'native Alert usage',
    regex: /Alert\.(alert|prompt)\s*\(/g,
  },
  {
    name: 'uiFeedback.alert without explicit action buttons',
    regex: /uiFeedback\.alert\s*\(\s*[^,\n()]+(?:\([^)]*\))?\s*,\s*[^,\n()]+(?:\([^)]*\))?\s*\)/g,
  },
];

const NATIVE_ALERT_EXCEPTION_TAG = 'native-alert-exception';

function listFiles() {
  return listFilesFromTree(TARGETS, { extensions: ['.tsx'] });
}

function getLineNumber(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function run() {
  const files = listFiles();
  const failures = [];

  for (const file of files) {
    const fullPath = resolve(file);
    const source = readFileSync(fullPath, 'utf8');

    for (const check of CHECKS) {
      check.regex.lastIndex = 0;
      let match = check.regex.exec(source);
      while (match) {
        if (check.name === 'native Alert usage') {
          const line = getLineNumber(source, match.index);
          const lineText = source.split('\n')[line - 1] || '';
          if (lineText.includes(NATIVE_ALERT_EXCEPTION_TAG)) {
            match = check.regex.exec(source);
            continue;
          }
        }

        failures.push({
          file,
          line: getLineNumber(source, match.index),
          rule: check.name,
        });
        match = check.regex.exec(source);
      }
    }
  }

  if (failures.length > 0) {
    console.error('UI action lint failed. Remove dead action handlers:');
    for (const failure of failures) {
      console.error(`- ${failure.file}:${failure.line} (${failure.rule})`);
    }
    process.exit(1);
  }

  console.log('UI action lint passed.');
}

run();

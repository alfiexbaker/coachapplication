#!/usr/bin/env node

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { listFiles } = require('./file-scan-utils');

const TARGETS = ['app', 'hooks', 'components'];
const FILES = listFiles(TARGETS, { extensions: ['.ts', '.tsx'] });

function countMatches(regex) {
  let total = 0;

  for (const file of FILES) {
    const source = readFileSync(resolve(file), 'utf8');
    regex.lastIndex = 0;
    let match = regex.exec(source);
    while (match) {
      total += 1;
      match = regex.exec(source);
    }
  }

  return total;
}

const nativeAlerts = countMatches(/Alert\.(alert|prompt)\s*\(/g);
const chooseCount = countMatches(/uiFeedback\.choose\s*\(/g);
const alertCount = countMatches(/uiFeedback\.alert\s*\(/g);
const toastCount = countMatches(/uiFeedback\.showToast\s*\(/g);

console.log('Alert Usage Audit');
console.log('=================');
console.log(`Native Alert calls      : ${nativeAlerts}`);
console.log(`uiFeedback.alert calls  : ${alertCount}`);
console.log(`uiFeedback.choose calls : ${chooseCount}`);
console.log(`uiFeedback.showToast    : ${toastCount}`);

if (nativeAlerts > 0) {
  console.error('\nFail: native Alert usage still present in app/hooks/components.');
  process.exit(1);
}

console.log('\nPass: no native Alert usage detected.');

#!/usr/bin/env node

const { execSync } = require('node:child_process');

function runCount(command) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return Number.parseInt(output, 10) || 0;
  } catch {
    return 0;
  }
}

const nativeAlerts = runCount(
  `rg -n "Alert\\\\.(alert|prompt)" app hooks components | wc -l | tr -d ' '`,
);
const promptCount = runCount(`rg -n "uiFeedback\\\\.prompt\\(" app hooks components | wc -l | tr -d ' '`);
const alertCount = runCount(`rg -n "uiFeedback\\\\.alert\\(" app hooks components | wc -l | tr -d ' '`);
const toastCount = runCount(`rg -n "uiFeedback\\\\.showToast\\(" app hooks components | wc -l | tr -d ' '`);

console.log('Alert Usage Audit');
console.log('=================');
console.log(`Native Alert calls      : ${nativeAlerts}`);
console.log(`uiFeedback.alert calls  : ${alertCount}`);
console.log(`uiFeedback.prompt calls : ${promptCount}`);
console.log(`uiFeedback.showToast    : ${toastCount}`);

if (nativeAlerts > 0) {
  console.error('\nFail: native Alert usage still present in app/hooks/components.');
  process.exit(1);
}

console.log('\nPass: no native Alert usage detected.');


import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('chat screen keeps simulated replies mock-only', () => {
  const source = readSource('app/chat/[threadId].tsx');
  const sendStart = source.indexOf('const handleSend = async');
  const mockGuard = source.indexOf('thread?.id && apiClient.isMockMode', sendStart);
  const simulatedReply = source.indexOf('.simulateIncoming(', sendStart);

  assert.ok(sendStart >= 0, 'test should find chat send handler');
  assert.ok(mockGuard >= 0, 'simulated replies must be guarded by mock mode');
  assert.ok(simulatedReply >= 0, 'test should find simulated reply call');
  assert.ok(mockGuard < simulatedReply, 'API mode must not schedule simulated incoming messages');
});

test('direct messaging mock helpers fail closed before local message writes in API mode', () => {
  const source = readSource('services/messaging-service.ts');

  const simulateStart = source.indexOf('async simulateIncoming(');
  const simulateGuard = source.indexOf('if (!USE_MOCK)', simulateStart);
  const simulateWrite = source.indexOf(
    'await this.persistMessage(threadId, incoming)',
    simulateStart,
  );

  assert.ok(simulateStart >= 0, 'test should find simulateIncoming');
  assert.ok(simulateGuard >= 0, 'simulateIncoming must guard API mode');
  assert.ok(simulateWrite >= 0, 'test should find simulated message write');
  assert.ok(simulateGuard < simulateWrite, 'API mode must reject before simulated message writes');

  const markReadStart = source.indexOf('async markThreadRead(');
  const markReadEnd = source.indexOf('async deleteMessage(', markReadStart);
  const markReadGuard = source.indexOf('if (!USE_MOCK)', markReadStart);
  const apiReadCall = source.indexOf(
    'communityMediaAuthorityService.markThreadMessagesRead(threadId)',
    markReadStart,
  );
  const markReadBody = source.slice(markReadStart, markReadEnd);

  assert.ok(markReadStart >= 0, 'test should find markThreadRead');
  assert.ok(markReadEnd > markReadStart, 'test should isolate markThreadRead body');
  assert.ok(markReadGuard >= 0, 'markThreadRead must guard API mode');
  assert.ok(apiReadCall >= 0, 'API mode must use backend-owned direct read receipts');
  assert.ok(markReadGuard < apiReadCall, 'API mode must call backend before clearing read state');
  assert.equal(
    markReadBody.includes('setLocalOverlayValue(STORAGE_KEYS.MESSAGES'),
    false,
    'markThreadRead must not write local message read state',
  );
});

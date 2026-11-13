import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closureBlocker, validateSignature } from '@/lib/issue-workflow-rules';

test('closing needs at least one requirement', () => {
  assert.match(closureBlocker({ recommendations: [] }), /at least one requirement/);
});

test('closing is blocked while any requirement is open', () => {
  const issue = {
    recommendations: [{ requirements: [{ status: 'closed' }, { status: 'open' }, { status: 'open' }] }],
  };
  assert.match(closureBlocker(issue), /2 requirements are still open/);
});

test('closing is allowed once every requirement is closed', () => {
  const issue = {
    recommendations: [{ requirements: [{ status: 'closed' }] }, { requirements: [{ status: 'closed' }] }],
  };
  assert.equal(closureBlocker(issue), null);
});

test('sign-off needs a real name', () => {
  assert.ok(validateSignature('  ').error);
  assert.ok(validateSignature('Al').error);
  assert.deepEqual(validateSignature('  Amanda   Perera '), { name: 'Amanda Perera', error: null });
});

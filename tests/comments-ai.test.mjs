import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractMentions, validateComment } from '@/lib/comment-rules';
import { normaliseClassification, normaliseRecommendations, parseModelJson } from '@/lib/ai-suggestion-rules';

test('extractMentions finds names after @ and stops at punctuation', () => {
  assert.deepEqual(extractMentions('Thanks @amanda.perera, can you check? cc @ann_lee'), [
    'amanda.perera',
    'ann_lee',
  ]);
  assert.deepEqual(extractMentions('no mentions here'), []);
  assert.deepEqual(extractMentions('@Ann and @Ann'), ['Ann']);
});

test('validateComment rejects empty and oversized bodies', () => {
  assert.ok(validateComment('   ').error);
  assert.ok(validateComment('x'.repeat(2001)).error);
  assert.equal(validateComment('  ok  ').body, 'ok');
});

test('parseModelJson pulls the object out of a reply with extra text', () => {
  const reply = 'Sure!\n```json\n{"issueType":"safety"}\n```';
  assert.deepEqual(parseModelJson(reply), { issueType: 'safety' });
  assert.equal(parseModelJson('no json at all'), null);
  assert.equal(parseModelJson('{broken'), null);
});

test('normaliseRecommendations caps count and drops empty items', () => {
  const out = normaliseRecommendations({
    recommendations: [
      { text: 'A', requirements: ['r1', '', 'r2'] },
      { text: '   ' },
      { text: 'B' },
      { text: 'C' },
      { text: 'D' },
    ],
  });
  assert.equal(out.length, 3);
  assert.deepEqual(out[0].requirements, ['r1', 'r2']);
});

test('normaliseClassification only keeps known types and project attribute names', () => {
  const out = normaliseClassification(
    { issueType: 'SAFETY', hfAttributes: ['Operator error', 'Invented', 'operator ERROR'] },
    ['Operator error'],
  );
  assert.equal(out.issueType, 'safety');
  assert.deepEqual(out.hfAttributes, ['Operator error']);
  assert.equal(normaliseClassification({ issueType: 'bogus' }, []).issueType, null);
});

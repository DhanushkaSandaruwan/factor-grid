import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchPerson, personKeys } from '@/lib/mention-match';

const ann = { userId: 'u_ann', firstName: 'Ann', lastName: 'Lee', email: 'ann.lee@example.com' };
const amanda = { userId: 'u_amanda', firstName: 'Amanda', lastName: 'Perera', email: 'a@example.com' };
const people = [ann, amanda];

test('personKeys covers common spellings of a name and email', () => {
  const keys = personKeys(ann);
  for (const k of ['ann.lee', 'annlee', 'ann_lee', 'ann-lee', 'ann', 'ann.lee@example.com', 'ann.lee']) {
    assert.ok(keys.has(k), k);
  }
});

test('matchPerson finds a person by name, mention or email', () => {
  assert.equal(matchPerson('@ann_lee'.slice(1), people).userId, 'u_ann');
  assert.equal(matchPerson('Amanda Perera', people).userId, 'u_amanda');
  assert.equal(matchPerson('a@example.com', people).userId, 'u_amanda');
  assert.equal(matchPerson('AMANDA', people).userId, 'u_amanda');
});

test('an unknown name matches nobody', () => {
  assert.equal(matchPerson('Zoe', people), null);
  assert.equal(matchPerson('', people), null);
});

test('an ambiguous name matches nobody rather than the wrong person', () => {
  const twins = [
    { userId: 'u1', firstName: 'Sam', lastName: 'Kim', email: 'sam1@x.io' },
    { userId: 'u2', firstName: 'Sam', lastName: 'Lee', email: 'sam2@x.io' },
  ];
  assert.equal(matchPerson('Sam', twins), null);
  assert.equal(matchPerson('Sam Kim', twins).userId, 'u1');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDerivedHfAttribute,
  normalizeAttributeName,
  validateCustomAttributeName,
  CUSTOM_ATTRIBUTE_MAX_LENGTH,
} from '@/lib/attribute-rules';

test('normalizeAttributeName trims and collapses whitespace', () => {
  assert.equal(normalizeAttributeName('  Human   Error '), 'Human Error');
  assert.equal(normalizeAttributeName(null), '');
});

test('validateCustomAttributeName accepts engineering-style names', () => {
  assert.equal(validateCustomAttributeName('Blast radius (m)'), null);
  assert.equal(validateCustomAttributeName('Operator-2 / shift'), null);
});

test('validateCustomAttributeName rejects empty, long and unsafe names', () => {
  assert.ok(validateCustomAttributeName(''));
  assert.ok(validateCustomAttributeName('x'.repeat(CUSTOM_ATTRIBUTE_MAX_LENGTH + 1)));
  assert.ok(validateCustomAttributeName('bad<>name'));
  assert.ok(validateCustomAttributeName('<script>'));
});

test('isDerivedHfAttribute matches the four built-in HF names case-insensitively', () => {
  assert.equal(isDerivedHfAttribute('links'), true);
  assert.equal(isDerivedHfAttribute(' Evidence '), true);
  assert.equal(isDerivedHfAttribute('Operator Error'), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTE_PRESETS, mergePreset } from '@/lib/attribute-presets';

test('every preset has a unique id and all three groups', () => {
  const ids = ATTRIBUTE_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const preset of ATTRIBUTE_PRESETS) {
    assert.ok(preset.hf.length && preset.risk.length && preset.action.length, preset.id);
  }
});

test('mergePreset selects only offered names and reports the rest', () => {
  const current = { hf: ['Links', 'Use error'], risk: [], action: ['Owner'] };
  const preset = {
    hf: ['links', 'Evidence', 'Crew workload'],
    risk: ['Severity'],
    action: ['Owner', 'Artifact Type'],
  };
  const options = { hf: ['Links', 'Evidence'], risk: ['Severity'], action: ['Owner'] };
  const { selections, missing } = mergePreset(current, preset, options);
  assert.deepEqual(selections, {
    hf: ['Links', 'Use error', 'Evidence'],
    risk: ['Severity'],
    action: ['Owner'],
  });
  assert.deepEqual(missing, ['Crew workload', 'Artifact Type']);
});

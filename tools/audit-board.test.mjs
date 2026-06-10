import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSpec, validateSpec, rankItems } from './audit-board.mjs';

function baseSpec(overrides = {}) {
  return {
    categories: ['Lead', 'Idea'],
    states: ['Spotted', 'Testing', 'Harvested'],
    completedStates: ['Harvested'],
    stateWeights: { Spotted: 2, Testing: 7, Harvested: 3 },
    metric: { min: 1, max: 10, default: 6 },
    actions: [
      { id: 'a', mode: 'advance', state: 'Testing' },
      { id: 'b', mode: 'copy', key: 'textTwo' },
    ],
    items: [
      { title: 'Alpha', category: 'Lead', state: 'Testing', score: 8, effort: 3, metric: 7, date: '2030-01-01' },
    ],
    ...overrides,
  };
}

test('shipped SPEC parses cleanly and passes all invariants', async () => {
  const spec = await loadSpec();
  const result = validateSpec(spec);
  assert.equal(result.ok, true, `unexpected issues: ${result.issues.join('; ')}`);
  assert.ok(Array.isArray(spec.items) && spec.items.length > 0, 'SPEC should ship seed items');
});

test('catches completedStates that are not declared states', () => {
  const result = validateSpec(baseSpec({ completedStates: ['Ghost'] }));
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /completedStates references unknown state "Ghost"/);
});

test('catches a missing stateWeights entry', () => {
  const result = validateSpec(baseSpec({ stateWeights: { Spotted: 2, Harvested: 3 } }));
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /stateWeights is missing an entry for state "Testing"/);
});

test('catches actions pointing at unknown states or unsupported modes', () => {
  const result = validateSpec(baseSpec({
    actions: [
      { id: 'x', mode: 'advance', state: 'Phantom' },
      { id: 'y', mode: 'teleport' },
    ],
  }));
  assert.equal(result.ok, false);
  const text = result.issues.join('\n');
  assert.match(text, /action "x" targets unknown state "Phantom"/);
  assert.match(text, /action "y" has unsupported mode "teleport"/);
});

test('catches items with unknown category, unknown state, or out-of-range numbers', () => {
  const result = validateSpec(baseSpec({
    items: [
      { title: 'Bad cat', category: 'Mystery', state: 'Testing', score: 5, effort: 5, metric: 5, date: '2030-01-01' },
      { title: 'Bad metric', category: 'Lead', state: 'Testing', score: 5, effort: 5, metric: 99, date: '2030-01-01' },
      { title: 'Bad effort', category: 'Lead', state: 'Testing', score: 5, effort: 42, metric: 5, date: '2030-01-01' },
    ],
  }));
  assert.equal(result.ok, false);
  const text = result.issues.join('\n');
  assert.match(text, /uses unknown category "Mystery"/);
  assert.match(text, /metric must be in \[1, 10\], got 99/);
  assert.match(text, /effort must be a number in \[1, 10\], got 42/);
});

test('rankItems orders items by computed priority (deterministic)', () => {
  const spec = baseSpec({
    items: [
      { title: 'Low effort, strong signal', category: 'Lead', state: 'Testing', score: 9, effort: 2, metric: 9, date: '2030-01-01' },
      { title: 'High effort, weak signal',  category: 'Lead', state: 'Spotted', score: 4, effort: 9, metric: 3, date: '2030-01-01' },
    ],
  });
  const ranked = rankItems(spec);
  assert.equal(ranked[0].title, 'Low effort, strong signal');
  assert.ok(ranked[0].priority > ranked[1].priority);
});

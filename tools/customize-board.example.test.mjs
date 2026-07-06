import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSpec, validateSpec } from './audit-board.mjs';
import { addArchivedState, fixArchivedState } from './customize-board.example.mjs';

test('adding a state without stateWeights is caught by validateSpec', async () => {
  const spec = await loadSpec();
  const result = validateSpec(addArchivedState(spec));
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /stateWeights is missing an entry for state "Archived"/);
});

test('wiring stateWeights + completedStates makes the customization pass', async () => {
  const spec = await loadSpec();
  const result = validateSpec(fixArchivedState(spec));
  assert.equal(result.ok, true, `unexpected issues: ${result.issues.join('; ')}`);
});

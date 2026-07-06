#!/usr/bin/env node
// Runnable walkthrough: the most common Signal Garden SPEC customization —
// adding a new state — has one sharp edge. Skip stateWeights/completedStates
// and nothing throws; the state just silently scores 0 priority forever.
// `node tools/audit-board.mjs` catches this before it ships. This script
// shows the broken version, then the fix, side by side.
//
// Usage: node tools/customize-board.example.mjs

import { loadSpec, validateSpec } from './audit-board.mjs';

export function addArchivedState(spec) {
  return {
    ...spec,
    states: [...spec.states, 'Archived'],
  };
}

export function fixArchivedState(spec) {
  const withState = addArchivedState(spec);
  return {
    ...withState,
    completedStates: [...withState.completedStates, 'Archived'],
    stateWeights: { ...withState.stateWeights, Archived: 0 },
  };
}

async function main() {
  const spec = await loadSpec();

  console.log('Adding an "Archived" state without wiring it up...');
  const broken = validateSpec(addArchivedState(spec));
  console.log(broken.ok ? '  (unexpectedly passed)' : `  caught: ${broken.issues.join('; ')}`);

  console.log('\nWiring up stateWeights + completedStates for "Archived"...');
  const fixed = validateSpec(fixArchivedState(spec));
  console.log(fixed.ok ? '  OK — customization is safe to ship.' : `  still broken: ${fixed.issues.join('; ')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

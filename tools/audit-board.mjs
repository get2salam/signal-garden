#!/usr/bin/env node
// Offline audit for the Signal Garden SPEC.
//
// Loads SPEC from js/main.js without a browser, checks the invariants the UI
// silently depends on (e.g. completedStates ⊆ states, stateWeights covers every
// state, actions reference valid states, items use known categories/states),
// and prints a deterministic priority ranking for the seed items so changes
// to the scoring rules show up as a reviewable diff.
//
// Usage: node tools/audit-board.mjs [path/to/main.js]

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE = resolve(HERE, '..', 'js', 'main.js');

export async function loadSpec(sourcePath = DEFAULT_SOURCE) {
  const text = await readFile(sourcePath, 'utf8');
  const marker = 'const SPEC = ';
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`could not locate SPEC literal in ${sourcePath}`);
  let depth = 0;
  let end = -1;
  for (let i = start + marker.length; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) throw new Error('SPEC literal is not balanced');
  return vm.runInNewContext(`(${text.slice(start + marker.length, end)})`);
}

export function validateSpec(spec) {
  const issues = [];
  const push = (msg) => issues.push(msg);

  const categories = new Set(spec.categories || []);
  const states = new Set(spec.states || []);
  if (categories.size === 0) push('categories must list at least one entry');
  if (states.size === 0) push('states must list at least one entry');

  for (const state of spec.completedStates || []) {
    if (!states.has(state)) push(`completedStates references unknown state "${state}"`);
  }

  const weights = spec.stateWeights || {};
  for (const state of states) {
    if (!Object.prototype.hasOwnProperty.call(weights, state)) {
      push(`stateWeights is missing an entry for state "${state}"`);
    }
  }
  for (const state of Object.keys(weights)) {
    if (!states.has(state)) push(`stateWeights references unknown state "${state}"`);
  }

  for (const action of spec.actions || []) {
    if (action.state && !states.has(action.state)) {
      push(`action "${action.id}" targets unknown state "${action.state}"`);
    }
    if (!['advance', 'copy'].includes(action.mode)) {
      push(`action "${action.id}" has unsupported mode "${action.mode}"`);
    }
  }

  const metric = spec.metric || {};
  if (!(metric.min <= metric.max)) push('metric.min must be ≤ metric.max');
  if (metric.default != null && (metric.default < metric.min || metric.default > metric.max)) {
    push(`metric.default ${metric.default} is outside [${metric.min}, ${metric.max}]`);
  }

  (spec.items || []).forEach((item, index) => {
    const where = `items[${index}] (${item.title || 'untitled'})`;
    if (!categories.has(item.category)) push(`${where} uses unknown category "${item.category}"`);
    if (!states.has(item.state)) push(`${where} uses unknown state "${item.state}"`);
    for (const field of ['score', 'effort']) {
      const value = item[field];
      if (typeof value !== 'number' || value < 1 || value > 10) {
        push(`${where} ${field} must be a number in [1, 10], got ${value}`);
      }
    }
    if (typeof item.metric !== 'number' || item.metric < metric.min || item.metric > metric.max) {
      push(`${where} metric must be in [${metric.min}, ${metric.max}], got ${item.metric}`);
    }
  });

  return { ok: issues.length === 0, issues };
}

export function rankItems(spec) {
  const completed = new Set(spec.completedStates || []);
  const weights = spec.stateWeights || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = (iso) => {
    if (!iso) return 999;
    const target = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(target.getTime())) return 999;
    return Math.round((target - today) / 86400000);
  };
  return [...(spec.items || [])]
    .map((item) => {
      const dueBoost = completed.has(item.state) ? 0 : Math.max(0, 4 - Math.max(daysUntil(item.date), 0)) * 4;
      const priority = item.score * 6 + item.metric * 5 + dueBoost + (weights[item.state] ?? 0) - item.effort * 4;
      return { title: item.title, state: item.state, category: item.category, priority };
    })
    .sort((a, b) => b.priority - a.priority);
}

async function main() {
  const sourcePath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_SOURCE;
  const spec = await loadSpec(sourcePath);
  const report = validateSpec(spec);
  console.log(`Signal Garden board audit — source: ${sourcePath}`);
  console.log(`States: ${spec.states.join(', ')}`);
  console.log(`Categories: ${spec.categories.join(', ')}`);
  if (!report.ok) {
    console.error(`\nFound ${report.issues.length} issue(s):`);
    for (const issue of report.issues) console.error(`  • ${issue}`);
    process.exit(1);
  }
  console.log('\nInvariants OK. Seed priority ranking:');
  for (const row of rankItems(spec)) {
    console.log(`  [${String(row.priority).padStart(3)}] ${row.title} — ${row.category} · ${row.state}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

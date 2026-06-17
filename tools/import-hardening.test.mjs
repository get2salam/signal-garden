import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

function makeElement() {
  return {
    value: '',
    innerHTML: '',
    textContent: '',
    dataset: {},
    className: '',
    classList: { add() {}, remove() {} },
    style: {},
    files: [],
    appendChild() {},
    remove() {},
    click() {},
    focus() {},
    blur() {},
    select() {},
    contains() { return false; },
    querySelector() { return makeElement(); },
    setAttribute() {},
    setSelectionRange() {},
    closest() { return null; },
  };
}

async function bootApp() {
  const source = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
  const saved = new Map();
  const context = {
    console: { warn() {}, error() {}, log() {} },
    navigator: { clipboard: { writeText: async () => {} } },
    window: { prompt() {} },
    Blob: class Blob {},
    URL: { createObjectURL: () => 'blob:mock', revokeObjectURL() {} },
    requestAnimationFrame: (fn) => fn(),
    setTimeout: (fn) => { fn(); return 0; },
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value),
    },
    document: {
      body: { appendChild() {} },
      activeElement: null,
      createElement: () => makeElement(),
      querySelector: () => makeElement(),
      addEventListener() {},
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'js/main.js' });
  return { context, saved };
}

test('importState rejects oversized or malformed backup payloads', async () => {
  const { context } = await bootApp();
  await assert.rejects(
    context.importState({ size: 300 * 1024, text: async () => '{}' }),
    /backup is too large/,
  );
  await assert.rejects(
    context.importState({ size: 32, text: async () => JSON.stringify({ items: new Array(101).fill({}) }) }),
    /too many items/,
  );
  await assert.rejects(
    context.importState({ size: 32, text: async () => JSON.stringify({ items: ['bad'] }) }),
    /items must be objects/,
  );
});

test('importState normalizes untrusted fields before persistence', async () => {
  const { context, saved } = await bootApp();
  await context.importState({
    size: 512,
    text: async () => JSON.stringify({
      boardTitle: '<svg onload=alert(1)>',
      items: [{ title: '  <img src=x onerror=1>  ', note: 'ok\u0000note', score: 'NaN', effort: 99, metric: -5, date: 'not-a-date' }],
      ui: { search: 'x'.repeat(200), category: 'Ghost', status: 'Phantom', selectedId: '<bad>' },
    }),
  });
  const stored = JSON.parse([...saved.values()].at(-1));
  assert.equal(stored.items.length, 1);
  assert.equal(stored.items[0].title, '<img src=x onerror=1>');
  assert.equal(stored.items[0].note, 'ok note');
  assert.equal(stored.items[0].score, 1);
  assert.equal(stored.items[0].effort, 10);
  assert.equal(stored.items[0].metric, 1);
  assert.match(stored.items[0].date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(stored.ui.search.length, 80);
  assert.equal(stored.ui.category, 'all');
  assert.equal(stored.ui.status, 'all');
});

test('editor updates reject forged category, state, and date values', async () => {
  const { context, saved } = await bootApp();

  context.updateSelected('category', 'Ghost');
  context.updateSelected('state', 'Phantom');
  context.updateSelected('date', 'not-a-date');

  const stored = JSON.parse([...saved.values()].at(-1));
  assert.equal(stored.items[0].category, 'Lead');
  assert.equal(stored.items[0].state, 'Testing');
  assert.equal(stored.items[0].date, '2026-04-25');
});

test('editor updates still accept valid controlled values', async () => {
  const { context, saved } = await bootApp();

  context.updateSelected('category', 'Experiment');
  context.updateSelected('state', 'Nurturing');
  context.updateSelected('date', '2026-05-01');

  const stored = JSON.parse([...saved.values()].at(-1));
  assert.equal(stored.items[0].category, 'Experiment');
  assert.equal(stored.items[0].state, 'Nurturing');
  assert.equal(stored.items[0].date, '2026-05-01');
});

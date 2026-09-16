import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const bridgeSource = await readFile(new URL('./bridge.js', import.meta.url), 'utf8');
const bootstrapSource = await readFile(new URL('./bootstrap.js', import.meta.url), 'utf8');
const scope = vm.createContext({ URL });
vm.runInContext(bridgeSource, scope);
const bridge = scope.GrapePaperBridge;
const plain = value => JSON.parse(JSON.stringify(value));

test('transfer allowlist excludes local paths, library keys, keys and unrelated metadata', () => {
  const payload = bridge.createPayload({
    text: ' Selected passage 引文 ',
    position: { pageIndex: 4, rects: [[1, 2, 3, 4]] },
    key: 'PRIVATEKEY',
  }, { title: 'Example paper', doi: '10.1234/example', path: '/private/file.pdf', key: 'ITEMKEY' });
  assert.deepEqual(plain(payload), {
    version: 1, source: 'zotero', selection: { text: 'Selected passage 引文', page: 5 },
    document: { title: 'Example paper', doi: '10.1234/example' },
  });
  payload.document.id = 'LOCALKEY';
  payload.apiKey = 'SECRET';
  const url = new URL(bridge.createURL('https://reader.example/app/', payload));
  assert.equal(url.search, '');
  assert.equal(url.pathname, '/app/');
  assert.deepEqual(JSON.parse(decodeURIComponent(url.hash.slice('#grapepaper='.length))), {
    version: 1, source: 'zotero', selection: { text: 'Selected passage 引文', page: 5 },
    document: { title: 'Example paper', doi: '10.1234/example' },
  });
});

test('only HTTPS and exact loopback HTTP destinations are allowed', () => {
  for (const url of ['http://localhost:5173/', 'http://127.0.0.1:5173/', 'http://[::1]:5173/', 'https://reader.example/']) {
    assert.equal(bridge.validateAppURL(url), url);
  }
  for (const url of ['javascript:alert(1)', 'file:///private/file', 'https://user:pass@example.org/', 'http://localhost.evil.example/', 'http://192.168.1.2/', 'https://example.org/?token=secret', 'https://example.org/#fragment', 'not a URL']) {
    assert.throws(() => bridge.validateAppURL(url));
  }
});

test('missing and malformed PDF positions never invent a page', () => {
  for (const position of [undefined, '{', { pageIndex: -1 }, { pageIndex: 1.5 }, { pageIndex: '3' }]) {
    assert.deepEqual(plain(bridge.createPayload({ text: 'Example', position }).selection), { text: 'Example' });
  }
  assert.equal(bridge.createPayload({ text: 'Example', position: '{"pageIndex":0}' }).selection.page, 1);
});

test('empty and overlong selections are rejected, not silently shortened', () => {
  assert.throws(() => bridge.createPayload({ text: '   ' }), /Select a passage/);
  assert.throws(() => bridge.createPayload({ text: 'a'.repeat(4001) }), /shorter passage/);
  const payload = bridge.createPayload({ text: '引'.repeat(4000) });
  assert.throws(() => bridge.createURL(bridge.DEFAULT_APP_URL, payload), /too long/);
});

async function pluginHarness(appURL = 'http://localhost:5173/') {
  const calls = { launches: [], alerts: [], registrations: [], unregisters: [], pane: null, itemReads: [] };
  const buttons = [];
  const items = new Map([
    [1, { parentItemID: 2, getField: () => 'Attachment' }],
    [2, { getField: name => ({ title: 'Public Example Paper', DOI: '10.1234/example' })[name] }],
  ]);
  const context = vm.createContext({
    URL,
    Services: { scriptloader: { loadSubScript(_uri, target) { vm.runInNewContext(bridgeSource, target); } } },
    Zotero: {
      Reader: {
        registerEventListener(...args) { calls.registrations.push(args); },
        unregisterEventListener(...args) { calls.unregisters.push(args); },
      },
      PreferencePanes: { register(value) { calls.pane = value; return 'grapepaper-pane'; }, unregister() { calls.pane = null; } },
      Items: { get(id) { calls.itemReads.push(id); return items.get(id); } },
      Prefs: { get: () => appURL },
      launchURL: value => calls.launches.push(value),
      alert: (_window, _title, message) => calls.alerts.push(message),
      getMainWindow: () => ({}),
    },
  });
  const doc = {
    createElement() {
      const handlers = {};
      const button = {
        isConnected: true,
        setAttribute() {},
        addEventListener(name, handler) { handlers[name] = handler; },
        remove() { this.isConnected = false; },
        click() { handlers.click({ preventDefault() {}, stopPropagation() {} }); },
      };
      buttons.push(button);
      return button;
    },
  };
  vm.runInContext(bootstrapSource, context);
  await context.startup({ id: 'grapepaper@example.org', rootURI: 'file:///plugin/' });
  const handler = calls.registrations[0][1];
  const event = { reader: { itemID: 1 }, doc, params: { annotation: { text: 'Selected text', position: { pageIndex: 2 } } }, append() {} };
  return { context, calls, buttons, handler, event };
}

test('popup render is synchronous and does not inspect metadata or launch until click', async () => {
  const harness = await pluginHarness();
  let appended = false;
  harness.event.append = () => { appended = true; };
  harness.handler(harness.event);
  assert.equal(appended, true);
  assert.equal(harness.calls.launches.length, 0);
  assert.equal(harness.calls.itemReads.length, 0);
  harness.buttons[0].click();
  assert.equal(harness.calls.launches.length, 1);
  const payload = JSON.parse(decodeURIComponent(new URL(harness.calls.launches[0]).hash.slice('#grapepaper='.length)));
  assert.equal(payload.selection.page, 3);
  assert.equal(payload.document.doi, '10.1234/example');
  assert.deepEqual(Object.keys(payload.document).sort(), ['doi', 'title']);
});

test('captured selection stays stable across changed params and shutdown removes behavior', async () => {
  const harness = await pluginHarness();
  harness.handler(harness.event);
  harness.event.params.annotation.text = 'A later selection';
  harness.event.params.annotation.position.pageIndex = 99;
  harness.buttons[0].click();
  const payload = JSON.parse(decodeURIComponent(new URL(harness.calls.launches[0]).hash.slice('#grapepaper='.length)));
  assert.equal(payload.selection.text, 'Selected text');
  assert.equal(payload.selection.page, 3);
  harness.context.shutdown();
  assert.equal(harness.calls.pane, null);
  assert.equal(harness.buttons[0].isConnected, false);
  assert.equal(harness.calls.unregisters[0][1], harness.handler);
  harness.buttons[0].click();
  harness.handler(harness.event);
  assert.equal(harness.calls.launches.length, 1);
  assert.equal(harness.buttons.length, 1);
});

test('invalid configured destination reports an error without opening a page', async () => {
  const harness = await pluginHarness('http://remote.example/');
  harness.handler(harness.event);
  harness.buttons[0].click();
  assert.equal(harness.calls.launches.length, 0);
  assert.match(harness.calls.alerts[0], /HTTPS/);
});

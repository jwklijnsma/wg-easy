'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const Util = require('../lib/Util');
const ServerError = require('../lib/ServerError');

test('isValidIPv4 accepts dotted quads', () => {
  for (const ip of ['10.8.0.2', '0.0.0.0', '255.255.255.255', '192.168.1.1']) {
    assert.strictEqual(Util.isValidIPv4(ip), true, ip);
  }
});

test('isValidIPv4 rejects wrong shapes and ranges', () => {
  for (const ip of ['10.8.0', '10.8.0.2.1', '256.1.1.1', '1.1.1.-1', 'a.b.c.d', '', '10.8..2']) {
    assert.strictEqual(Util.isValidIPv4(ip), false, ip);
  }
});

// parseInt() stops at the first non-digit, so these used to pass and were
// written to wg0.conf, where wg-quick runs PostUp lines as root.
test('isValidIPv4 rejects trailing junk and config injection', () => {
  for (const ip of ['10.8.0.4x', '10.8.0.2/32', '1.2.3.4 ; reboot', '10.8.0.2\nPostUp = touch /tmp/x',
    ' 10.8.0.2', '10.8.0.2 ', '+1.2.3.4', '1e2.0.0.1', '0x1.2.3.4', '01.2.3.4']) {
    assert.strictEqual(Util.isValidIPv4(ip), false, JSON.stringify(ip));
  }
});

test('isValidIPv4 rejects non-strings', () => {
  for (const v of [undefined, null, 10, {}, ['1', '2', '3', '4']]) {
    assert.strictEqual(Util.isValidIPv4(v), false, String(v));
  }
});

function fakeRes() {
  const res = { headersSent: false, statusCode: null, body: undefined, ended: false };
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; return res; };
  res.end = () => { res.ended = true; return res; };
  return res;
}

function settle() {
  return new Promise(resolve => setImmediate(resolve));
}

test('promisify: value -> 200 JSON, undefined -> 204', async () => {
  let res = fakeRes();
  Util.promisify(async () => ({ ok: 1 }))({}, res);
  await settle();
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { ok: 1 });

  res = fakeRes();
  Util.promisify(async () => undefined)({}, res);
  await settle();
  assert.strictEqual(res.statusCode, 204);
  assert.ok(res.ended);
});

test('promisify: errors keep their status code; strings become 500', async t => {
  t.mock.method(console, 'error', () => {});
  let res = fakeRes();
  Util.promisify(async () => { throw new ServerError('nope', 404); })({}, res);
  await settle();
  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(res.body.error, 'nope');

  res = fakeRes();
  Util.promisify(async () => { throw 'plain string'; })({}, res); // eslint-disable-line no-throw-literal
  await settle();
  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(res.body.error, 'plain string');
});

test('promisify: does nothing when the handler already answered', async () => {
  const res = fakeRes();
  res.headersSent = true;
  Util.promisify(async () => ({ ignored: true }))({}, res);
  await settle();
  assert.strictEqual(res.statusCode, null);
});

test('exec runs through bash and trims; errors reject', async t => {
  t.mock.method(console, 'log', () => {});
  if (process.platform !== 'linux') return;
  assert.strictEqual(await Util.exec('echo "  hi  "; echo there'), 'hi  \nthere');
  assert.strictEqual(await Util.exec('cat <(echo bash-only)'), 'bash-only');
  await assert.rejects(Util.exec('exit 3'));
});

test('exec logs the command, or a replacement, or nothing', async t => {
  const logged = [];
  t.mock.method(console, 'log', m => logged.push(m));
  await Util.exec('true');
  await Util.exec('echo secret', { log: 'echo ***hidden***' });
  await Util.exec('true', { log: false });
  assert.deepStrictEqual(logged, ['$ true', '$ echo ***hidden***']);
});

test('ServerError carries a status code (default 500)', () => {
  assert.strictEqual(new ServerError('x').statusCode, 500);
  assert.strictEqual(new ServerError('x', 418).statusCode, 418);
  assert.ok(new ServerError('x') instanceof Error);
});

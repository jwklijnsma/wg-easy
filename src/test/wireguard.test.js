'use strict';

// WireGuard config/client management with `wg`/`wg-quick` stubbed out.
// Config files are written to a temp WG_PATH.
const fs = require('fs');
const os = require('os');
const path = require('path');

const WG_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-easy-test-'));
process.env.WG_PATH = WG_PATH;
process.env.WG_HOST = 'vpn.example.com';
process.env.WG_DEFAULT_DNS = '9.9.9.9';
process.env.WG_MTU = '1420';
process.env.WG_PERSISTENT_KEEPALIVE = '25';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

const Util = require('../lib/Util');
const WireGuard = require('../lib/WireGuard');

let calls;
let keyN;
let dump;
let upError;

beforeEach(() => {
  calls = [];
  keyN = 0;
  dump = 'serverpriv\tserverpub\t51820\toff\n';
  upError = null;
  for (const f of ['wg0.json', 'wg0.conf']) fs.rmSync(path.join(WG_PATH, f), { force: true });
  Util.exec = async cmd => {
    calls.push(cmd);
    if (cmd === 'wg genkey') return `priv${++keyN}`;
    if (cmd === 'wg genpsk') return `psk${keyN}`;
    const pub = cmd.match(/^echo (\S+) \| wg pubkey$/);
    if (pub) return pub[1].replace('priv', 'pub');
    if (cmd === 'wg show wg0 dump') return dump;
    if (cmd === 'wg-quick up wg0' && upError) throw upError;
    return '';
  };
});

const read = f => fs.readFileSync(path.join(WG_PATH, f), 'utf8');
const mode = f => fs.statSync(path.join(WG_PATH, f)).mode & 0o777;

test('first start generates server keys, writes both files and brings wg0 up', async () => {
  const wg = new WireGuard();
  const config = await wg.getConfig();
  assert.deepStrictEqual(config.server, { privateKey: 'priv1', publicKey: 'pub1', address: '10.8.0.1' });
  assert.ok(read('wg0.conf').includes('PrivateKey = priv1\nAddress = 10.8.0.1/24'));
  assert.strictEqual(mode('wg0.conf'), 0o600);
  assert.deepStrictEqual(JSON.parse(read('wg0.json')).clients, {});
  assert.ok(calls.includes('wg-quick up wg0'));
  assert.ok(calls.includes('wg syncconf wg0 <(wg-quick strip wg0)'));
  // the config is loaded once and cached
  await wg.getConfig();
  assert.strictEqual(calls.filter(c => c === 'wg-quick up wg0').length, 1);
});

test('an existing wg0.json is reused, not regenerated', async () => {
  fs.writeFileSync(path.join(WG_PATH, 'wg0.json'), JSON.stringify({
    server: { privateKey: 'kept', publicKey: 'keptpub', address: '10.8.0.1' }, clients: {},
  }));
  const config = await new WireGuard().getConfig();
  assert.strictEqual(config.server.privateKey, 'kept');
  assert.ok(!calls.includes('wg genkey'));
});

test('a missing kernel module gives a clear error', async () => {
  upError = new Error('RTNETLINK: Cannot find device "wg0"');
  await assert.rejects(new WireGuard().getConfig(), /does not support WireGuard/);
});

test('clients get the next free address, and a freed address is reused', async () => {
  const wg = new WireGuard();
  const a = await wg.createClient({ name: 'laptop' });
  const b = await wg.createClient({ name: 'phone' });
  assert.strictEqual(a.address, '10.8.0.2');
  assert.strictEqual(b.address, '10.8.0.3');
  const ids = Object.keys((await wg.getConfig()).clients);
  await wg.deleteClient({ clientId: ids[0] });
  const c = await wg.createClient({ name: 'tablet' });
  assert.strictEqual(c.address, '10.8.0.2');
});

test('a name is required', async () => {
  await assert.rejects(new WireGuard().createClient({ name: '' }), /Missing: Name/);
});

test('the address pool is .2 to .254', async () => {
  const wg = new WireGuard();
  const config = await wg.getConfig();
  for (let i = 2; i < 255; i++) config.clients[`c${i}`] = { name: `c${i}`, address: `10.8.0.${i}`, enabled: true };
  await assert.rejects(wg.createClient({ name: 'one-too-many' }), /Maximum number of clients/);
});

test('wg0.conf lists only enabled peers', async () => {
  const wg = new WireGuard();
  await wg.createClient({ name: 'on' });
  const off = await wg.createClient({ name: 'off' });
  const id = Object.entries((await wg.getConfig()).clients).find(([, c]) => c === off)[0];
  await wg.disableClient({ clientId: id });
  const conf = read('wg0.conf');
  assert.ok(conf.includes('# Client: on ('));
  assert.ok(!conf.includes('# Client: off ('));
  assert.ok(conf.includes('AllowedIPs = 10.8.0.2/32'));
  await wg.enableClient({ clientId: id });
  assert.ok(read('wg0.conf').includes('# Client: off ('));
});

test('client configuration has the endpoint, DNS, MTU and keepalive', async () => {
  const wg = new WireGuard();
  await wg.createClient({ name: 'laptop' });
  const id = Object.keys((await wg.getConfig()).clients)[0];
  const conf = await wg.getClientConfiguration({ clientId: id });
  assert.match(conf, /PrivateKey = priv2\nAddress = 10\.8\.0\.2\/24\nDNS = 9\.9\.9\.9\nMTU = 1420/);
  assert.match(conf, /PublicKey = pub1\nPresharedKey = psk2\nAllowedIPs = 0\.0\.0\.0\/0, ::\/0\nPersistentKeepalive = 25\nEndpoint = vpn\.example\.com:51820/);
  const svg = await wg.getClientQRCodeSVG({ clientId: id });
  assert.ok(svg.startsWith('<svg'));
});

test('unknown clients are a 404', async () => {
  await assert.rejects(new WireGuard().getClient({ clientId: 'nope' }), err => err.statusCode === 404);
});

test('rename and readdress; invalid addresses are a 400', async () => {
  const wg = new WireGuard();
  await wg.createClient({ name: 'old' });
  const id = Object.keys((await wg.getConfig()).clients)[0];
  await wg.updateClientName({ clientId: id, name: 'new' });
  await wg.updateClientAddress({ clientId: id, address: '10.8.0.50' });
  const client = await wg.getClient({ clientId: id });
  assert.strictEqual(client.name, 'new');
  assert.strictEqual(client.address, '10.8.0.50');
  assert.ok(read('wg0.conf').includes('AllowedIPs = 10.8.0.50/32'));
  await assert.rejects(wg.updateClientAddress({ clientId: id, address: '10.8.0.300' }), err => err.statusCode === 400);
});

test('getClients merges the live `wg show dump` stats', async () => {
  const wg = new WireGuard();
  const a = await wg.createClient({ name: 'seen' });
  await wg.createClient({ name: 'never' });
  dump += `${a.publicKey}\tpsk\t1.2.3.4:5555\t10.8.0.2/32\t1764000000\t1234\t5678\t25\n`
    + 'unknownpub\tpsk\t(none)\t10.8.0.99/32\t0\t0\t0\toff\n';
  const clients = await wg.getClients();
  const seen = clients.find(c => c.name === 'seen');
  const never = clients.find(c => c.name === 'never');
  assert.strictEqual(seen.latestHandshakeAt.toISOString(), new Date(1764000000 * 1000).toISOString());
  assert.strictEqual(seen.transferRx, 1234);
  assert.strictEqual(seen.transferTx, 5678);
  assert.strictEqual(seen.persistentKeepalive, '25');
  assert.strictEqual(never.latestHandshakeAt, null);
  assert.strictEqual(never.transferRx, null);
  assert.ok(!('privateKey' in seen));          // never sent to the browser
});

test('an address with a newline cannot inject into wg0.conf', async () => {
  const wg = new WireGuard();
  await wg.createClient({ name: 'victim' });
  const id = Object.keys((await wg.getConfig()).clients)[0];
  const before = read('wg0.conf');
  await assert.rejects(
    wg.updateClientAddress({ clientId: id, address: '10.8.0.2\nPostUp = touch /tmp/pwned' }),
    err => err.statusCode === 400,
  );
  assert.strictEqual(read('wg0.conf'), before);
  assert.ok(!read('wg0.conf').includes('pwned'));
});

// Address classification from tools/doctor.mjs (pure functions; no server required).
// Startup output shares LAN, VPN, and public addresses. Proxy TUN and virtual-machine adapters are not reachable by
// other computers, so sharing them would fail. Rule order is link-local → 198.18/15 → VPN_IF → VIRTUAL_IF → private →
// public; the first matching rule wins.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyAddresses, KIND_LABEL } from '../tools/doctor.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} name @param {string} address */
const iface = (name, address) => [name, [{ family: 'IPv4', address, internal: false }]];

describe('startup script shareable addresses (tools/doctor.mjs)', () => {
  test('lists reachable addresses only, with LAN first; virtual adapters and proxy TUNs are not public IPs', () => {
    const list = classifyAddresses(Object.fromEntries([
      iface('Mihomo', '198.18.0.1'),                    // Clash/Mihomo TUN fake-IP pool (RFC 2544)
      iface('vEthernet (Default Switch)', '172.25.112.1'),
      iface('Ethernet 5', '192.168.1.7'),
      iface('Radmin VPN', '26.200.79.213'),
      iface('Tailscale', '100.64.0.9'),
    ]));
    const kind = (ip) => list.find((a) => a.address === ip)?.kind;
    assert.equal(kind('198.18.0.1'), 'virtual', 'proxy TUN must not be shared as a public IP');
    assert.equal(kind('172.25.112.1'), 'virtual', 'Hyper-V adapter');
    assert.equal(kind('26.200.79.213'), 'vpn', 'Radmin VPN is a peer-to-peer address');
    assert.equal(kind('100.64.0.9'), 'vpn', 'Tailscale uses CGNAT space');
    assert.equal(kind('192.168.1.7'), 'lan');
    assert.equal(list[0].address, '192.168.1.7', 'LAN address sorts first');

    // launch.mjs shares only these three address kinds.
    const shareable = list.filter((a) => ['lan', 'vpn', 'public'].includes(a.kind)).map((a) => a.address);
    assert.deepEqual(shareable, ['192.168.1.7', '26.200.79.213', '100.64.0.9']);
    assert.ok(!shareable.includes('198.18.0.1'));
    assert.ok(KIND_LABEL.virtual, 'virtual adapters have a readable label');
  });

  test('classifies all of 198.18.0.0/15 as virtual (not just .0.1)', () => {
    const list = classifyAddresses(Object.fromEntries([iface('Clash', '198.19.255.254'), iface('x', '198.20.0.1')]));
    assert.equal(list.find((a) => a.address === '198.19.255.254').kind, 'virtual');
    assert.equal(list.find((a) => a.address === '198.20.0.1').kind, 'public', '198.20.0.1 is outside the /15');
  });

  test('classifies tun/tap/wg peer-to-peer adapters as VPN before applying virtual-adapter rules', () => {
    const list = classifyAddresses(Object.fromEntries([
      iface('tun0', '10.7.0.3'),
      iface('tap0', '10.7.0.5'),
      iface('wg0', '10.7.0.6'),
      iface('vEthernet (Default Switch)', '10.7.0.8'),
    ]));
    const kind = (ip) => list.find((a) => a.address === ip)?.kind;
    assert.equal(kind('10.7.0.3'), 'vpn', 'tun0 is a peer-to-peer VPN; do not add ^tun to VIRTUAL_IF');
    assert.equal(kind('10.7.0.5'), 'vpn');
    assert.equal(kind('10.7.0.6'), 'vpn');
    assert.equal(kind('10.7.0.8'), 'virtual', 'only names matched by the virtual-adapter rule are virtual');
  });

  test('records the current substring matching where macOS utunN adapters also classify as VPN', () => {
    // VPN_IF's `tun\\d` has no boundary, so macOS `utunN` names match the VPN rule first. The `utun` entry in
    // VIRTUAL_IF only applies when the name does not contain "tun" followed by a digit. These assertions document the
    // current behavior so a rule-order or regex change gets reviewed deliberately.
    const list = classifyAddresses(Object.fromEntries([iface('utun4', '10.7.0.4'), iface('utun', '10.7.0.9')]));
    const kind = (ip) => list.find((a) => a.address === ip)?.kind;
    assert.equal(kind('10.7.0.4'), 'vpn', 'utun4 contains "tun4" and matches VPN_IF first');
    assert.equal(kind('10.7.0.9'), 'virtual', 'utun without a digit matches VIRTUAL_IF');
  });

  test('uses English address labels in launcher output', () => {
    assert.deepEqual(KIND_LABEL, {
      lan: 'LAN',
      vpn: 'VPN / Tailscale / ZeroTier',
      public: 'Public IP',
      virtual: 'Virtual adapter (usually unreachable from other computers)',
      linklocal: 'Invalid address (no IP assigned)',
    });
  });

  test('setup, doctor and launcher help output is English', () => {
    const entries = [
      ['tools/setup.mjs', /Steps|Options/],
      ['tools/doctor.mjs', /read-only diagnostics/],
      ['scripts/launch.mjs', /cross-platform/],
    ];
    for (const [entry, expected] of entries) {
      const result = spawnSync(process.execPath, [resolve(ROOT, entry), '--help'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 10_000,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, `${entry} --help should succeed: ${result.stderr}`);
      assert.match(result.stdout, expected, `${entry} should show its help text`);
      assert.doesNotMatch(result.stdout + result.stderr, /[\u3400-\u4dbf\u4e00-\u9fff]/u, `${entry} should not print Chinese`);
    }
  });
});

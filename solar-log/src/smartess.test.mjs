import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sha1 from './sha1.js';
import {
  createClient, fetchProduction, hashPassword, buildActionString, pickTodayEnergy, runDiagnostics,
} from './smartess.js';

const ref = (s) => createHash('sha1').update(s, 'utf8').digest('hex');

test('sha1 matches the reference implementation', () => {
  ['', 'abc', 'pässword €', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'y'.repeat(1000)]
    .forEach((s) => assert.equal(sha1(s), ref(s)));
});

test('action string is encoded the way it is signed', () => {
  assert.equal(
    buildActionString('authSource', { usr: 'me+solar@example.com', a: 'x y', skip: null }),
    '&action=authSource&usr=me%2Bsolar%40example.com&a=x+y'
  );
});

// Fake cloud that checks every signature exactly as the real one is described to.
const fakeCloud = (password, { history = true, viaCollector = false } = {}) => {
  const calls = [];
  const fetchImpl = async (url) => {
    const m = url.match(/\?sign=([0-9a-f]{40})&salt=(\d+)(?:&token=([^&]+))?(&action=(\w+).*)$/);
    assert.ok(m, `unexpected url ${url}`);
    const [, sign, salt, token, actionString, action] = m;
    calls.push(action);
    const json = (body) => ({ json: async () => body });
    if (action === 'authSource') {
      if (sign !== ref(salt + ref(password) + actionString)) return json({ err: 16, desc: 'ERR_PASSWORD_VERIF_FAIL' });
      return json({ err: 0, dat: { token: 'TOK', secret: 'SEC', expire: 3600 } });
    }
    if (token !== 'TOK' || sign !== ref(`${salt}SECTOK${actionString}`)) return json({ err: 4, desc: 'ERR_SIGN' });
    if (action === 'queryPlants') return json({ err: 0, dat: { plant: [{ pid: 7 }] } });
    if (viaCollector) {
      // An account like the one that reported ERR_NOT_FOUND_DEVICE (258).
      if (action === 'webQueryDeviceEs') return json({ err: 258, desc: 'ERR_NOT_FOUND_DEVICE' });
      if (action === 'webQueryCollectorsEs') return json({ err: 0, dat: { collector: [{ pn: 'PN1' }] } });
      if (action === 'queryCollectorDevices') {
        assert.match(actionString, /pn=PN1/);
        return json({ err: 0, dat: { dev: [{ sn: 'SN1', devcode: 2400, devaddr: 1 }] } });
      }
      if (action === 'queryDeviceLastData') {
        assert.match(actionString, /pn=PN1&devcode=2400&devaddr=1&sn=SN1&i18n=en/);
        return json({ err: 0, dat: [
          { title: 'Load energy today', val: '30.0', unit: 'kWh' },
          { title: 'PV generation today', val: '18.2', unit: 'kWh' },
          { title: 'PV power', val: '3.1', unit: 'kW' },
        ] });
      }
      if (action === 'queryDeviceEnergyMonthPerDay') {
        return json({ err: 0, dat: { perday: [{ val: '11.0', ts: '2026-11-05 00:00:00' }] } });
      }
      return json({ err: 12, desc: 'ERR_NO_RECORD' });
    }
    if (action === 'webQueryDeviceEs') {
      return json({ err: 0, dat: { device: [{ energyToday: '12.5' }, { energyToday: 3.25 }, { status: 0 }] } });
    }
    if (action === 'queryPlantEnergyMonthPerDay' && history) {
      const month = actionString.match(/date=([\d-]+)/)[1];
      return json({ err: 0, dat: { perday: [
        { val: '9.1', ts: `${month}-01 00:00:00` }, { val: '0.0', ts: `${month}-02 00:00:00` }, { val: 'x', ts: 'bad' },
      ] } });
    }
    return json({ err: 12, desc: 'ERR_NO_RECORD' });
  };
  return { fetchImpl, calls };
};

test('logs in, signs calls and reads production', async () => {
  const cloud = fakeCloud('s3cret');
  const client = createClient({ usr: 'me@example.com', pwdHash: hashPassword('s3cret'), fetchImpl: cloud.fetchImpl });
  const result = await fetchProduction(client, ['2026-10', '2026-11']);
  assert.deepEqual(result, { today: 15.75, devices: 3, history: { '2026-10-01': 9.1, '2026-11-01': 9.1 } });
  assert.equal(cloud.calls.filter((c) => c === 'authSource').length, 1);
});

test('still returns today when history is not available', async () => {
  const cloud = fakeCloud('s3cret', { history: false });
  const client = createClient({ usr: 'me', pwdHash: hashPassword('s3cret'), fetchImpl: cloud.fetchImpl });
  assert.deepEqual(await fetchProduction(client, ['2026-11']), { today: 15.75, devices: 3, history: {} });
});

test('reports a wrong password and network failures clearly', async () => {
  const cloud = fakeCloud('s3cret');
  const bad = createClient({ usr: 'me', pwdHash: hashPassword('nope'), fetchImpl: cloud.fetchImpl });
  await assert.rejects(bad.login(), /Wrong SmartESS password/);
  const offline = createClient({ usr: 'me', pwdHash: 'x', fetchImpl: async () => { throw new Error('boom'); } });
  await assert.rejects(offline.login(), /Could not reach SmartESS/);
});

test('finds the inverter through its collector when the plant lists no devices', async () => {
  const cloud = fakeCloud('s3cret', { viaCollector: true });
  const client = createClient({ usr: 'me', pwdHash: hashPassword('s3cret'), fetchImpl: cloud.fetchImpl });
  assert.deepEqual(await fetchProduction(client, ['2026-11'], '2026-11-26'), {
    today: 18.2, devices: 1, history: { '2026-11-05': 11 },
  });
});

test('pickTodayEnergy prefers solar production over other daily counters', () => {
  assert.equal(pickTodayEnergy([{ title: 'Battery charge today', val: '4', unit: 'kWh' }]), null);
  assert.equal(pickTodayEnergy([{ title: 'Daily energy', val: '7.5', unit: 'kWh' }]), 7.5);
  assert.equal(pickTodayEnergy([{ title: 'Total PV energy', val: '900', unit: 'kWh' }]), null);
});

test('diagnostics lists raw answers without the session token', async () => {
  const cloud = fakeCloud('s3cret', { viaCollector: true });
  const client = createClient({ usr: 'me', pwdHash: hashPassword('s3cret'), fetchImpl: cloud.fetchImpl });
  const report = await runDiagnostics(client, '2026-11-26');
  assert.match(report, /ERR_NOT_FOUND_DEVICE/);
  assert.match(report, /PV generation today/);
  assert.ok(!report.includes('TOK') && !report.includes('SEC'));
});

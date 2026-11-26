// Client for the SmartESS (Eybond / DessMonitor) cloud, the service the
// WFBLE.DTU Wi-Fi stick reports to. Request signing follows the scheme used by
// the open-source ha-dessmonitor and gladys-dessmonitor clients:
//   login:  sign = sha1(salt + sha1(password) + actionString)
//   others: sign = sha1(salt + secret + token + actionString)
import sha1 from './sha1.js';
import { isValidKey, parseKwh } from './stats.js';

export const BASE_URL = 'https://api.dessmonitor.com/public/';
// App key the SmartESS app itself uses; it identifies the app, not the user.
const COMPANY_KEY = 'bnrl_frRFjEz8Mkn';
const TIMEOUT_MS = 20000;

const ERRORS = {
  4: 'SmartESS rejected the request signature.',
  10: 'SmartESS session expired. Try again.',
  16: 'Wrong SmartESS password.',
  25: 'This SmartESS account is disabled.',
  261: 'SmartESS does not know that username.',
};

const apiError = (code, message) => Object.assign(new Error(message), { code });

export const hashPassword = (password) => sha1(password);

const quotePlus = (value) =>
  encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');

export const buildActionString = (action, params = {}) =>
  `&action=${action}` +
  Object.keys(params)
    .filter((k) => params[k] !== null && params[k] !== undefined)
    .map((k) => `&${k}=${quotePlus(params[k])}`)
    .join('');

export function createClient({ usr, pwdHash, fetchImpl = fetch, now = Date.now, baseUrl = BASE_URL }) {
  let session = null;

  const request = async (url, raw = false) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller && setTimeout(() => controller.abort(), TIMEOUT_MS);
    let body;
    try {
      const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
      body = await res.json();
    } catch (e) {
      throw apiError('network', 'Could not reach SmartESS. Check your internet connection.');
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (raw) return body;
    if (!body || body.err !== 0) {
      const code = body ? body.err : '?';
      throw apiError(code, ERRORS[code] || `SmartESS error ${code}${body && body.desc ? `: ${body.desc}` : ''}`);
    }
    return body.dat || {};
  };

  const login = async () => {
    const salt = String(now());
    const actionString = buildActionString('authSource', {
      usr,
      'company-key': COMPANY_KEY,
      source: 1,
      _app_client_: 'android',
      _app_id_: 'solar-log',
      _app_version_: '1',
    });
    const sign = sha1(salt + pwdHash + actionString);
    const dat = await request(`${baseUrl}?sign=${sign}&salt=${salt}${actionString}`);
    if (!dat.token || !dat.secret) throw new Error('SmartESS login returned no session.');
    session = { token: dat.token, secret: dat.secret };
  };

  // raw = true returns the whole { err, desc, dat } answer instead of throwing.
  const call = async (action, params, raw = false) => {
    if (!session) await login();
    const salt = String(now());
    const actionString = buildActionString(action, params);
    const sign = sha1(salt + session.secret + session.token + actionString);
    return request(`${baseUrl}?sign=${sign}&salt=${salt}&token=${session.token}${actionString}`, raw);
  };

  return { login, call };
}

// Errors that mean the whole sync cannot continue; anything else just means
// "this particular query has nothing for this account".
const FATAL = ['network', 4, 10, 16, 25, 261];

const tryCall = async (client, action, params) => {
  try {
    return await client.call(action, params);
  } catch (e) {
    if (FATAL.includes(e.code)) throw e;
    return null;
  }
};

const PAGE = { page: 0, pagesize: 50 };
const deviceRef = (d, pn) => ({ pn: d.pn || pn, devcode: d.devcode, devaddr: d.devaddr, sn: d.sn });

// Accounts list their inverters in different places, so try each in turn.
async function listDevices(client, pid) {
  for (const params of [{ pid, ...PAGE }, PAGE]) {
    const dat = await tryCall(client, 'webQueryDeviceEs', params);
    if (dat && dat.device && dat.device.length) return dat.device;
  }
  const collectors =
    ((await tryCall(client, 'webQueryCollectorsEs', { pid, ...PAGE })) || {}).collector ||
    ((await tryCall(client, 'queryCollectors', PAGE)) || {}).collector ||
    [];
  const devices = [];
  for (const collector of collectors) {
    const dat = await tryCall(client, 'queryCollectorDevices', { pn: collector.pn });
    ((dat && dat.dev) || []).forEach((d) => devices.push(deviceRef(d, collector.pn)));
  }
  return devices;
}

const toPoints = (dat) => {
  if (Array.isArray(dat)) return dat;
  return Object.values(dat || {}).filter(Array.isArray).flat();
};

// Picks the "solar energy produced today" value out of a device's live data.
export const pickTodayEnergy = (points) => {
  const daily = points.filter(
    (p) => p && /kwh/i.test(String(p.unit || '')) && /today|daily|\bday\b/i.test(String(p.title || ''))
  );
  const solar = daily.find((p) => /pv|solar|generat/i.test(p.title));
  const other = daily.find((p) => !/load|grid|charg|batter|consum|output/i.test(p.title));
  const chosen = solar || other;
  return chosen ? parseKwh(chosen.val) : null;
};

const addPerDay = (history, dat) => {
  ((dat && dat.perday) || []).forEach((row) => {
    const key = String(row.ts || '').slice(0, 10);
    const kwh = parseKwh(row.val);
    if (isValidKey(key) && kwh !== null && kwh > 0) history[key] = (history[key] || 0) + kwh;
  });
};

// Reads production from the cloud.
// Returns { today: kWh | null, history: { 'YYYY-MM-DD': kWh }, devices: n }.
// `history` is a best-effort per-day backfill for the given months ('YYYY-MM');
// if the account does not offer it, history is simply empty.
export async function fetchProduction(client, months = [], todayDate = null) {
  const plants = (await client.call('queryPlants', PAGE)).plant || [];
  if (plants.length === 0) throw apiError('noplant', 'No power station found in this SmartESS account.');

  let today = null;
  let devices = 0;
  const history = {};
  const add = (kwh) => {
    if (kwh !== null) today = (today || 0) + kwh;
  };

  for (const plant of plants) {
    const list = await listDevices(client, plant.pid);
    devices += list.length;
    let plantToday = null;

    for (const device of list) {
      let kwh = parseKwh(device.energyToday);
      if (kwh === null && device.sn) {
        const dat = await tryCall(client, 'queryDeviceLastData', { ...deviceRef(device), i18n: 'en' });
        kwh = pickTodayEnergy(toPoints(dat));
      }
      if (kwh !== null) plantToday = (plantToday || 0) + kwh;
    }
    if (plantToday === null && todayDate) {
      const dat = await tryCall(client, 'queryPlantEnergyDay', { plantid: plant.pid, date: todayDate });
      plantToday = dat ? parseKwh(dat.energy) : null;
    }
    add(plantToday);

    for (const month of months) {
      const before = Object.keys(history).length;
      addPerDay(history, await tryCall(client, 'queryPlantEnergyMonthPerDay', { plantid: plant.pid, date: month }));
      if (Object.keys(history).length === before) {
        for (const device of list.filter((d) => d.sn)) {
          addPerDay(history, await tryCall(client, 'queryDeviceEnergyMonthPerDay', { ...deviceRef(device), date: month }));
        }
      }
    }
  }
  if (devices === 0 && today === null) {
    throw apiError('nodevice', 'SmartESS shows no inverter in this account yet. Run diagnostics in Settings.');
  }
  return { today, history, devices };
}

// Asks the account every question the sync relies on and returns the raw
// answers as text, so a failing setup can be worked out. No password or
// session token is included.
export async function runDiagnostics(client, todayDate) {
  const lines = [`Solar Log SmartESS diagnostics ${todayDate}`];
  const ask = async (action, params) => {
    let body;
    try {
      body = await client.call(action, params, true);
    } catch (e) {
      body = { failed: e.message };
    }
    lines.push(`\n## ${action} ${JSON.stringify(params)}\n${JSON.stringify(body).slice(0, 1500)}`);
    return (body && body.err === 0 && body.dat) || {};
  };
  const month = todayDate.slice(0, 7);
  const plants = (await ask('queryPlants', PAGE)).plant || [];
  const noPid = await ask('webQueryDeviceEs', PAGE);
  const loose = await ask('queryCollectors', PAGE);
  const refs = [];
  const seen = (dat, pn) => ((dat && (dat.device || dat.dev)) || []).forEach((d) => refs.push(deviceRef(d, pn)));
  seen(noPid);
  const pns = ((loose.collector || []).map((c) => c.pn));
  for (const plant of plants.slice(0, 2)) {
    seen(await ask('webQueryDeviceEs', { pid: plant.pid, ...PAGE }));
    ((await ask('webQueryCollectorsEs', { pid: plant.pid, ...PAGE })).collector || []).forEach((c) => pns.push(c.pn));
    await ask('queryPlantEnergyDay', { plantid: plant.pid, date: todayDate });
    await ask('queryPlantEnergyMonthPerDay', { plantid: plant.pid, date: month });
  }
  for (const pn of [...new Set(pns)].filter(Boolean).slice(0, 2)) {
    seen(await ask('queryCollectorDevices', { pn }), pn);
  }
  const device = refs.find((d) => d.sn);
  if (device) {
    await ask('queryDeviceLastData', { ...device, i18n: 'en' });
    await ask('queryDeviceEnergyDay', { ...device, date: todayDate });
    await ask('queryDeviceEnergyMonthPerDay', { ...device, date: month });
  } else {
    lines.push('\nNo device with a serial number was found.');
  }
  return lines.join('\n');
}

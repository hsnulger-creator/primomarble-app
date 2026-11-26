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

  const request = async (url) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller && setTimeout(() => controller.abort(), TIMEOUT_MS);
    let body;
    try {
      const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
      body = await res.json();
    } catch (e) {
      throw new Error('Could not reach SmartESS. Check your internet connection.');
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!body || body.err !== 0) {
      const code = body ? body.err : '?';
      throw new Error(ERRORS[code] || `SmartESS error ${code}${body && body.desc ? `: ${body.desc}` : ''}`);
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

  const call = async (action, params) => {
    if (!session) await login();
    const salt = String(now());
    const actionString = buildActionString(action, params);
    const sign = sha1(salt + session.secret + session.token + actionString);
    return request(`${baseUrl}?sign=${sign}&salt=${salt}&token=${session.token}${actionString}`);
  };

  return { login, call };
}

// Reads production from the cloud.
// Returns { today: kWh | null, history: { 'YYYY-MM-DD': kWh }, devices: n }.
// `today` is the sum of every inverter's "energy today" counter. `history` is a
// best-effort per-day backfill for the given months ('YYYY-MM'); if the account
// does not offer it, history is simply empty.
export async function fetchProduction(client, months = []) {
  const plants = (await client.call('queryPlants', { page: 0, pagesize: 50 })).plant || [];
  if (plants.length === 0) throw new Error('No power station found in this SmartESS account.');

  let today = null;
  let devices = 0;
  const history = {};

  for (const plant of plants) {
    const dat = await client.call('webQueryDeviceEs', { pid: plant.pid, page: 0, pagesize: 50 });
    (dat.device || []).forEach((device) => {
      devices++;
      const kwh = parseKwh(device.energyToday);
      if (kwh !== null) today = (today || 0) + kwh;
    });

    for (const month of months) {
      try {
        const res = await client.call('queryPlantEnergyMonthPerDay', { plantid: plant.pid, date: month });
        (res.perday || []).forEach((row) => {
          const key = String(row.ts || '').slice(0, 10);
          const kwh = parseKwh(row.val);
          if (isValidKey(key) && kwh !== null && kwh > 0) history[key] = (history[key] || 0) + kwh;
        });
      } catch (e) {
        // History is optional; today's counter above is what matters.
      }
    }
  }
  return { today, history, devices };
}

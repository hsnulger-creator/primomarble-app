// Pure date and statistics helpers. Readings are a map of 'YYYY-MM-DD' -> kWh.

const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isValidKey = (key) =>
  /^\d{4}-\d{2}-\d{2}$/.test(key) && toKey(parseKey(key)) === key;

export const todayKey = () => toKey(new Date());

export const addDays = (key, n) => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const formatDate = (key) => {
  const d = parseKey(key);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatKwh = (n) => {
  const v = Math.round(n * 10) / 10;
  return v >= 1000 ? `${(v / 1000).toFixed(2)} MWh` : `${v} kWh`;
};

// Accepts "12.5" or "12,5". Returns null when it is not a sensible reading.
export const parseKwh = (text) => {
  const n = Number(String(text).trim().replace(',', '.'));
  return String(text).trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
};

// Sum of readings with from <= date <= to (ISO keys compare as strings).
export const sumRange = (readings, from, to) =>
  Object.keys(readings).reduce(
    (total, key) => (key >= from && key <= to ? total + readings[key] : total),
    0
  );

export const summary = (readings, today = todayKey()) => {
  const keys = Object.keys(readings);
  const lifetime = keys.reduce((t, k) => t + readings[k], 0);
  let bestDay = null;
  keys.forEach((k) => {
    if (!bestDay || readings[k] > readings[bestDay]) bestDay = k;
  });
  return {
    today: today in readings ? readings[today] : null,
    last7: sumRange(readings, addDays(today, -6), today),
    month: sumRange(readings, `${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`),
    year: sumRange(readings, `${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`),
    lifetime,
    daysLogged: keys.length,
    average: keys.length ? lifetime / keys.length : 0,
    bestDay,
  };
};

// One bar per day, oldest first, ending on endKey.
export const dailySeries = (readings, endKey, days) => {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = addDays(endKey, -i);
    const d = parseKey(key);
    out.push({
      key,
      value: readings[key] || 0,
      label: days <= 7 ? WEEKDAYS[d.getDay()] : String(d.getDate()),
    });
  }
  return out;
};

// One bar per calendar month, oldest first, ending on endKey's month.
export const monthlySeries = (readings, endKey, months) => {
  const end = parseKey(endKey);
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    out.push({
      key: prefix,
      value: sumRange(readings, `${prefix}-01`, `${prefix}-31`),
      label: MONTHS[d.getMonth()],
    });
  }
  return out;
};

export const toCsv = (readings) =>
  ['date,kwh']
    .concat(Object.keys(readings).sort().map((k) => `${k},${readings[k]}`))
    .join('\n');

// Parses "YYYY-MM-DD,kWh" lines (comma, semicolon or tab separated).
// Header and unreadable lines are counted as skipped.
export const parseCsv = (text) => {
  const rows = {};
  let skipped = 0;
  String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      // With ; or tab separators a comma is a decimal point ("17,9").
      const parts = (/[;\t]/.test(line) ? line.split(/[;\t]/) : line.split(','))
        .map((p) => p.trim().replace(/^"|"$/g, ''));
      const kwh = parts.length >= 2 ? parseKwh(parts[1]) : null;
      if (isValidKey(parts[0]) && kwh !== null) rows[parts[0]] = kwh;
      else skipped++;
    });
  return { rows, skipped };
};

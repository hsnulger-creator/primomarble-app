import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, isValidKey, parseKwh, summary, dailySeries, monthlySeries, toCsv, parseCsv,
} from './stats.js';

const readings = {
  '2025-12-31': 5,
  '2026-01-01': 10,
  '2026-02-27': 4,
  '2026-02-28': 6,
  '2026-03-01': 8,
  '2026-03-07': 12.5,
};

test('date helpers', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.ok(isValidKey('2024-02-29'));
  assert.ok(!isValidKey('2026-02-30'));
  assert.ok(!isValidKey('2026-2-3'));
});

test('parseKwh', () => {
  assert.equal(parseKwh('12,5'), 12.5);
  assert.equal(parseKwh(' 0 '), 0);
  assert.equal(parseKwh(''), null);
  assert.equal(parseKwh('-1'), null);
  assert.equal(parseKwh('abc'), null);
});

test('summary', () => {
  const s = summary(readings, '2026-03-07');
  assert.equal(s.today, 12.5);
  assert.equal(s.last7, 20.5); // Mar 1 + Mar 7 (Feb 28 is 7 days back, excluded)
  assert.equal(s.month, 20.5);
  assert.equal(s.year, 40.5);
  assert.equal(s.lifetime, 45.5);
  assert.equal(s.daysLogged, 6);
  assert.equal(s.bestDay, '2026-03-07');
  assert.equal(summary(readings, '2026-03-08').today, null);
  assert.equal(summary({}, '2026-03-08').average, 0);
});

test('series', () => {
  const d = dailySeries(readings, '2026-03-01', 7);
  assert.equal(d.length, 7);
  assert.deepEqual(d.slice(-3).map((x) => x.value), [4, 6, 8]);
  assert.equal(d[6].label, 'Sun');
  const m = monthlySeries(readings, '2026-03-07', 12);
  assert.equal(m.length, 12);
  assert.deepEqual(m.slice(-4).map((x) => [x.label, x.value]), [
    ['Dec', 5], ['Jan', 10], ['Feb', 10], ['Mar', 20.5],
  ]);
});

test('csv round trip and messy input', () => {
  assert.deepEqual(parseCsv(toCsv(readings)), { rows: readings, skipped: 1 });
  const r = parseCsv('2026-06-20;17,9\r\n"2026-06-21",18.4\n\nrubbish\n2026-13-01,3');
  assert.deepEqual(r.rows, { '2026-06-20': 17.9, '2026-06-21': 18.4 });
  assert.equal(r.skipped, 2);
});

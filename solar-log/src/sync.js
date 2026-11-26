// Pulls production from SmartESS into the local log.
import { createClient, fetchProduction } from './smartess';
import { getAccount, saveAccount, getReadings, mergeReadings } from './storage';
import { todayKey, parseKey } from './stats';

export const AUTO_SYNC_MS = 15 * 60 * 1000;

const monthOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Returns the updated account, or null when no account is linked.
// Today's reading always follows the inverter; older days are only filled in
// where nothing is logged, so manual entries are never overwritten.
export async function syncNow() {
  const account = await getAccount();
  if (!account) return null;
  try {
    const today = todayKey();
    const now = parseKey(today);
    const months = [monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)), monthOf(now)];
    const result = await fetchProduction(createClient(account), months);

    const existing = await getReadings();
    const rows = {};
    Object.keys(result.history).forEach((key) => {
      if (key < today && !(key in existing)) rows[key] = Math.round(result.history[key] * 100) / 100;
    });
    if (result.today !== null) rows[today] = Math.round(result.today * 100) / 100;
    if (Object.keys(rows).length) await mergeReadings(rows);

    const updated = {
      ...account,
      lastSync: Date.now(),
      lastError: result.today === null ? 'SmartESS returned no reading for today.' : null,
    };
    await saveAccount(updated);
    return updated;
  } catch (e) {
    const updated = { ...account, lastError: e.message };
    await saveAccount(updated);
    return updated;
  }
}

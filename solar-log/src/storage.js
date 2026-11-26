import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  readings: 'solarlog.readings',
  notes: 'solarlog.notes',
  settings: 'solarlog.settings',
  account: 'solarlog.smartess',
};

export const DEFAULT_SETTINGS = { rate: 0.3, currency: '$' };

const load = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

const save = (key, value) => AsyncStorage.setItem(key, JSON.stringify(value));

// Readings: { 'YYYY-MM-DD': kWh }
export const getReadings = () => load(KEYS.readings, {});

export const setReading = async (date, kwh) => {
  const readings = await getReadings();
  readings[date] = kwh;
  await save(KEYS.readings, readings);
};

export const deleteReading = async (date) => {
  const readings = await getReadings();
  delete readings[date];
  await save(KEYS.readings, readings);
};

export const mergeReadings = async (rows) => {
  const readings = await getReadings();
  await save(KEYS.readings, { ...readings, ...rows });
};

// Maintenance notes: [{ id, date, type, text }]
export const getNotes = () => load(KEYS.notes, []);

export const addNote = async (note) => {
  const notes = await getNotes();
  notes.push({ ...note, id: `${Date.now()}-${Math.round(Math.random() * 1e6)}` });
  await save(KEYS.notes, notes);
};

export const deleteNote = async (id) => {
  const notes = await getNotes();
  await save(KEYS.notes, notes.filter((n) => n.id !== id));
};

export const getSettings = async () => ({
  ...DEFAULT_SETTINGS,
  ...(await load(KEYS.settings, {})),
});

export const saveSettings = (settings) => save(KEYS.settings, settings);

// SmartESS link: { usr, pwdHash, lastSync, lastError } or null.
// Only the SHA-1 of the password is kept, never the password itself.
export const getAccount = () => load(KEYS.account, null);
export const saveAccount = (account) => save(KEYS.account, account);
export const removeAccount = () => AsyncStorage.removeItem(KEYS.account);

export const clearAll = () => AsyncStorage.multiRemove(Object.values(KEYS));

const BASE_URL = 'http://217.216.95.49:3737';

export async function saveDraft(username, formType, data) {
  try {
    const res = await fetch(`${BASE_URL}/save/${encodeURIComponent(username)}/${formType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (_) {
    return { ok: false };
  }
}

export async function loadDraftFromServer(username, formType) {
  try {
    const res = await fetch(`${BASE_URL}/load/${encodeURIComponent(username)}/${formType}`);
    return await res.json();
  } catch (_) {
    return { ok: false, data: null };
  }
}

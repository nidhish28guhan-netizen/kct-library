/* Minimal authenticated API client. Single place that knows about the token. */
const TOKEN_KEY = 'lms_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    clearToken();
    window.dispatchEvent(new Event('clms:logout'));
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = (data && data.error) || { code: 'ERROR', message: `Request failed (${res.status})` };
    throw { status: res.status, code: err.code, message: err.message, details: err.details };
  }
  return data;
}

/** Fetch an authenticated binary/text resource (e.g. the barcode SVG) as text. */
export async function fetchText(path) {
  const res = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!res.ok) throw { status: res.status, message: 'Failed to load resource' };
  return res.text();
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtINR = (n) => `₹${Number(n || 0).toFixed(2)}`;

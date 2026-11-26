import { API, STORAGE } from '../../constants/index.js';

function requestUrl(path) {
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function loadTokens() {
  return {
    accessToken: localStorage.getItem(STORAGE.accessToken) || '',
    refreshToken: localStorage.getItem(STORAGE.refreshToken) || '',
  };
}

export function saveTokens(accessToken, refreshToken) {
  localStorage.setItem(STORAGE.accessToken, accessToken);
  if (refreshToken) localStorage.setItem(STORAGE.refreshToken, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE.accessToken);
  localStorage.removeItem(STORAGE.refreshToken);
}

async function raw(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(requestUrl(path), {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(readableError(data));
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

function readableError(data) {
  const details = data?.error?.details;
  const messages = [];
  for (const [field, items] of Object.entries(details?.fieldErrors || {})) {
    for (const item of items || []) {
      messages.push(field === 'body' || field === 'query' || field === 'params' ? item : `${field}: ${item}`);
    }
  }
  for (const item of details?.formErrors || []) messages.push(item);
  return messages[0] || data?.error?.message || 'Request failed';
}

export async function api(path, options = {}) {
  const token = options.token ?? loadTokens().accessToken;
  try {
    return await raw(path, { ...options, token });
  } catch (error) {
    if (error.status !== 401 || options.retried || path.startsWith(API.login)) throw error;
    const next = await refreshAccessToken();
    return raw(path, { ...options, token: next, retried: true });
  }
}

async function refreshAccessToken() {
  const { refreshToken } = loadTokens();
  if (!refreshToken) {
    clearTokens();
    throw Object.assign(new Error('Sign in required'), { status: 401 });
  }
  try {
    const data = await raw(API.refresh, { method: 'POST', body: { refreshToken } });
    saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (error) {
    clearTokens();
    throw error;
  }
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

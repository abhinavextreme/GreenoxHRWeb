const ACCESS = 'greenoxhr.accessToken';
const REFRESH = 'greenoxhr.refreshToken';
const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function requestUrl(path) {
  if (!API_BASE) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function clockLabel() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatRange(start, end) {
  const fmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const startLabel = fmt.format(new Date(`${start}T12:00:00+05:30`));
  if (start === end) return startLabel;
  return `${startLabel} – ${fmt.format(new Date(`${end}T12:00:00+05:30`))}`;
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'HR';
}

export function canHr(role) {
  return role === 'hr_admin' || role === 'super_admin';
}

export function canSelfPunch(session) {
  const role = session?.user?.role;
  return (role === 'employee' || role === 'hr_admin') && session?.employee?.status === 'active';
}

export function canReview(role) {
  return canHr(role) || role === 'outlet_manager';
}

export const DESIGNATIONS = ['Line Cook', 'Captain', 'Cashier', 'Outlet Manager', 'HR Executive'];

export function roleLabel(role) {
  return {
    super_admin: 'Super Admin',
    hr_admin: 'HR Admin',
    outlet_manager: 'Outlet Manager',
    employee: 'Employee',
  }[role] || role;
}

export function loadTokens() {
  return {
    accessToken: localStorage.getItem(ACCESS) || '',
    refreshToken: localStorage.getItem(REFRESH) || '',
  };
}

export function saveTokens(accessToken, refreshToken) {
  localStorage.setItem(ACCESS, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
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
    if (error.status !== 401 || options.retried || path.startsWith('/api/v1/auth/login')) throw error;
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
    const data = await raw('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken } });
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

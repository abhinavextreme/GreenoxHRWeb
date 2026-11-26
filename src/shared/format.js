import { APP, ROLE_LABELS } from '../constants/index.js';

export function todayIso() {
  return new Intl.DateTimeFormat(APP.isoLocale, {
    timeZone: APP.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function clockLabel() {
  return new Intl.DateTimeFormat(APP.locale, {
    timeZone: APP.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(APP.locale, {
    timeZone: APP.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(APP.locale, {
    timeZone: APP.timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatRange(start, end) {
  const fmt = new Intl.DateTimeFormat(APP.locale, { day: 'numeric', month: 'short', timeZone: APP.timeZone });
  const startLabel = fmt.format(new Date(`${start}T12:00:00${APP.istOffset}`));
  if (start === end) return startLabel;
  return `${startLabel} – ${fmt.format(new Date(`${end}T12:00:00${APP.istOffset}`))}`;
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'HR';
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export function clockMinutesAgo(syncedAt) {
  if (!syncedAt) return 'just now';
  return `${Math.max(0, Math.round((Date.now() - syncedAt.getTime()) / 60000))} min ago`;
}

import { ROUTES } from './routes.js';

export const PRIMARY_NAV = [
  { to: ROUTES.home, label: 'Operations Dashboard', icon: 'grid', end: true },
  { to: ROUTES.employees, label: 'Employee Directory', icon: 'people', badgeKey: 'active' },
  { to: ROUTES.attendance, label: 'Attendance & Punch', icon: 'clock' },
  { to: ROUTES.leave, label: 'Leave Approvals', icon: 'leave', badgeKey: 'pending' },
  { to: ROUTES.shifts, label: 'Shift Rosters', icon: 'roster' },
];

export const SECONDARY_NAV = [
  { to: ROUTES.notifications, label: 'Notifications', icon: 'bell', badgeKey: 'unread' },
  { to: ROUTES.settings, label: 'System Settings', icon: 'gear' },
];

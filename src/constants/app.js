export const APP = {
  name: 'Greenox HR',
  tagline: 'Enterprise Cloud',
  cluster: 'Delhi-NCR cluster',
  timeZone: 'Asia/Kolkata',
  locale: 'en-IN',
  isoLocale: 'en-CA',
  istOffset: '+05:30',
};

export const PLATFORM = {
  web: 'web',
};

export const EVENTS = {
  push: 'greenox-push',
  focus: 'focus',
};

export const PUSH_PAYLOAD = {
  notices: 'notices',
  attendance: 'attendance',
  leave: 'leave',
};

export const LIMITS = {
  roster: 100,
  pendingPreview: 6,
  leavePage: 50,
  directory: 20,
  attendancePeople: 20,
  attendanceRecords: 100,
  notifications: 50,
  badge: 1,
  balances: 20,
  adminUsers: 100,
  punchStream: 5,
};

export const TIMING = {
  searchDebounceMs: 300,
  clockTickMs: 30000,
};

export const PASSWORD = {
  minLength: 8,
  letter: /[A-Za-z]/,
  number: /[0-9]/,
  hint: 'At least 8 characters, with a letter and a number.',
};
